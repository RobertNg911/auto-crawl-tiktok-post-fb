from __future__ import annotations

import os
import time
from typing import Optional

import requests

from app.services.fb_graph import _graph_get, _graph_post, _safe_json
from app.services.http_client import compute_retry_delay
from app.services.observability import log_structured

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"
CHUNK_SIZE = 5 * 1024 * 1024
RETRY_DELAYS = [60, 120, 240]


class FacebookPublisherService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.api_url = GRAPH_API_BASE

    def upload_video(
        self,
        page_id: str,
        video_path: str,
        caption: str,
    ) -> dict:
        file_size = os.path.getsize(video_path)

        if file_size > 20 * 1024 * 1024:
            return self._upload_chunked(page_id, video_path, caption)
        return self._upload_simple(page_id, video_path, caption)

    def _upload_simple(
        self,
        page_id: str,
        video_path: str,
        caption: str,
    ) -> dict:
        if not os.path.exists(video_path):
            return {"error": f"Không tìm thấy file: {video_path}"}

        try:
            log_structured(
                "facebook_publisher",
                "info",
                "Bắt đầu khởi tạo đăng Facebook Reels (simple).",
                details={"page_id": page_id, "file_path": video_path},
            )

            init_result = _graph_post(
                f"{page_id}/video_reels",
                params={
                    "upload_phase": "start",
                    "access_token": self.access_token,
                },
                timeout=30,
            )
            if not init_result["ok"] or "video_id" not in init_result["data"]:
                log_structured(
                    "facebook_publisher",
                    "error",
                    "Facebook từ chối giai đoạn khởi tạo Reel.",
                    details={"page_id": page_id, "response": init_result},
                )
                return {
                    "error": f"Lỗi khởi tạo Reels: {init_result.get('message', 'Lỗi không xác định')}"
                }

            video_id = init_result["data"]["video_id"]
            log_structured(
                "facebook_publisher",
                "info",
                "Đã khởi tạo Reel và nhận video_id.",
                details={"page_id": page_id, "video_id": video_id},
            )

            upload_url = f"https://rupload.facebook.com/video-upload/v19.0/{video_id}"
            file_size = os.path.getsize(video_path)
            with open(video_path, "rb") as file_handle:
                upload_response = requests.post(
                    upload_url,
                    data=file_handle,
                    headers={
                        "Authorization": f"OAuth {self.access_token}",
                        "offset": "0",
                        "file_size": str(file_size),
                        "X-Entity-Type": "video/mp4",
                        "X-Entity-Name": "video.mp4",
                    },
                    timeout=300,
                )

            upload_data = _safe_json(upload_response)
            if "id" not in upload_data and not upload_data.get("success"):
                log_structured(
                    "facebook_publisher",
                    "error",
                    "Facebook RUpload không xác nhận video upload thành công.",
                    details={
                        "page_id": page_id,
                        "video_id": video_id,
                        "response": upload_data,
                    },
                )
                return {
                    "error": f"Lỗi tải video (RUpload): {upload_data.get('error', {}).get('message', 'Tải video thất bại')}"
                }

            log_structured(
                "facebook_publisher",
                "info",
                "Đã tải video lên Facebook RUpload, chờ công bố.",
                details={"page_id": page_id, "video_id": video_id},
            )
            time.sleep(20)

            publish_result = _graph_post(
                f"{page_id}/video_reels",
                params={
                    "upload_phase": "finish",
                    "video_id": video_id,
                    "video_state": "PUBLISHED",
                    "description": caption[:2200],
                    "access_token": self.access_token,
                },
                timeout=30,
            )

            if publish_result["ok"] and publish_result["data"].get("success"):
                log_structured(
                    "facebook_publisher",
                    "info",
                    "Đã công bố Facebook Reel thành công.",
                    details={"page_id": page_id, "video_id": video_id},
                )
                return {"id": video_id}

            log_structured(
                "facebook_publisher",
                "error",
                "Facebook không công bố được Reel.",
                details={
                    "page_id": page_id,
                    "video_id": video_id,
                    "response": publish_result,
                },
            )
            return {
                "error": f"Lỗi công bố: {publish_result.get('message', 'Công bố thất bại')}"
            }
        except Exception as exc:
            log_structured(
                "facebook_publisher",
                "error",
                "Lỗi hệ thống khi đăng Facebook Reel.",
                details={
                    "page_id": page_id,
                    "file_path": video_path,
                    "error": str(exc),
                },
            )
            return {"error": f"Lỗi hệ thống khi đăng FB: {exc}"}

    def _upload_chunked(
        self,
        page_id: str,
        video_path: str,
        caption: str,
    ) -> dict:
        if not os.path.exists(video_path):
            return {"error": f"Không tìm thấy file: {video_path}"}

        try:
            log_structured(
                "facebook_publisher",
                "info",
                "Bắt đầu khởi tạo chunked upload Facebook Reels.",
                details={"page_id": page_id, "file_path": video_path},
            )

            file_size = os.path.getsize(video_path)
            init_result = _graph_post(
                f"{page_id}/videos",
                params={
                    "upload_phase": "start",
                    "access_token": self.access_token,
                },
                timeout=30,
            )

            if not init_result["ok"] or "upload_session_id" not in init_result["data"]:
                return self._upload_simple(page_id, video_path, caption)

            upload_session_id = init_result["data"]["upload_session_id"]
            start_offset = 0

            with open(video_path, "rb") as f:
                while start_offset < file_size:
                    chunk = f.read(CHUNK_SIZE)
                    chunk_size = len(chunk)

                    chunk_result = self._upload_chunk(
                        page_id,
                        upload_session_id,
                        chunk,
                        start_offset,
                        file_size,
                    )
                    if "error" in chunk_result:
                        return chunk_result

                    start_offset += chunk_size

            finish_result = _graph_post(
                f"{page_id}/videos",
                params={
                    "upload_phase": "finish",
                    "upload_session_id": upload_session_id,
                    "access_token": self.access_token,
                },
                timeout=30,
            )

            video_id = finish_result["data"].get("id") or upload_session_id
            publish_result = _graph_post(
                f"{page_id}/videos",
                params={
                    "upload_phase": "finish",
                    "video_id": video_id,
                    "video_state": "PUBLISHED",
                    "description": caption[:2200],
                    "access_token": self.access_token,
                },
                timeout=30,
            )

            if publish_result["ok"] and publish_result["data"].get("success"):
                return {"id": video_id}

            return {
                "error": f"Lỗi công bố: {publish_result.get('message', 'Công bố thất bại')}"
            }
        except Exception as exc:
            log_structured(
                "facebook_publisher",
                "error",
                "Lỗi hệ thống khi chunked upload Facebook Reel.",
                details={
                    "page_id": page_id,
                    "file_path": video_path,
                    "error": str(exc),
                },
            )
            return {"error": f"Lỗi hệ thống khi chunked upload FB: {exc}"}

    def _upload_chunk(
        self,
        page_id: str,
        upload_session_id: str,
        chunk: bytes,
        start_offset: int,
        file_size: int,
    ) -> dict:
        try:
            chunk_upload_url = (
                f"https://rupload.facebook.com/video-upload/v19.0/{upload_session_id}"
            )
            response = requests.post(
                chunk_upload_url,
                data=chunk,
                headers={
                    "Authorization": f"OAuth {self.access_token}",
                    "offset": str(start_offset),
                    "file_size": str(file_size),
                    "X-Entity-Type": "video/mp4",
                },
                timeout=120,
            )
            data = _safe_json(response)
            if "start_offset" in data:
                return {"ok": True, "start_offset": data["start_offset"]}
            if data.get("success"):
                return {"ok": True}
            return {"error": f"Chunk upload failed: {data}"}
        except Exception as exc:
            return {"error": f"Chunk upload exception: {exc}"}


def upload_video_with_retry(
    page_id: str,
    video_path: str,
    caption: str,
    access_token: str,
    max_retries: int = 3,
) -> tuple[Optional[str], Optional[str]]:
    publisher = FacebookPublisherService(access_token)

    for attempt in range(1, max_retries + 1):
        result = publisher.upload_video(page_id, video_path, caption)

        if "error" not in result:
            post_id = result.get("id")
            log_structured(
                "facebook_publisher",
                "info",
                "Video upload thành công.",
                details={
                    "page_id": page_id,
                    "video_path": video_path,
                    "post_id": post_id,
                },
            )
            return post_id, None

        error_msg = result.get("error", "Unknown error")
        log_structured(
            "facebook_publisher",
            "warning",
            f"Video upload thất bại (lần thử {attempt}/{max_retries}).",
            details={
                "page_id": page_id,
                "video_path": video_path,
                "attempt": attempt,
                "error": error_msg,
            },
        )

        if attempt < max_retries:
            delay = (
                RETRY_DELAYS[attempt - 1]
                if attempt <= len(RETRY_DELAYS)
                else RETRY_DELAYS[-1]
            )
            log_structured(
                "facebook_publisher",
                "info",
                f"Thử lại sau {delay} giây...",
                details={"attempt": attempt, "delay_seconds": delay},
            )
            time.sleep(delay)

    return None, error_msg


def cleanup_video_file(file_path: str) -> bool:
    if not file_path or not os.path.exists(file_path):
        return False

    try:
        os.remove(file_path)
        log_structured(
            "facebook_publisher",
            "info",
            "Đã xóa file video local.",
            details={"file_path": file_path},
        )
        return True
    except Exception as exc:
        log_structured(
            "facebook_publisher",
            "error",
            "Không thể xóa file video local.",
            details={"file_path": file_path, "error": str(exc)},
        )
        return False
