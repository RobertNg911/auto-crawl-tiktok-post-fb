import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.time import utc_now
from app.models.models import (
    Campaign,
    ChannelMetricsSnapshot,
    TargetChannel,
    ChannelStatus,
)

router = APIRouter(prefix="/channels", tags=["Kênh mục tiêu"])


class ChannelCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=255)
    topic: Optional[str] = Field(None, max_length=100)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        tiktok_pattern = r"^@?[\w.]+$"
        if not re.match(tiktok_pattern, v):
            raise ValueError("Username TikTok không hợp lệ")
        if v.startswith("@"):
            v = v[1:]
        return v.lower()


class ChannelUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=255)
    topic: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")


class ChannelResponse(BaseModel):
    id: str
    channel_id: str
    username: str
    display_name: Optional[str]
    topic: Optional[str]
    status: str
    created_at: str
    updated_at: str
    latest_metrics: Optional[dict] = None

    @classmethod
    def from_orm(cls, channel: TargetChannel, latest_metrics: Optional[dict] = None):
        return cls(
            id=str(channel.id),
            channel_id=channel.channel_id,
            username=channel.username,
            display_name=channel.display_name,
            topic=channel.topic,
            status=channel.status.value
            if hasattr(channel.status, "value")
            else channel.status,
            created_at=channel.created_at.isoformat() if channel.created_at else None,
            updated_at=channel.updated_at.isoformat() if channel.updated_at else None,
            latest_metrics=latest_metrics,
        )


class ChannelMetricsResponse(BaseModel):
    date: str
    followers: int
    video_count: int
    total_views: int

    @classmethod
    def from_orm(cls, snapshot: ChannelMetricsSnapshot):
        return cls(
            date=snapshot.snapshot_date.isoformat() if snapshot.snapshot_date else "",
            followers=snapshot.followers,
            video_count=snapshot.video_count,
            total_views=snapshot.total_views,
        )


class ChannelDetailResponse(BaseModel):
    id: str
    channel_id: str
    username: str
    display_name: Optional[str]
    topic: Optional[str]
    status: str
    metrics_history: list[ChannelMetricsResponse]
    created_at: str
    updated_at: str

    @classmethod
    def from_orm(
        cls, channel: TargetChannel, metrics_history: list[ChannelMetricsSnapshot]
    ):
        return cls(
            id=str(channel.id),
            channel_id=channel.channel_id,
            username=channel.username,
            display_name=channel.display_name,
            topic=channel.topic,
            status=channel.status.value
            if hasattr(channel.status, "value")
            else channel.status,
            metrics_history=[
                ChannelMetricsResponse.from_orm(m) for m in metrics_history
            ],
            created_at=channel.created_at.isoformat() if channel.created_at else None,
            updated_at=channel.updated_at.isoformat() if channel.updated_at else None,
        )


def parse_uuid_or_400(raw_id: str, label: str):
    try:
        return uuid.UUID(raw_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{label} không hợp lệ.") from exc


@router.get("", response_model=dict)
def list_channels(
    status: Optional[str] = Query(
        None, description="Filter by status: active, inactive, all"
    ),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    search: Optional[str] = Query(
        None, description="Search by username or display_name"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(TargetChannel).filter(TargetChannel.is_deleted == False)

    if status and status != "all":
        try:
            status_enum = ChannelStatus(status)
            query = query.filter(TargetChannel.status == status_enum)
        except ValueError:
            pass

    if topic:
        query = query.filter(TargetChannel.topic == topic)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                TargetChannel.username.ilike(search_pattern),
                TargetChannel.display_name.ilike(search_pattern),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    channels = (
        query.order_by(TargetChannel.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    channel_ids = [ch.id for ch in channels]
    latest_snapshots = {}
    if channel_ids:
        snapshots = (
            db.query(ChannelMetricsSnapshot)
            .filter(ChannelMetricsSnapshot.channel_id.in_(channel_ids))
            .order_by(ChannelMetricsSnapshot.snapshot_date.desc())
            .all()
        )

        seen_channels = set()
        for snapshot in snapshots:
            if snapshot.channel_id not in seen_channels:
                latest_snapshots[snapshot.channel_id] = snapshot
                seen_channels.add(snapshot.channel_id)

    result_items = []
    for ch in channels:
        latest = latest_snapshots.get(ch.id)
        metrics_dict = None
        if latest:
            metrics_dict = {
                "followers": latest.followers,
                "video_count": latest.video_count,
                "total_views": latest.total_views,
                "snapshot_date": latest.snapshot_date.isoformat()
                if latest.snapshot_date
                else None,
            }
        result_items.append(ChannelResponse.from_orm(ch, latest_metrics=metrics_dict))

    return {
        "items": result_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", response_model=ChannelResponse, status_code=201)
def create_channel(channel_in: ChannelCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(TargetChannel)
        .filter(
            TargetChannel.username == channel_in.username,
            TargetChannel.is_deleted == False,
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=400, detail="Channel already exists")

    channel_id = f"tiktok_{channel_in.username}"

    db_channel = TargetChannel(
        channel_id=channel_id,
        username=channel_in.username,
        display_name=channel_in.display_name,
        topic=channel_in.topic,
        status=ChannelStatus.active,
    )
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)

    return ChannelResponse.from_orm(db_channel)


@router.get("/{channel_id}", response_model=ChannelDetailResponse)
def get_channel(channel_id: str, db: Session = Depends(get_db)):
    channel_uuid = parse_uuid_or_400(channel_id, "Mã kênh")
    channel = (
        db.query(TargetChannel)
        .filter(
            TargetChannel.id == channel_uuid,
            TargetChannel.is_deleted == False,
        )
        .first()
    )

    if not channel:
        raise HTTPException(status_code=404, detail="Không tìm thấy kênh")

    metrics_history = (
        db.query(ChannelMetricsSnapshot)
        .filter(ChannelMetricsSnapshot.channel_id == channel.id)
        .order_by(ChannelMetricsSnapshot.snapshot_date.desc())
        .limit(30)
        .all()
    )

    return ChannelDetailResponse.from_orm(channel, metrics_history)


@router.patch("/{channel_id}", response_model=ChannelResponse)
def update_channel(
    channel_id: str, channel_update: ChannelUpdate, db: Session = Depends(get_db)
):
    channel_uuid = parse_uuid_or_400(channel_id, "Mã kênh")
    channel = (
        db.query(TargetChannel)
        .filter(
            TargetChannel.id == channel_uuid,
            TargetChannel.is_deleted == False,
        )
        .first()
    )

    if not channel:
        raise HTTPException(status_code=404, detail="Không tìm thấy kênh")

    if channel_update.display_name is not None:
        channel.display_name = channel_update.display_name

    if channel_update.topic is not None:
        channel.topic = channel_update.topic

    if channel_update.status is not None:
        channel.status = ChannelStatus(channel_update.status)

    channel.updated_at = utc_now()
    db.commit()
    db.refresh(channel)

    return ChannelResponse.from_orm(channel)


@router.delete("/{channel_id}", status_code=204)
def delete_channel(channel_id: str, db: Session = Depends(get_db)):
    channel_uuid = parse_uuid_or_400(channel_id, "Mã kênh")
    channel = (
        db.query(TargetChannel)
        .filter(
            TargetChannel.id == channel_uuid,
            TargetChannel.is_deleted == False,
        )
        .first()
    )

    if not channel:
        raise HTTPException(status_code=404, detail="Không tìm thấy kênh")

    active_campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.source_url.contains(channel.username), Campaign.status == "active"
        )
        .count()
    )

    if active_campaigns > 0:
        raise HTTPException(
            status_code=400, detail="Cannot delete channel used in active campaigns"
        )

    channel.is_deleted = True
    channel.updated_at = utc_now()
    db.commit()

    return None
