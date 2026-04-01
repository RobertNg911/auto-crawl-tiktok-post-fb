from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.auth import require_authenticated_user
from app.core.database import get_db
from app.models.models import Campaign, FacebookPage
from app.services.security import encrypt_secret
from app.services.fb_graph import inspect_page_access, inspect_user_pages
from app.services.observability import record_event
from app.services.ai_generator import (
    generate_caption,
    generate_reply,
    generate_message_reply_with_context,
    DEFAULT_CAPTION_PROMPT,
    DEFAULT_COMMENT_REPLY_PROMPT,
    DEFAULT_MESSAGE_REPLY_PROMPT,
    CAPTION_MAX_CHARS,
)

router = APIRouter(prefix="/pages", tags=["Fanpage"])


class PageAutomationUpdate(BaseModel):
    auto_post: bool | None = None
    auto_comment: bool | None = None
    auto_inbox: bool | None = None
    caption_prompt: str | None = None
    comment_prompt: str | None = None
    inbox_prompt: str | None = None


class PageImportRequest(BaseModel):
    user_access_token: str


class PromptTestRequest(BaseModel):
    prompt_type: str = Field(..., description="caption|comment|inbox")
    sample_input: str = Field(
        ..., description="Sample input text to test the prompt against"
    )


def serialize_page(page: FacebookPage) -> dict:
    return {
        "id": str(page.id),
        "page_id": page.page_id,
        "page_name": page.page_name,
        "auto_post": page.auto_post
        if hasattr(page, "auto_post") and page.auto_post is not None
        else True,
        "auto_comment": page.auto_comment
        if hasattr(page, "auto_comment") and page.auto_comment is not None
        else page.comment_auto_reply_enabled is not False,
        "auto_inbox": page.auto_inbox
        if hasattr(page, "auto_inbox") and page.auto_inbox is not None
        else bool(page.message_auto_reply_enabled),
        "caption_prompt": page.caption_prompt
        if hasattr(page, "caption_prompt")
        else None,
        "comment_prompt": page.comment_ai_prompt
        if hasattr(page, "comment_ai_prompt")
        else None,
        "inbox_prompt": page.message_ai_prompt
        if hasattr(page, "message_ai_prompt")
        else None,
        "created_at": page.created_at.isoformat() if page.created_at else None,
    }


def _load_discovered_pages(token: str) -> dict:
    discovery = inspect_user_pages(token)
    if not discovery.get("ok"):
        raise HTTPException(
            status_code=400,
            detail=discovery.get("message", "Không thể tải danh sách fanpage."),
        )
    return {
        "pages": {
            page.get("page_id"): page
            for page in discovery.get("pages", [])
            if page.get("page_id")
        },
        "discovery": discovery,
    }


@router.get("")
def list_pages(
    db: Session = Depends(get_db), _: str = Depends(require_authenticated_user)
):
    """GET /api/pages - List all pages"""
    pages = db.query(FacebookPage).filter(FacebookPage.is_deleted == False).all()
    return {"items": [serialize_page(p) for p in pages]}


@router.get("/{page_id}")
def get_page(
    page_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_authenticated_user),
):
    """GET /api/pages/{page_id} - Get page detail with prompts"""
    page = (
        db.query(FacebookPage)
        .filter(FacebookPage.page_id == page_id, FacebookPage.is_deleted == False)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return serialize_page(page)


@router.post("/import")
def import_pages(
    payload: PageImportRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_authenticated_user),
):
    """POST /api/pages/import - Import pages from User Access Token"""
    token = payload.user_access_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="User Access Token is required")

    result = _load_discovered_pages(token)
    pages_data = result["pages"]
    discovery = result["discovery"]

    if not pages_data:
        raise HTTPException(status_code=400, detail="No pages found in token")

    imported_pages = []
    for page_id, page_data in pages_data.items():
        page_access_token = page_data.get("page_access_token", "").strip()
        if not page_access_token:
            continue

        existing = (
            db.query(FacebookPage).filter(FacebookPage.page_id == page_id).first()
        )
        if existing:
            existing.page_name = page_data.get("page_name", existing.page_name)
            existing.long_lived_access_token = encrypt_secret(page_access_token)
            page = existing
        else:
            page = FacebookPage(
                page_id=page_id,
                page_name=page_data.get("page_name", page_id),
                long_lived_access_token=encrypt_secret(page_access_token),
                auto_post=True,
                auto_comment=False,
                auto_inbox=False,
            )
            db.add(page)
        imported_pages.append(page)

    db.commit()

    record_event(
        "pages",
        "info",
        f"Imported {len(imported_pages)} pages from User Access Token",
        db=db,
        details={"count": len(imported_pages)},
    )

    return {
        "imported_count": len(imported_pages),
        "pages": [serialize_page(p) for p in imported_pages],
    }


@router.patch("/{page_id}")
def update_page(
    page_id: str,
    payload: PageAutomationUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(require_authenticated_user),
):
    """PATCH /api/pages/{page_id} - Update automation settings"""
    page = (
        db.query(FacebookPage)
        .filter(FacebookPage.page_id == page_id, FacebookPage.is_deleted == False)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if payload.auto_post is not None:
        page.auto_post = payload.auto_post
    if payload.auto_comment is not None:
        page.auto_comment = payload.auto_comment
    if payload.auto_inbox is not None:
        page.auto_inbox = payload.auto_inbox
    if payload.caption_prompt is not None:
        page.caption_prompt = payload.caption_prompt.strip() or None
    if payload.comment_prompt is not None:
        page.comment_ai_prompt = payload.comment_prompt.strip() or None
    if payload.inbox_prompt is not None:
        page.message_ai_prompt = payload.inbox_prompt.strip() or None

    db.commit()
    db.refresh(page)

    record_event(
        "pages",
        "info",
        f"Updated automation settings for page {page.page_name}",
        db=db,
        details={"page_id": page_id},
    )

    return serialize_page(page)


@router.post("/{page_id}/refresh-token")
def refresh_page_token(
    page_id: str,
    payload: PageImportRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_authenticated_user),
):
    """POST /api/pages/{page_id}/refresh-token - Refresh page access token"""
    page = (
        db.query(FacebookPage)
        .filter(FacebookPage.page_id == page_id, FacebookPage.is_deleted == False)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    token = payload.user_access_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="User Access Token is required")

    result = _load_discovered_pages(token)
    pages_data = result["pages"]

    page_data = pages_data.get(page_id)
    if not page_data:
        raise HTTPException(status_code=400, detail="Page not found in token")

    page_access_token = page_data.get("page_access_token", "").strip()
    if not page_access_token:
        raise HTTPException(
            status_code=400, detail="No access token returned from Facebook"
        )

    inspection = inspect_page_access(page_id, page_access_token)
    if not inspection.get("ok"):
        raise HTTPException(
            status_code=400, detail=inspection.get("message", "Token validation failed")
        )

    page.long_lived_access_token = encrypt_secret(page_access_token)
    db.commit()

    record_event(
        "pages",
        "info",
        f"Refreshed token for page {page.page_name}",
        db=db,
        details={"page_id": page_id},
    )

    return {
        "success": True,
        "expires_at": inspection.get("expires_at"),
    }


@router.delete("/{page_id}")
def delete_page(
    page_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_authenticated_user),
):
    """DELETE /api/pages/{page_id} - Delete page (check campaign dependency)"""
    page = (
        db.query(FacebookPage)
        .filter(FacebookPage.page_id == page_id, FacebookPage.is_deleted == False)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    linked_campaigns = (
        db.query(Campaign).filter(Campaign.target_page_id == page_id).all()
    )
    if linked_campaigns:
        campaign_names = ", ".join(c.name or str(c.id) for c in linked_campaigns[:5])
        extra = (
            f" and {len(linked_campaigns) - 5} more"
            if len(linked_campaigns) > 5
            else ""
        )
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete page used in {len(linked_campaigns)} active campaigns ({campaign_names}{extra}). Remove or reassign campaigns first.",
        )

    page.is_deleted = True
    db.commit()

    record_event(
        "pages",
        "warning",
        f"Deleted page {page.page_name}",
        db=db,
        details={"page_id": page_id},
    )

    return {"success": True, "message": "Page deleted successfully"}


@router.post("/{page_id}/test-prompt")
def test_prompt(
    page_id: str,
    payload: PromptTestRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_authenticated_user),
):
    """POST /api/pages/{page_id}/test-prompt - Test prompt with sample input"""
    page = (
        db.query(FacebookPage)
        .filter(FacebookPage.page_id == page_id, FacebookPage.is_deleted == False)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    prompt_type = payload.prompt_type.lower()
    sample_input = payload.sample_input.strip()

    if not sample_input:
        raise HTTPException(status_code=400, detail="Sample input is required")

    if prompt_type not in ("caption", "comment", "inbox"):
        raise HTTPException(
            status_code=400,
            detail="Invalid prompt_type. Must be: caption, comment, or inbox",
        )

    max_chars = CAPTION_MAX_CHARS if prompt_type == "caption" else 200

    if prompt_type == "caption":
        custom_prompt = page.caption_prompt if page.caption_prompt else None
        output = generate_caption(sample_input, custom_prompt)
        effective_prompt = custom_prompt or DEFAULT_CAPTION_PROMPT
    elif prompt_type == "comment":
        custom_prompt = page.comment_ai_prompt if page.comment_ai_prompt else None
        output = generate_reply(
            sample_input, channel="comment", prompt_override=custom_prompt
        )
        effective_prompt = custom_prompt or DEFAULT_COMMENT_REPLY_PROMPT
    else:
        custom_prompt = page.message_ai_prompt if page.message_ai_prompt else None
        result = generate_message_reply_with_context(
            sample_input,
            prompt_override=custom_prompt,
            conversation_summary="Test conversation summary",
            recent_turns=[],
            customer_facts={},
        )
        output = result.get("reply", "")
        effective_prompt = custom_prompt or DEFAULT_MESSAGE_REPLY_PROMPT

    record_event(
        "pages",
        "info",
        f"Tested {prompt_type} prompt for page {page.page_name}",
        db=db,
        details={
            "page_id": page_id,
            "prompt_type": prompt_type,
            "output_length": len(output),
        },
    )

    return {
        "prompt_type": prompt_type,
        "effective_prompt": effective_prompt,
        "sample_input": sample_input,
        "output": output,
        "chars_used": len(output),
        "max_chars": max_chars,
    }
