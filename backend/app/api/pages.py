from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import require_authenticated_user
from app.core.database import get_db
from app.models.models import FacebookPage
from app.services.security import decrypt_secret, encrypt_secret

router = APIRouter(prefix="/pages", tags=["Fanpage"])


class PageAutomationUpdate:
    auto_post: bool | None = None
    auto_comment: bool | None = None
    auto_inbox: bool | None = None
    caption_prompt: str | None = None
    comment_prompt: str | None = None
    inbox_prompt: str | None = None


def serialize_page(page: FacebookPage) -> dict:
    return {
        "id": str(page.id),
        "page_id": page.page_id,
        "page_name": page.page_name,
        "auto_post": page.auto_post if hasattr(page, "auto_post") else True,
        "auto_comment": page.comment_auto_reply_enabled is not False
        if hasattr(page, "comment_auto_reply_enabled")
        else False,
        "auto_inbox": bool(page.message_auto_reply_enabled)
        if hasattr(page, "message_auto_reply_enabled")
        else False,
        "caption_prompt": getattr(page, "caption_prompt", None),
        "comment_prompt": page.comment_ai_prompt
        if hasattr(page, "comment_ai_prompt")
        else None,
        "inbox_prompt": page.message_ai_prompt
        if hasattr(page, "message_ai_prompt")
        else None,
        "created_at": page.created_at.isoformat() if page.created_at else None,
    }


@router.get("")
def list_pages(
    db: Session = Depends(get_db), _: str = Depends(require_authenticated_user)
):
    """GET /api/pages - List all pages"""
    pages = db.query(FacebookPage).all()
    return {"items": [serialize_page(p) for p in pages]}


@router.get("/{page_id}")
def get_page(
    page_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_authenticated_user),
):
    """GET /api/pages/{page_id} - Get page detail with prompts"""
    page = db.query(FacebookPage).filter(FacebookPage.page_id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return serialize_page(page)
