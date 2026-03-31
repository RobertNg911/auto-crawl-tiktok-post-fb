from dataclasses import dataclass
from datetime import datetime, timedelta
import yt_dlp
from typing import Optional

from app.services.observability import log_structured


@dataclass
class ChannelMetrics:
    username: str
    followers: int
    following: int
    likes: int
    video_count: int
    total_views: int


@dataclass
class VideoMetrics:
    video_id: str
    views: int
    likes: int
    comments: int
    shares: int
    fetched_at: datetime


@dataclass
class VideoEntry:
    original_id: str
    source_video_url: str
    thumbnail_url: Optional[str] = None
    title: Optional[str] = None
    upload_date: Optional[datetime] = None


def extract_channel_metrics(username: str) -> ChannelMetrics | None:
    url = f"https://www.tiktok.com/@{username}"

    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "ignoreerrors": True,
        "extract_flat": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        if not info:
            log_structured(
                "analytics",
                "warning",
                "Không lấy được thông tin kênh TikTok",
                details={"username": username},
            )
            return None

        channel_info = info.get("channel_follower_count", 0) or 0
        like_count = info.get("like_count", 0) or 0
        video_count = info.get("video_count", 0) or 0
        view_count = info.get("view_count", 0) or 0

        following = 0
        if "channel_following_count" in info:
            following = info.get("channel_following_count", 0) or 0

        return ChannelMetrics(
            username=username,
            followers=channel_info,
            following=following,
            likes=like_count,
            video_count=video_count,
            total_views=view_count,
        )
    except Exception as exc:
        log_structured(
            "analytics",
            "error",
            "Lỗi khi trích xuất metrics kênh TikTok",
            details={"username": username, "error": str(exc)},
        )
        return None


def extract_video_metrics(video_url: str) -> Optional[VideoMetrics]:
    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "ignoreerrors": True,
        "extract_flat": False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if not info:
                return None

            video_id = str(info.get("id", ""))

            stats = info.get("stats", {})
            if isinstance(stats, dict):
                views = stats.get("view_count", 0) or 0
                likes = stats.get("like_count", 0) or 0
                comments = stats.get("comment_count", 0) or 0
                shares = stats.get("share_count", 0) or 0
            else:
                views = info.get("view_count", 0) or 0
                likes = info.get("like_count", 0) or 0
                comments = info.get("comment_count", 0) or 0
                shares = info.get("share", 0) or 0

            return VideoMetrics(
                video_id=video_id,
                views=int(views),
                likes=int(likes),
                comments=int(comments),
                shares=int(shares),
                fetched_at=datetime.utcnow(),
            )
    except Exception as exc:
        log_structured(
            "analytics",
            "error",
            "Không thể trích xuất metrics từ video.",
            details={"video_url": video_url, "error": str(exc)},
        )
        return None


def extract_channel_video_list(username: str, limit: int = 50) -> list[VideoEntry]:
    channel_url = f"https://www.tiktok.com/@{username}"
    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "ignoreerrors": True,
        "extract_flat": False,
    }

    videos = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(channel_url, download=False)
            if not info or "entries" not in info:
                return []

            for entry in info.get("entries", [])[:limit]:
                if not entry:
                    continue

                video_id = entry.get("id", "")
                video_url = entry.get("url") or entry.get("webpage_url", "")
                if not video_url:
                    video_url = f"https://www.tiktok.com/@{username}/video/{video_id}"

                upload_date_str = entry.get("upload_date")
                upload_date = None
                if upload_date_str:
                    try:
                        upload_date = datetime.strptime(upload_date_str, "%Y%m%d")
                    except Exception:
                        pass

                videos.append(
                    VideoEntry(
                        original_id=str(video_id),
                        source_video_url=video_url,
                        thumbnail_url=entry.get("thumbnail"),
                        title=entry.get("title"),
                        upload_date=upload_date,
                    )
                )

            return videos
    except Exception as exc:
        log_structured(
            "analytics",
            "error",
            "Không thể trích xuất danh sách video từ kênh.",
            details={"username": username, "error": str(exc)},
        )
        return []


def is_video_older_than_30_days(upload_date: Optional[datetime]) -> bool:
    if not upload_date:
        return False
    cutoff = datetime.utcnow() - timedelta(days=30)
    return upload_date < cutoff
