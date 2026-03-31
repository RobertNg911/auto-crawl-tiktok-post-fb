import os
import socket
import traceback
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.time import utc_now
from app.models.models import (
    Campaign,
    CampaignStatus,
    ChannelStatus,
    FacebookPage,
    TargetChannel,
    Video,
    VideoStatus,
)
from app.services.ai_generator import generate_caption
from app.services.fb_graph import upload_video_to_facebook
from app.services.campaign_jobs import sync_video_metrics_for_campaign
from app.services.observability import record_event, update_worker_heartbeat
from app.services.security import decrypt_secret
from app.services.tiktok_analytics import extract_channel_metrics
from app.worker.tasks import process_task_queue

scheduler = BackgroundScheduler()
WORKER_NAME = f"{settings.APP_ROLE}@{socket.gethostname()}"
MAX_VIDEOS_PER_RUN = 5


def auto_post_job():
    db: Session = SessionLocal()
    update_worker_heartbeat(
        WORKER_NAME, app_role=settings.APP_ROLE, status="quét lịch đăng", db=db
    )
    try:
        now = utc_now()
        pages = db.query(FacebookPage).all()

        for page in pages:
            videos = (
                db.query(Video)
                .join(Campaign)
                .filter(
                    Campaign.target_page_id == page.page_id,
                    Campaign.status == CampaignStatus.active,
                    Video.status == VideoStatus.ready,
                    Video.publish_time <= now,
                )
                .order_by(Video.priority.desc(), Video.publish_time.asc())
                .limit(MAX_VIDEOS_PER_RUN)
                .all()
            )

            for vid in videos:
                if not vid.campaign.auto_post:
                    continue

                update_worker_heartbeat(
                    WORKER_NAME,
                    app_role=settings.APP_ROLE,
                    status="đang đăng video",
                    current_task_type="auto_post",
                    current_task_id=str(vid.id),
                    details={"page_id": page.page_id, "video_id": str(vid.id)},
                    db=db,
                )

                try:
                    access_token = decrypt_secret(page.long_lived_access_token)
                except ValueError as exc:
                    vid.status = VideoStatus.failed
                    vid.last_error = str(exc)
                    vid.retry_count = (vid.retry_count or 0) + 1
                    db.commit()
                    continue

                if not access_token:
                    vid.status = VideoStatus.failed
                    vid.last_error = "Trang Facebook chưa có mã truy cập hợp lệ."
                    vid.retry_count = (vid.retry_count or 0) + 1
                    db.commit()
                    continue

                if not vid.ai_caption:
                    try:
                        vid.ai_caption = generate_caption(vid.original_caption)
                        db.commit()
                    except Exception as exc:
                        vid.status = VideoStatus.failed
                        vid.last_error = f"Không thể tạo chú thích AI: {exc}"
                        vid.retry_count = (vid.retry_count or 0) + 1
                        db.commit()
                        record_event(
                            "video",
                            "error",
                            "Tạo chú thích AI trước khi đăng thất bại.",
                            db=db,
                            details={
                                "video_id": str(vid.id),
                                "page_id": page.page_id,
                                "error": str(exc),
                            },
                        )
                        continue

                res = upload_video_to_facebook(
                    file_path=vid.file_path,
                    caption=vid.ai_caption,
                    page_id=page.page_id,
                    access_token=access_token,
                )

                if "id" in res:
                    vid.fb_post_id = res["id"]
                    vid.status = VideoStatus.posted
                    vid.last_error = None
                    record_event(
                        "video",
                        "info",
                        "Đã đăng video thành công.",
                        db=db,
                        details={
                            "video_id": str(vid.id),
                            "page_id": page.page_id,
                            "fb_post_id": vid.fb_post_id,
                        },
                    )
                    if vid.file_path and os.path.exists(vid.file_path):
                        try:
                            os.remove(vid.file_path)
                        except Exception as exc:
                            record_event(
                                "video",
                                "warning",
                                "Không thể xóa tệp tạm sau khi đăng.",
                                db=db,
                                details={
                                    "video_id": str(vid.id),
                                    "file_path": vid.file_path,
                                    "error": str(exc),
                                },
                            )

                    campaign = vid.campaign
                    if (
                        campaign
                        and campaign.schedule_interval
                        and campaign.schedule_interval > 0
                    ):
                        next_publish_time = now + timedelta(
                            seconds=campaign.schedule_interval
                        )
                        ready_videos = (
                            db.query(Video)
                            .filter(
                                Video.campaign_id == campaign.id,
                                Video.status == VideoStatus.ready,
                                Video.publish_time > now,
                            )
                            .order_by(Video.publish_time.asc())
                            .all()
                        )
                        for ready_vid in ready_videos:
                            if (
                                ready_vid.publish_time
                                and ready_vid.publish_time < next_publish_time
                            ):
                                ready_vid.publish_time = next_publish_time
                                next_publish_time = next_publish_time + timedelta(
                                    seconds=campaign.schedule_interval
                                )
                else:
                    vid.status = VideoStatus.failed
                    vid.last_error = str(res.get("error", res))
                    vid.retry_count = (vid.retry_count or 0) + 1
                    record_event(
                        "video",
                        "error",
                        "Đăng video lên Facebook thất bại.",
                        db=db,
                        details={
                            "video_id": str(vid.id),
                            "page_id": page.page_id,
                            "response": res,
                        },
                    )

                db.commit()
    except Exception as exc:
        record_event(
            "worker",
            "error",
            "Tác vụ quét lịch đăng gặp lỗi.",
            db=db,
            details={"error": str(exc), "traceback": traceback.format_exc()},
        )
    finally:
        update_worker_heartbeat(
            WORKER_NAME, app_role=settings.APP_ROLE, status="idle", db=db
        )
        db.close()


def process_task_queue_job():
    processed = process_task_queue(WORKER_NAME)
    if processed:
        record_event(
            "queue",
            "info",
            "Đã xử lý xong một đợt tác vụ nền.",
            details={"worker_name": WORKER_NAME, "processed": processed},
        )


def heartbeat_job():
    update_worker_heartbeat(WORKER_NAME, app_role=settings.APP_ROLE, status="idle")


def sync_channel_metrics_job():
    db: Session = SessionLocal()
    update_worker_heartbeat(
        WORKER_NAME, app_role=settings.APP_ROLE, status="đồng bộ metrics kênh", db=db
    )
    try:
        channels = (
            db.query(TargetChannel)
            .filter(
                TargetChannel.status == ChannelStatus.active,
                TargetChannel.is_deleted == False,
            )
            .all()
        )

        now = utc_now()
        synced_count = 0
        error_count = 0

        for channel in channels:
            metrics = extract_channel_metrics(channel.username)
            if metrics:
                from app.models.models import ChannelMetricsSnapshot

                existing = (
                    db.query(ChannelMetricsSnapshot)
                    .filter(
                        ChannelMetricsSnapshot.channel_id == channel.id,
                    )
                    .first()
                )

                if existing:
                    existing.followers = metrics.followers
                    existing.following = metrics.following
                    existing.likes = metrics.likes
                    existing.video_count = metrics.video_count
                    existing.total_views = metrics.total_views
                    existing.snapshot_date = now
                else:
                    snapshot = ChannelMetricsSnapshot(
                        channel_id=channel.id,
                        followers=metrics.followers,
                        following=metrics.following,
                        likes=metrics.likes,
                        video_count=metrics.video_count,
                        total_views=metrics.total_views,
                        snapshot_date=now,
                    )
                    db.add(snapshot)
                synced_count += 1
            else:
                error_count += 1

        db.commit()
        record_event(
            "analytics",
            "info",
            "Đã đồng bộ metrics kênh.",
            db=db,
            details={"synced": synced_count, "errors": error_count},
        )
    except Exception as exc:
        record_event(
            "worker",
            "error",
            "Tác vụ đồng bộ metrics kênh thất bại.",
            db=db,
            details={"error": str(exc), "traceback": traceback.format_exc()},
        )
    finally:
        update_worker_heartbeat(
            WORKER_NAME, app_role=settings.APP_ROLE, status="idle", db=db
        )
        db.close()


def sync_video_metrics_job():
    db: Session = SessionLocal()
    update_worker_heartbeat(
        WORKER_NAME, app_role=settings.APP_ROLE, status="đồng bộ metrics video", db=db
    )
    try:
        campaigns = (
            db.query(Campaign)
            .filter(
                Campaign.status == CampaignStatus.active,
            )
            .all()
        )

        total_new_videos = 0
        total_metrics_updated = 0
        error_count = 0

        for campaign in campaigns:
            try:
                result = sync_video_metrics_for_campaign(str(campaign.id))
                total_new_videos += result.get("new_videos", 0)
                total_metrics_updated += result.get("metrics_updated", 0)
            except Exception as exc:
                error_count += 1
                record_event(
                    "analytics",
                    "error",
                    f"Đồng bộ metrics video cho campaign {campaign.id} thất bại.",
                    db=db,
                    details={"campaign_id": str(campaign.id), "error": str(exc)},
                )

        record_event(
            "analytics",
            "info",
            "Đã đồng bộ metrics video cho các campaign.",
            db=db,
            details={
                "new_videos": total_new_videos,
                "metrics_updated": total_metrics_updated,
                "errors": error_count,
            },
        )
    except Exception as exc:
        record_event(
            "worker",
            "error",
            "Tác vụ đồng bộ metrics video thất bại.",
            db=db,
            details={"error": str(exc), "traceback": traceback.format_exc()},
        )
    finally:
        update_worker_heartbeat(
            WORKER_NAME, app_role=settings.APP_ROLE, status="idle", db=db
        )
        db.close()


def start_scheduler():
    if not scheduler.get_job("auto_post_job"):
        scheduler.add_job(
            auto_post_job,
            "interval",
            id="auto_post_job",
            minutes=settings.SCHEDULER_INTERVAL_MINUTES,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
    if not scheduler.get_job("process_task_queue_job"):
        scheduler.add_job(
            process_task_queue_job,
            "interval",
            id="process_task_queue_job",
            seconds=settings.TASK_QUEUE_POLL_SECONDS,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
    if not scheduler.get_job("heartbeat_job"):
        scheduler.add_job(
            heartbeat_job,
            "interval",
            id="heartbeat_job",
            seconds=max(10, settings.TASK_QUEUE_POLL_SECONDS),
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
    if not scheduler.get_job("sync_channel_metrics_job"):
        scheduler.add_job(
            sync_channel_metrics_job,
            "cron",
            id="sync_channel_metrics_job",
            hour=0,
            minute=0,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
    if not scheduler.get_job("sync_video_metrics_job"):
        scheduler.add_job(
            sync_video_metrics_job,
            "interval",
            id="sync_video_metrics_job",
            hours=6,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
    if not scheduler.running:
        scheduler.start()
