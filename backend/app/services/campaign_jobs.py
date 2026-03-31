from __future__ import annotations

from datetime import datetime, timedelta
import os
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.time import utc_now
from app.models.models import (
    Campaign,
    CampaignStatus,
    ConversationStatus,
    FacebookPage,
    InboxConversation,
    InboxMessageLog,
    InteractionLog,
    InteractionStatus,
    Video,
    VideoStatus,
)
from app.services.ai_generator import (
    generate_message_reply_with_context,
    generate_reply,
)
from app.services.facebook_publisher import cleanup_video_file, upload_video_with_retry
from app.services.fb_graph import reply_to_comment, send_page_message
from app.services.inbox_memory import (
    apply_conversation_ai_state,
    get_or_create_inbox_conversation,
    normalize_customer_facts,
    serialize_recent_turns,
    touch_conversation_with_customer_message,
)
from app.services.observability import record_event
from app.services.security import decrypt_secret
from app.services.source_resolver import SourceResolutionError, resolve_content_source
from app.services.tiktok_analytics import (
    extract_channel_metrics,
    extract_channel_video_list,
    extract_video_metrics,
    is_video_older_than_30_days,
)
from app.services.ytdlp_crawler import download_video, extract_source_entries


def parse_uuid_or_none(raw_id: str):
    try:
        return uuid.UUID(raw_id)
    except ValueError:
        return None


def safe_remove_file(path: str | None):
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


def mark_video_failed(video: Video, message: str):
    video.status = VideoStatus.failed
    video.last_error = message[:1000]
    video.retry_count = (video.retry_count or 0) + 1


def set_campaign_sync_state(
    campaign: Campaign,
    status: str,
    error: str | None = None,
    finished_at: datetime | None = None,
):
    campaign.last_sync_status = status
    campaign.last_sync_error = error[:1000] if error else None
    if finished_at:
        campaign.last_synced_at = finished_at


def ensure_campaign_source_details(campaign: Campaign):
    resolved = resolve_content_source(campaign.source_url)
    changed = False
    if campaign.source_url != resolved.normalized_url:
        campaign.source_url = resolved.normalized_url
        changed = True
    if campaign.source_platform != resolved.platform.value:
        campaign.source_platform = resolved.platform.value
        changed = True
    if campaign.source_kind != resolved.source_kind.value:
        campaign.source_kind = resolved.source_kind.value
        changed = True
    return resolved, changed


def build_download_prefix(source_platform: str | None) -> str:
    if source_platform == "youtube":
        return "youtube_short"
    if source_platform == "tiktok":
        return "tiktok"
    return "video"


def build_source_page_publish_time(
    db: Session, page_id: str | None, schedule_interval: int
):
    now = utc_now()
    start_time = now

    if page_id and schedule_interval > 0:
        last_publish = (
            db.query(func.max(Video.publish_time))
            .join(Campaign)
            .filter(
                Campaign.target_page_id == page_id,
                Campaign.status == CampaignStatus.active,
                Video.status == VideoStatus.ready,
            )
            .scalar()
        )
        if last_publish and last_publish > now:
            start_time = last_publish + timedelta(minutes=schedule_interval)
    return start_time


def retry_video_download(video_id: str) -> dict:
    db: Session = SessionLocal()
    video = None
    try:
        video_uuid = parse_uuid_or_none(video_id)
        if not video_uuid:
            raise ValueError("Mã video không hợp lệ.")

        video = db.query(Video).filter(Video.id == video_uuid).first()
        if not video:
            raise ValueError("Không tìm thấy video cần thử lại.")

        out_path, _ = download_video(
            video.source_video_url, build_download_prefix(video.source_platform)
        )
        if out_path:
            safe_remove_file(video.file_path)
            video.file_path = out_path
            video.status = VideoStatus.ready
            video.publish_time = utc_now()
            video.last_error = None
            db.commit()
            record_event(
                "video",
                "info",
                "Đã tải lại video thành công.",
                db=db,
                details={"video_id": str(video.id), "original_id": video.original_id},
            )
            return {"ok": True, "video_id": str(video.id)}

        mark_video_failed(video, "Tải lại video thất bại.")
        db.commit()
        record_event(
            "video",
            "warning",
            "Tải lại video không thành công.",
            db=db,
            details={"video_id": str(video.id), "original_id": video.original_id},
        )
        return {"ok": False, "video_id": str(video.id)}
    except Exception as exc:
        if video:
            mark_video_failed(video, str(exc))
            db.commit()
        record_event(
            "video",
            "error",
            "Tiến trình thử tải lại video gặp lỗi.",
            db=db,
            details={"video_id": video_id, "error": str(exc)},
        )
        raise
    finally:
        db.close()


def sync_campaign_content(
    campaign_id: str,
    source_url: str,
    allow_paused: bool = False,
    source_platform: str | None = None,
    source_kind: str | None = None,
) -> dict:
    db: Session = SessionLocal()
    try:
        campaign_uuid = parse_uuid_or_none(campaign_id)
        if not campaign_uuid:
            raise ValueError("Mã chiến dịch không hợp lệ.")

        campaign = db.query(Campaign).filter(Campaign.id == campaign_uuid).first()
        if not campaign:
            raise ValueError("Không tìm thấy chiến dịch cần đồng bộ.")
        try:
            resolved_source, changed = ensure_campaign_source_details(campaign)
        except SourceResolutionError as exc:
            raise ValueError(str(exc)) from exc

        if not campaign.source_platform and source_platform:
            campaign.source_platform = source_platform
            changed = True
        if not campaign.source_kind and source_kind:
            campaign.source_kind = source_kind
            changed = True
        if not campaign.source_url and source_url:
            campaign.source_url = source_url
            changed = True
        db.commit()
        db.refresh(campaign)

        set_campaign_sync_state(campaign, "syncing")
        db.commit()
        record_event(
            "campaign",
            "info",
            "Bắt đầu đồng bộ chiến dịch.",
            db=db,
            details={"campaign_id": campaign_id, "campaign_name": campaign.name},
        )

        entries = list(
            reversed(
                extract_source_entries(
                    campaign.source_url,
                    campaign.source_platform or resolved_source.platform.value,
                    campaign.source_kind or resolved_source.source_kind.value,
                )
            )
        )
        if not entries:
            raise ValueError(
                "Nguồn nội dung không trả về video hợp lệ để đưa vào hàng chờ."
            )

        start_time = build_source_page_publish_time(
            db,
            campaign.target_page_id,
            campaign.schedule_interval or 0,
        )
        added_count = 0
        interrupted_reason = None

        for entry in entries:
            db.expire_all()
            campaign = db.query(Campaign).filter(Campaign.id == campaign_uuid).first()
            if not campaign:
                interrupted_reason = "Chiến dịch đã bị xóa trong lúc đồng bộ."
                break
            if campaign.status != CampaignStatus.active and not allow_paused:
                interrupted_reason = "Chiến dịch đã bị tạm dừng trong lúc đồng bộ."
                break

            video_url = entry.source_video_url
            original_id = entry.original_id
            existing_vid = (
                db.query(Video)
                .filter(
                    Video.campaign_id == campaign_uuid, Video.original_id == original_id
                )
                .first()
            )
            if existing_vid:
                continue

            publish_time = start_time + timedelta(
                minutes=added_count * (campaign.schedule_interval or 0)
            )

            db_video = Video(
                campaign_id=campaign_uuid,
                original_id=original_id,
                source_platform=entry.source_platform,
                source_kind=entry.source_kind,
                source_video_url=video_url,
                original_caption=entry.original_caption,
                status=VideoStatus.downloading,
                publish_time=publish_time,
            )
            db.add(db_video)
            db.commit()
            db.refresh(db_video)
            added_count += 1

            out_path, _ = download_video(
                video_url, build_download_prefix(entry.source_platform)
            )
            if out_path:
                db_video.file_path = out_path
                db_video.status = VideoStatus.ready
                db_video.last_error = None
            else:
                mark_video_failed(db_video, "Tải video thất bại.")
            db.commit()

        campaign = db.query(Campaign).filter(Campaign.id == campaign_uuid).first()
        if campaign:
            if interrupted_reason:
                set_campaign_sync_state(
                    campaign, "failed", interrupted_reason, utc_now()
                )
                record_event(
                    "campaign",
                    "warning",
                    "Đồng bộ chiến dịch bị dừng giữa chừng.",
                    db=db,
                    details={"campaign_id": campaign_id, "reason": interrupted_reason},
                )
            else:
                set_campaign_sync_state(campaign, "completed", None, utc_now())
                record_event(
                    "campaign",
                    "info",
                    "Đồng bộ chiến dịch hoàn tất.",
                    db=db,
                    details={"campaign_id": campaign_id, "videos_added": added_count},
                )
            db.commit()

        return {
            "ok": interrupted_reason is None,
            "campaign_id": campaign_id,
            "videos_added": added_count,
        }
    except Exception as exc:
        campaign_uuid = parse_uuid_or_none(campaign_id)
        if campaign_uuid:
            campaign = db.query(Campaign).filter(Campaign.id == campaign_uuid).first()
            if campaign:
                set_campaign_sync_state(campaign, "failed", str(exc), utc_now())
                db.commit()
        record_event(
            "campaign",
            "error",
            "Tiến trình đồng bộ chiến dịch gặp lỗi.",
            db=db,
            details={"campaign_id": campaign_id, "error": str(exc)},
        )
        raise
    finally:
        db.close()


def reply_to_comment_job(interaction_log_id: str) -> dict:
    db: Session = SessionLocal()
    try:
        log_uuid = parse_uuid_or_none(interaction_log_id)
        if not log_uuid:
            raise ValueError("Mã nhật ký bình luận không hợp lệ.")

        log = db.query(InteractionLog).filter(InteractionLog.id == log_uuid).first()
        if not log:
            raise ValueError("Không tìm thấy bình luận cần phản hồi.")

        page_config = (
            db.query(FacebookPage).filter(FacebookPage.page_id == log.page_id).first()
        )
        if not page_config or not page_config.long_lived_access_token:
            log.status = InteractionStatus.failed
            log.ai_reply = "Trang Facebook chưa có mã truy cập hợp lệ."
            db.commit()
            return {"ok": False, "log_id": interaction_log_id}

        if page_config.comment_auto_reply_enabled is False:
            log.status = InteractionStatus.ignored
            log.ai_reply = "Tự động phản hồi bình luận đang tắt cho fanpage này."
            db.commit()
            return {"ok": False, "log_id": interaction_log_id}

        access_token = decrypt_secret(page_config.long_lived_access_token)
        ai_reply = generate_reply(
            log.user_message,
            channel="comment",
            prompt_override=page_config.comment_ai_prompt,
        )
        log.ai_reply = ai_reply

        res = reply_to_comment(log.comment_id, ai_reply, access_token)
        if res and "id" in res:
            log.status = InteractionStatus.replied
            record_event(
                "webhook",
                "info",
                "Đã phản hồi bình luận thành công.",
                db=db,
                details={"comment_id": log.comment_id, "page_id": log.page_id},
            )
        else:
            log.status = InteractionStatus.failed
            record_event(
                "webhook",
                "warning",
                "Phản hồi bình luận không thành công.",
                db=db,
                details={
                    "comment_id": log.comment_id,
                    "page_id": log.page_id,
                    "response": res,
                },
            )

        db.commit()
        return {
            "ok": log.status == InteractionStatus.replied,
            "log_id": interaction_log_id,
        }
    except Exception as exc:
        record_event(
            "webhook",
            "error",
            "Tiến trình phản hồi bình luận gặp lỗi.",
            db=db,
            details={"log_id": interaction_log_id, "error": str(exc)},
        )
        raise
    finally:
        db.close()


def reply_to_message_job(message_log_id: str) -> dict:
    db: Session = SessionLocal()
    try:
        log_uuid = parse_uuid_or_none(message_log_id)
        if not log_uuid:
            raise ValueError("Mã nhật ký inbox không hợp lệ.")

        log = db.query(InboxMessageLog).filter(InboxMessageLog.id == log_uuid).first()
        if not log:
            raise ValueError("Không tìm thấy tin nhắn inbox cần phản hồi.")

        conversation = None
        if log.conversation_id:
            conversation = (
                db.query(InboxConversation)
                .filter(InboxConversation.id == log.conversation_id)
                .first()
            )
        if not conversation:
            conversation = get_or_create_inbox_conversation(
                db,
                page_id=log.page_id,
                sender_id=log.sender_id,
                recipient_id=log.recipient_id,
            )
            log.conversation_id = conversation.id
            db.commit()
            db.refresh(log)

        if (
            conversation.status != ConversationStatus.ai_active
            or conversation.needs_human_handoff
        ):
            log.status = InteractionStatus.ignored
            log.ai_reply = "Cuộc trò chuyện này đang được chuyển cho nhân viên hỗ trợ."
            log.last_error = None
            db.commit()
            return {"ok": False, "ignored": True, "log_id": message_log_id}

        page_config = (
            db.query(FacebookPage).filter(FacebookPage.page_id == log.page_id).first()
        )
        if not page_config or not page_config.long_lived_access_token:
            log.status = InteractionStatus.failed
            log.ai_reply = "Trang Facebook chưa có mã truy cập hợp lệ."
            log.last_error = "Thiếu Page Access Token."
            db.commit()
            return {"ok": False, "log_id": message_log_id}

        if not page_config.message_auto_reply_enabled:
            log.status = InteractionStatus.ignored
            log.ai_reply = "Tự động phản hồi inbox đang tắt cho fanpage này."
            log.last_error = None
            db.commit()
            return {"ok": False, "ignored": True, "log_id": message_log_id}

        access_token = decrypt_secret(page_config.long_lived_access_token)
        recent_turns = serialize_recent_turns(
            db,
            conversation_id=conversation.id,
            page_id=log.page_id,
            sender_id=log.sender_id,
            exclude_log_id=log.id,
        )
        ai_payload = generate_message_reply_with_context(
            log.user_message,
            prompt_override=page_config.message_ai_prompt,
            conversation_summary=conversation.conversation_summary,
            recent_turns=recent_turns,
            customer_facts=normalize_customer_facts(conversation.customer_facts),
        )
        ai_reply = ai_payload["reply"]
        log.ai_reply = ai_reply
        touch_conversation_with_customer_message(
            conversation,
            message_id=log.facebook_message_id,
            recipient_id=log.recipient_id,
            message_time=log.created_at or utc_now(),
        )
        apply_conversation_ai_state(
            conversation,
            summary=ai_payload.get("summary"),
            intent=ai_payload.get("intent"),
            customer_facts=ai_payload.get("customer_facts"),
            handoff=bool(ai_payload.get("handoff")),
            handoff_reason=ai_payload.get("handoff_reason"),
        )
        db.commit()

        res = send_page_message(log.sender_id, ai_reply, access_token)
        if res and ("message_id" in res or "recipient_id" in res):
            log.status = InteractionStatus.replied
            log.facebook_reply_message_id = res.get("message_id")
            log.reply_source = "ai"
            log.last_error = None
            conversation.latest_reply_message_id = log.facebook_reply_message_id
            conversation.last_ai_reply_at = utc_now()
            record_event(
                "webhook",
                "info",
                "Đã phản hồi tin nhắn inbox thành công.",
                db=db,
                details={
                    "page_id": log.page_id,
                    "sender_id": log.sender_id,
                    "message_id": log.facebook_message_id,
                },
            )
        else:
            log.status = InteractionStatus.failed
            log.last_error = str(res or "Facebook không trả về kết quả hợp lệ.")
            record_event(
                "webhook",
                "warning",
                "Phản hồi tin nhắn inbox không thành công.",
                db=db,
                details={
                    "page_id": log.page_id,
                    "sender_id": log.sender_id,
                    "message_id": log.facebook_message_id,
                    "conversation_id": str(conversation.id),
                    "handoff": conversation.needs_human_handoff,
                    "response": res,
                },
            )

        db.commit()
        return {"ok": log.status == InteractionStatus.replied, "log_id": message_log_id}
    except Exception as exc:
        record_event(
            "webhook",
            "error",
            "Tiến trình phản hồi tin nhắn inbox gặp lỗi.",
            db=db,
            details={"log_id": message_log_id, "error": str(exc)},
        )
        raise
    finally:
        db.close()


def publish_video_job(video_id: str) -> dict:
    db: Session = SessionLocal()
    video = None
    try:
        video_uuid = parse_uuid_or_none(video_id)
        if not video_uuid:
            raise ValueError("Mã video không hợp lệ.")

        video = db.query(Video).filter(Video.id == video_uuid).first()
        if not video:
            raise ValueError("Không tìm thấy video cần đăng.")

        if not video.file_path:
            raise ValueError("Video chưa có file để đăng.")

        if video.status == VideoStatus.posted:
            return {
                "ok": True,
                "video_id": str(video.id),
                "fb_post_id": video.fb_post_id,
                "skipped": True,
            }

        campaign = video.campaign
        if not campaign or not campaign.target_page_id:
            raise ValueError("Chiến dịch chưa có fanpage đích.")

        page_config = (
            db.query(FacebookPage)
            .filter(FacebookPage.page_id == campaign.target_page_id)
            .first()
        )
        if not page_config or not page_config.long_lived_access_token:
            raise ValueError("Fanpage chưa có mã truy cập hợp lệ.")

        access_token = decrypt_secret(page_config.long_lived_access_token)
        caption = video.ai_caption or video.original_caption or ""
        post_id, error_msg = upload_video_with_retry(
            campaign.target_page_id,
            video.file_path,
            caption,
            access_token,
            max_retries=3,
        )

        if post_id:
            video.fb_post_id = post_id
            video.status = VideoStatus.posted
            video.last_error = None
            db.commit()

            cleanup_video_file(video.file_path)
            video.file_path = None
            db.commit()

            record_event(
                "video",
                "info",
                "Đã đăng video lên Facebook thành công.",
                db=db,
                details={
                    "video_id": str(video.id),
                    "campaign_id": str(campaign.id),
                    "page_id": campaign.target_page_id,
                    "fb_post_id": post_id,
                },
            )
            return {"ok": True, "video_id": str(video.id), "fb_post_id": post_id}

        video.status = VideoStatus.failed
        video.last_error = error_msg or "Đăng video thất bại."
        video.retry_count = (video.retry_count or 0) + 1
        db.commit()

        record_event(
            "video",
            "error",
            "Đăng video lên Facebook thất bại.",
            db=db,
            details={
                "video_id": str(video.id),
                "campaign_id": str(campaign.id),
                "page_id": campaign.target_page_id,
                "retry_count": video.retry_count,
                "error": error_msg,
            },
        )
        return {"ok": False, "video_id": str(video.id), "error": error_msg}

    except Exception as exc:
        if video:
            video.status = VideoStatus.failed
            video.last_error = str(exc)[:1000]
            video.retry_count = (video.retry_count or 0) + 1
            db.commit()
        record_event(
            "video",
            "error",
            "Tiến trình đăng video lên Facebook gặp lỗi.",
            db=db,
            details={"video_id": video_id, "error": str(exc)},
        )
        raise
    finally:
        db.close()


def sync_channel_metrics_for_target_channel(target_channel_id: str) -> dict:
    """Sync metrics for a single target channel (TargetChannel model)."""
    from app.models.models import TargetChannel, ChannelMetricsSnapshot

    db: Session = SessionLocal()
    try:
        channel_uuid = parse_uuid_or_none(target_channel_id)
        if not channel_uuid:
            raise ValueError("Mã kênh mục tiêu không hợp lệ.")

        channel = (
            db.query(TargetChannel).filter(TargetChannel.id == channel_uuid).first()
        )
        if not channel:
            raise ValueError("Không tìm thấy kênh mục tiêu.")

        if not channel.username:
            raise ValueError("Kênh mục tiêu không có username.")

        metrics = extract_channel_metrics(channel.username)
        if not metrics:
            record_event(
                "analytics",
                "warning",
                "Không lấy được metrics từ kênh TikTok.",
                db=db,
                details={"channel_id": target_channel_id, "username": channel.username},
            )
            return {
                "ok": False,
                "channel_id": target_channel_id,
                "error": "Không lấy được metrics",
            }

        snapshot = ChannelMetricsSnapshot(
            channel_id=channel_uuid,
            followers=metrics.followers,
            following=metrics.following,
            likes=metrics.likes,
            video_count=metrics.video_count,
            total_views=metrics.total_views,
            snapshot_date=utc_now(),
        )
        db.add(snapshot)
        db.commit()

        record_event(
            "analytics",
            "info",
            "Đã cập nhật metrics cho kênh mục tiêu.",
            db=db,
            details={
                "channel_id": target_channel_id,
                "username": channel.username,
                "followers": metrics.followers,
                "video_count": metrics.video_count,
            },
        )
        return {
            "ok": True,
            "channel_id": target_channel_id,
            "followers": metrics.followers,
        }

    except Exception as exc:
        record_event(
            "analytics",
            "error",
            "Tiến trình đồng bộ metrics kênh gặp lỗi.",
            db=db,
            details={"channel_id": target_channel_id, "error": str(exc)},
        )
        raise
    finally:
        db.close()


def sync_video_metrics_for_campaign(campaign_id: str) -> dict:
    """Sync video-level metrics for all videos in a campaign.
    Auto-discovers new videos from channels and skips videos older than 30 days.
    """
    from app.models.models import TargetChannel, Video, VideoMetricsSnapshot

    db: Session = SessionLocal()
    try:
        campaign_uuid = parse_uuid_or_none(campaign_id)
        if not campaign_uuid:
            raise ValueError("Mã chiến dịch không hợp lệ.")

        campaign = db.query(Campaign).filter(Campaign.id == campaign_uuid).first()
        if not campaign:
            raise ValueError("Không tìm thấy chiến dịch.")

        if not campaign.source_url or not campaign.source_platform == "tiktok":
            return {
                "ok": True,
                "campaign_id": campaign_id,
                "new_videos": 0,
                "metrics_updated": 0,
            }

        import re

        match = re.match(
            r"https://(?:www\.)?tiktok\.com/@([^/?]+)", campaign.source_url
        )
        if not match:
            return {
                "ok": True,
                "campaign_id": campaign_id,
                "new_videos": 0,
                "metrics_updated": 0,
            }

        username = match.group(1)

        discovered_videos = extract_channel_video_list(username, limit=100)

        videos_updated = 0
        new_videos_created = 0
        threshold = campaign.view_threshold or 0

        for entry in discovered_videos:
            if is_video_older_than_30_days(entry.upload_date):
                continue

            existing_video = (
                db.query(Video)
                .filter(
                    Video.campaign_id == campaign_uuid,
                    Video.original_id == entry.original_id,
                )
                .first()
            )

            if existing_video:
                video_metrics = extract_video_metrics(entry.source_video_url)
                if video_metrics:
                    existing_video.views = video_metrics.views
                    existing_video.likes = video_metrics.likes
                    existing_video.comments_count = video_metrics.comments
                    if existing_video.thumbnail_url is None and entry.thumbnail_url:
                        existing_video.thumbnail_url = entry.thumbnail_url

                    snapshot = VideoMetricsSnapshot(
                        video_id=existing_video.id,
                        views=video_metrics.views,
                        likes=video_metrics.likes,
                        comments=video_metrics.comments,
                        shares=video_metrics.shares,
                        snapshot_date=utc_now(),
                    )
                    db.add(snapshot)
                    videos_updated += 1
            else:
                if threshold > 0:
                    video_metrics = extract_video_metrics(entry.source_video_url)
                    if not video_metrics or video_metrics.views < threshold:
                        continue
                    views = video_metrics.views
                else:
                    views = 0

                new_video = Video(
                    campaign_id=campaign_uuid,
                    original_id=entry.original_id,
                    source_platform="tiktok",
                    source_kind="tiktok_video",
                    source_video_url=entry.source_video_url,
                    thumbnail_url=entry.thumbnail_url,
                    original_caption=entry.title,
                    status=VideoStatus.pending,
                    views=views,
                )
                db.add(new_video)
                db.commit()
                db.refresh(new_video)
                new_videos_created += 1

                if threshold == 0 or views >= threshold:
                    video_metrics = extract_video_metrics(entry.source_video_url)
                    if video_metrics:
                        snapshot = VideoMetricsSnapshot(
                            video_id=new_video.id,
                            views=video_metrics.views,
                            likes=video_metrics.likes,
                            comments=video_metrics.comments,
                            shares=video_metrics.shares,
                            snapshot_date=utc_now(),
                        )
                        db.add(snapshot)

        db.commit()

        record_event(
            "analytics",
            "info",
            "Đã đồng bộ metrics video cho chiến dịch.",
            db=db,
            details={
                "campaign_id": campaign_id,
                "username": username,
                "new_videos": new_videos_created,
                "metrics_updated": videos_updated,
            },
        )
        return {
            "ok": True,
            "campaign_id": campaign_id,
            "new_videos": new_videos_created,
            "metrics_updated": videos_updated,
        }

    except Exception as exc:
        record_event(
            "analytics",
            "error",
            "Tiến trình đồng bộ metrics video gặp lỗi.",
            db=db,
            details={"campaign_id": campaign_id, "error": str(exc)},
        )
        raise
    finally:
        db.close()
