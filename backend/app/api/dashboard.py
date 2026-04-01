from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.auth import require_authenticated_user
from app.core.database import get_db
from app.core.time import utc_now, utc_today
from app.models.models import (
    Campaign,
    CampaignStatus,
    FacebookPage,
    InboxConversation,
    InboxMessageLog,
    InteractionLog,
    InteractionStatus,
    TargetChannel,
    ChannelStatus,
    Video,
    VideoStatus,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_today_range():
    today = utc_today()
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today, datetime.max.time())
    return start, end


def get_week_range():
    today = utc_today()
    start = today - timedelta(days=6)
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(today, datetime.max.time())
    return start_dt, end_dt


@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    today_start, today_end = get_today_range()
    week_start, week_end = get_week_range()

    total_channels = (
        db.query(TargetChannel)
        .filter(
            TargetChannel.is_deleted == False,
            TargetChannel.status == ChannelStatus.active,
        )
        .count()
    )

    active_campaigns = (
        db.query(Campaign).filter(Campaign.status == CampaignStatus.active).count()
    )

    videos_queued = (
        db.query(Video)
        .filter(
            Video.is_deleted == False,
            Video.status.in_(
                [
                    VideoStatus.pending,
                    VideoStatus.ready,
                    VideoStatus.downloading,
                ]
            ),
        )
        .count()
    )

    videos_posted_today = (
        db.query(Video)
        .filter(
            Video.is_deleted == False,
            Video.status == VideoStatus.posted,
            Video.updated_at >= today_start,
            Video.updated_at <= today_end,
        )
        .count()
    )

    comments_replied_today = (
        db.query(InteractionLog)
        .filter(
            InteractionLog.status == InteractionStatus.replied,
            InteractionLog.created_at >= today_start,
            InteractionLog.created_at <= today_end,
        )
        .count()
    )

    pending_conversations = (
        db.query(InboxConversation)
        .filter(
            InboxConversation.status.in_(
                [
                    "ai_active",
                    "operator_active",
                ]
            )
        )
        .count()
    )

    videos_posted_trend = []
    for offset in reversed(range(7)):
        day = utc_today() - timedelta(days=offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = (
            db.query(Video)
            .filter(
                Video.is_deleted == False,
                Video.status == VideoStatus.posted,
                Video.updated_at >= day_start,
                Video.updated_at <= day_end,
            )
            .count()
        )
        videos_posted_trend.append(
            {
                "date": day.isoformat(),
                "count": count,
            }
        )

    top_videos_this_week = (
        db.query(Video)
        .filter(
            Video.is_deleted == False,
            Video.status == VideoStatus.posted,
            Video.updated_at >= week_start,
            Video.updated_at <= week_end,
        )
        .order_by(Video.views.desc())
        .limit(10)
        .all()
    )

    top_videos = []
    for video in top_videos_this_week:
        top_videos.append(
            {
                "id": str(video.id),
                "thumbnail_url": video.thumbnail_url,
                "views": video.views or 0,
                "fb_post_id": video.fb_post_id,
                "original_id": video.original_id,
                "campaign_id": str(video.campaign_id) if video.campaign_id else None,
            }
        )

    return {
        "stats": {
            "total_channels": total_channels,
            "active_campaigns": active_campaigns,
            "videos_queued": videos_queued,
            "videos_posted_today": videos_posted_today,
            "comments_replied_today": comments_replied_today,
            "pending_conversations": pending_conversations,
        },
        "videos_posted_trend": videos_posted_trend,
        "top_videos_this_week": top_videos,
    }


@router.get("/charts/videos-posted")
def get_videos_posted_chart(
    days: int = 7,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    today = utc_today()
    labels = []
    counts = []

    for offset in reversed(range(days)):
        day = today - timedelta(days=offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = (
            db.query(Video)
            .filter(
                Video.is_deleted == False,
                Video.status == VideoStatus.posted,
                Video.updated_at >= day_start,
                Video.updated_at <= day_end,
            )
            .count()
        )
        labels.append(day.isoformat())
        counts.append(count)

    return {
        "labels": labels,
        "counts": counts,
    }


@router.get("/charts/views-trend")
def get_views_trend_chart(
    days: int = 7,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    today = utc_today()
    labels = []
    total_views = []
    posted_count = []

    for offset in reversed(range(days)):
        day = today - timedelta(days=offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())

        day_views = (
            db.query(func.sum(Video.views))
            .filter(
                Video.is_deleted == False,
                Video.status == VideoStatus.posted,
                Video.updated_at >= day_start,
                Video.updated_at <= day_end,
            )
            .scalar()
        ) or 0

        day_posted = (
            db.query(Video)
            .filter(
                Video.is_deleted == False,
                Video.status == VideoStatus.posted,
                Video.updated_at >= day_start,
                Video.updated_at <= day_end,
            )
            .count()
        )

        labels.append(day.isoformat())
        total_views.append(int(day_views))
        posted_count.append(day_posted)

    return {
        "labels": labels,
        "total_views": total_views,
        "posted_count": posted_count,
    }


@router.post("/sync-all")
def sync_all_campaigns(
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_user),
):
    from app.services.task_queue import (
        TASK_TYPE_CAMPAIGN_SYNC,
        enqueue_task,
    )
    from app.services.observability import record_event

    active_campaigns = (
        db.query(Campaign).filter(Campaign.status == CampaignStatus.active).all()
    )

    if not active_campaigns:
        return {
            "message": "Không có chiến dịch active nào để đồng bộ.",
            "synced_count": 0,
            "task_ids": [],
        }

    task_ids = []
    for campaign in active_campaigns:
        if campaign.last_sync_status == "syncing":
            continue

        campaign.last_sync_status = "queued"
        db.commit()

        task = enqueue_task(
            db,
            task_type=TASK_TYPE_CAMPAIGN_SYNC,
            entity_type="campaign",
            entity_id=str(campaign.id),
            payload={
                "campaign_id": str(campaign.id),
                "source_url": campaign.source_url,
                "source_platform": campaign.source_platform,
                "source_kind": campaign.source_kind,
                "allow_paused": True,
            },
            priority=25,
            max_attempts=2,
        )
        task_ids.append(str(task.id))

    record_event(
        "dashboard",
        "info",
        f"Đã kích hoạt đồng bộ cho {len(task_ids)} chiến dịch.",
        db=db,
        details={"synced_count": len(task_ids)},
    )

    return {
        "message": f"Đã xếp lịch đồng bộ cho {len(task_ids)}/{len(active_campaigns)} chiến dịch.",
        "synced_count": len(task_ids),
        "task_ids": task_ids,
    }
