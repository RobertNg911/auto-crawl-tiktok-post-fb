import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.time import utc_now
from app.models.models import Campaign, Video, VideoStatus
from app.services.campaign_jobs import publish_video_job
from app.services.task_queue import TASK_TYPE_VIDEO_PUBLISH, enqueue_task

router = APIRouter(prefix="/videos", tags=["Video Queue"])


class VideoUpdate(BaseModel):
    ai_caption: Optional[str] = Field(None, max_length=5000)
    priority: Optional[int] = Field(None, ge=0)
    publish_time: Optional[datetime] = None


class BulkPriorityItem(BaseModel):
    video_id: str
    priority: int


class BulkPriorityUpdate(BaseModel):
    video_priorities: list[BulkPriorityItem]


class VideoResponse(BaseModel):
    id: str
    campaign_id: Optional[str]
    campaign_name: Optional[str]
    original_id: str
    source_url: Optional[str]
    file_path: Optional[str]
    status: str
    original_caption: Optional[str]
    ai_caption: Optional[str]
    thumbnail_url: Optional[str]
    views: int
    likes: int
    comments_count: int
    priority: int
    publish_time: Optional[str]
    fb_post_id: Optional[str]
    retry_count: int
    created_at: str

    @classmethod
    def from_orm(cls, video: Video):
        return cls(
            id=str(video.id),
            campaign_id=str(video.campaign_id) if video.campaign_id else None,
            campaign_name=video.campaign.name if video.campaign else None,
            original_id=video.original_id or "",
            source_url=video.source_video_url,
            file_path=video.file_path,
            status=video.status.value
            if hasattr(video.status, "value")
            else video.status,
            original_caption=video.original_caption,
            ai_caption=video.ai_caption,
            thumbnail_url=video.thumbnail_url,
            views=video.views or 0,
            likes=video.likes or 0,
            comments_count=video.comments_count or 0,
            priority=video.priority or 0,
            publish_time=video.publish_time.isoformat() if video.publish_time else None,
            fb_post_id=video.fb_post_id,
            retry_count=video.retry_count or 0,
            created_at=video.created_at.isoformat() if video.created_at else "",
        )


def parse_uuid_or_400(raw_id: str, label: str):
    try:
        return uuid.UUID(raw_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{label} không hợp lệ.") from exc


@router.get("", response_model=dict)
def list_videos(
    campaign_id: Optional[str] = Query(None, description="Filter by campaign"),
    status: Optional[str] = Query(
        None,
        description="Filter by status: pending, downloading, ready, posted, failed, all",
    ),
    sort_by: str = Query(
        "priority", description="Sort by: priority, publish_time, views"
    ),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Video).filter(Video.is_deleted == False)

    if status and status != "all":
        try:
            status_enum = VideoStatus(status)
            query = query.filter(Video.status == status_enum)
        except ValueError:
            pass

    if campaign_id and campaign_id != "all":
        campaign_uuid = parse_uuid_or_400(campaign_id, "Mã chiến dịch")
        query = query.filter(Video.campaign_id == campaign_uuid)

    total = query.count()

    sort_column = {
        "priority": Video.priority,
        "publish_time": Video.publish_time,
        "views": Video.views,
    }.get(sort_by, Video.priority)

    if sort_order == "desc":
        query = query.order_by(sort_column.desc(), Video.created_at.desc())
    else:
        query = query.order_by(sort_column.asc(), Video.created_at.desc())

    offset = (page - 1) * page_size
    videos = query.offset(offset).limit(page_size).all()

    return {
        "items": [VideoResponse.from_orm(v) for v in videos],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: str, db: Session = Depends(get_db)):
    video_uuid = parse_uuid_or_400(video_id, "Mã video")
    video = (
        db.query(Video)
        .filter(
            Video.id == video_uuid,
            Video.is_deleted == False,
        )
        .first()
    )

    if not video:
        raise HTTPException(status_code=404, detail="Không tìm thấy video")

    return VideoResponse.from_orm(video)


@router.patch("/{video_id}", response_model=VideoResponse)
def update_video(
    video_id: str, video_update: VideoUpdate, db: Session = Depends(get_db)
):
    video_uuid = parse_uuid_or_400(video_id, "Mã video")
    video = (
        db.query(Video)
        .filter(
            Video.id == video_uuid,
            Video.is_deleted == False,
        )
        .first()
    )

    if not video:
        raise HTTPException(status_code=404, detail="Không tìm thấy video")

    if video_update.ai_caption is not None:
        video.ai_caption = video_update.ai_caption

    if video_update.priority is not None:
        video.priority = video_update.priority

    if video_update.publish_time is not None:
        video.publish_time = video_update.publish_time

    video.updated_at = utc_now()
    db.commit()
    db.refresh(video)

    return VideoResponse.from_orm(video)


@router.delete("/{video_id}", status_code=204)
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video_uuid = parse_uuid_or_400(video_id, "Mã video")
    video = (
        db.query(Video)
        .filter(
            Video.id == video_uuid,
            Video.is_deleted == False,
        )
        .first()
    )

    if not video:
        raise HTTPException(status_code=404, detail="Không tìm thấy video")

    video.is_deleted = True
    video.updated_at = utc_now()
    db.commit()

    return None


@router.post("/bulk-priority", response_model=dict)
def bulk_update_priority(
    priority_update: BulkPriorityUpdate, db: Session = Depends(get_db)
):
    updated_count = 0

    for item in priority_update.video_priorities:
        video_uuid = parse_uuid_or_400(item.video_id, "Mã video")
        video = (
            db.query(Video)
            .filter(
                Video.id == video_uuid,
                Video.is_deleted == False,
            )
            .first()
        )

        if video:
            video.priority = item.priority
            video.updated_at = utc_now()
            updated_count += 1

    db.commit()

    return {"updated_count": updated_count}


@router.post("/{video_id}/publish", response_model=dict)
def publish_video(video_id: str, db: Session = Depends(get_db)):
    video_uuid = parse_uuid_or_400(video_id, "Mã video")
    video = (
        db.query(Video)
        .filter(
            Video.id == video_uuid,
            Video.is_deleted == False,
        )
        .first()
    )

    if not video:
        raise HTTPException(status_code=404, detail="Không tìm thấy video")

    if video.status == VideoStatus.posted:
        return {
            "message": "Video đã được đăng trước đó",
            "video_id": str(video.id),
            "fb_post_id": video.fb_post_id,
        }

    if video.status not in (VideoStatus.ready, VideoStatus.failed):
        raise HTTPException(
            status_code=400,
            detail=f"Video đang ở trạng thái '{video.status.value}', không thể đăng ngay bây giờ.",
        )

    result = publish_video_job(video_id)
    if result.get("ok"):
        return {
            "message": "Video đã được đăng lên Facebook",
            "video_id": str(video.id),
            "fb_post_id": result.get("fb_post_id"),
        }

    raise HTTPException(
        status_code=500, detail=result.get("error", "Đăng video thất bại")
    )
