from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.time import utc_now
from app.models.models import FacebookPage, InteractionLog, InteractionStatus
from app.services.ai_generator import generate_reply
from app.services.fb_graph import reply_to_comment
from app.services.observability import log_structured, record_event
from app.services.security import decrypt_secret

COMMENT_COOLDOWN_WINDOW_MINUTES = 60
COMMENT_COOLDOWN_MAX_REPLIES = 3


class CooldownManager:
    """DB-based rate limiter: max N replies per sender per hour."""

    def __init__(
        self,
        max_replies: int = COMMENT_COOLDOWN_MAX_REPLIES,
        window_minutes: int = COMMENT_COOLDOWN_WINDOW_MINUTES,
    ):
        self.max_replies = max_replies
        self.window_minutes = window_minutes

    def is_within_cooldown(
        self, db: Session, page_id: str, sender_id: str
    ) -> tuple[bool, str | None]:
        if self.max_replies <= 0:
            return True, None

        cutoff = utc_now() - timedelta(minutes=self.window_minutes)
        reply_count = (
            db.query(func.count(InteractionLog.id))
            .filter(
                InteractionLog.page_id == page_id,
                InteractionLog.user_id == sender_id,
                InteractionLog.status == InteractionStatus.replied,
                InteractionLog.created_at >= cutoff,
            )
            .scalar()
            or 0
        )

        if reply_count >= self.max_replies:
            reason = (
                f"Đã đạt giới hạn {self.max_replies} phản hồi/giờ cho người dùng này."
            )
            return False, reason

        return True, None

    def get_remaining_replies(self, db: Session, page_id: str, sender_id: str) -> int:
        cutoff = utc_now() - timedelta(minutes=self.window_minutes)
        reply_count = (
            db.query(func.count(InteractionLog.id))
            .filter(
                InteractionLog.page_id == page_id,
                InteractionLog.user_id == sender_id,
                InteractionLog.status == InteractionStatus.replied,
                InteractionLog.created_at >= cutoff,
            )
            .scalar()
            or 0
        )
        return max(0, self.max_replies - reply_count)


cooldown_manager = CooldownManager()


def process_comment_reply(interaction_log_id: str) -> dict:
    """Full comment reply processing with cooldown, own-comment skip, AI generation, and Graph API reply."""
    db: Session = SessionLocal()
    try:
        from app.models.models import InteractionLog as IL

        try:
            log_uuid = __import__("uuid").UUID(interaction_log_id)
        except ValueError:
            raise ValueError("Mã nhật ký bình luận không hợp lệ.")

        log = db.query(IL).filter(IL.id == log_uuid).first()
        if not log:
            raise ValueError("Không tìm thấy bình luận cần phản hồi.")

        if log.status != InteractionStatus.pending:
            return {
                "ok": False,
                "log_id": interaction_log_id,
                "skipped": True,
                "reason": "Trạng thái không phải pending",
            }

        page_config = (
            db.query(FacebookPage).filter(FacebookPage.page_id == log.page_id).first()
        )
        if not page_config or not page_config.long_lived_access_token:
            log.status = InteractionStatus.failed
            log.ai_reply = "Trang Facebook chưa có mã truy cập hợp lệ."
            db.commit()
            return {
                "ok": False,
                "log_id": interaction_log_id,
                "error": "Missing page token",
            }

        if page_config.comment_auto_reply_enabled is False:
            log.status = InteractionStatus.ignored
            log.ai_reply = "Tự động phản hồi bình luận đang tắt cho fanpage này."
            db.commit()
            return {
                "ok": False,
                "log_id": interaction_log_id,
                "skipped": True,
                "reason": "Auto-reply disabled",
            }

        if log.user_id == log.page_id:
            log.status = InteractionStatus.ignored
            log.ai_reply = "Bỏ qua bình luận từ chính trang này."
            db.commit()
            record_event(
                "webhook",
                "info",
                "Bỏ qua bình luận từ page owner.",
                db=db,
                details={"comment_id": log.comment_id, "page_id": log.page_id},
            )
            return {
                "ok": False,
                "log_id": interaction_log_id,
                "skipped": True,
                "reason": "Own comment",
            }

        within_cooldown, cooldown_reason = cooldown_manager.is_within_cooldown(
            db, log.page_id, log.user_id
        )
        if not within_cooldown:
            log.status = InteractionStatus.ignored
            log.ai_reply = cooldown_reason
            db.commit()
            record_event(
                "webhook",
                "info",
                "Bỏ qua bình luận do cooldown.",
                db=db,
                details={
                    "comment_id": log.comment_id,
                    "page_id": log.page_id,
                    "sender_id": log.user_id,
                    "reason": cooldown_reason,
                },
            )
            return {
                "ok": False,
                "log_id": interaction_log_id,
                "skipped": True,
                "reason": cooldown_reason,
            }

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
