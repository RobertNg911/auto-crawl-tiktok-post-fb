from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import require_authenticated_user
from app.core.database import get_db
from app.models.models import FacebookPage, InteractionLog, InteractionStatus, User

router = APIRouter(prefix="/comments", tags=["Comments"])


def serialize_comment(log: InteractionLog) -> dict:
    return {
        "id": str(log.id),
        "comment_id": log.comment_id,
        "post_id": log.post_id,
        "page_id": log.page_id,
        "sender_id": log.user_id,
        "sender_name": None,
        "message": log.user_message,
        "reply_sent": log.status == InteractionStatus.replied,
        "reply_message": log.ai_reply,
        "status": log.status.value if hasattr(log.status, "value") else log.status,
        "created_at": log.created_at.isoformat() if log.created_at else None,
        "updated_at": log.updated_at.isoformat() if log.updated_at else None,
    }


@router.get("")
def list_comments(
    page_id: str | None = Query(default=None),
    post_id: str | None = Query(default=None),
    has_reply: bool | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_authenticated_user),
):
    query = db.query(InteractionLog)

    if page_id:
        query = query.filter(InteractionLog.page_id == page_id)
    if post_id:
        query = query.filter(InteractionLog.post_id == post_id)
    if has_reply is not None:
        if has_reply:
            query = query.filter(InteractionLog.status == InteractionStatus.replied)
        else:
            query = query.filter(InteractionLog.status != InteractionStatus.replied)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(InteractionLog.created_at >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="start_date không hợp lệ")
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(InteractionLog.created_at <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="end_date không hợp lệ")

    total = query.count()
    comments = (
        query.order_by(InteractionLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    pages = db.query(FacebookPage).filter(FacebookPage.is_deleted == False).all()
    page_names = {p.page_id: p.page_name for p in pages}

    items = []
    for comment in comments:
        item = serialize_comment(comment)
        item["sender_name"] = item["sender_name"] or f"User {comment.user_id[:8]}"
        item["page_name"] = page_names.get(comment.page_id, comment.page_id)
        items.append(item)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/stats")
def get_comment_stats(
    page_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_authenticated_user),
):
    query = db.query(InteractionLog)
    if page_id:
        query = query.filter(InteractionLog.page_id == page_id)

    total = query.count()
    replied = query.filter(InteractionLog.status == InteractionStatus.replied).count()
    ignored = query.filter(InteractionLog.status == InteractionStatus.ignored).count()
    failed = query.filter(InteractionLog.status == InteractionStatus.failed).count()
    pending = query.filter(InteractionLog.status == InteractionStatus.pending).count()

    return {
        "total": total,
        "replied": replied,
        "ignored": ignored,
        "failed": failed,
        "pending": pending,
    }
