# Bugs Report

**Date:** 2026-03-31
**Tester:** Tester-02

---

## Bug List

### Bug 1: TASK_TYPE_VIDEO_PUBLISH not defined in task_queue.py import
**Severity:** HIGH
**Status:** FIXED

**Issue:** NameError in tasks.py when processing message_reply tasks
```
ERROR: name 'TASK_TYPE_VIDEO_PUBLISH' is not defined
```

**Affected tests:**
- test_worker_processes_message_reply_task
- test_worker_skips_reply_when_conversation_already_handoff
- test_worker_uses_recent_conversation_history_and_updates_memory
- test_worker_marks_conversation_handoff_when_ai_requests_it

**Root cause:** `TASK_TYPE_VIDEO_PUBLISH` is defined in task_queue.py but not imported in tasks.py

**Fix:** Added to imports in tasks.py (app/worker/tasks.py)

---

### Bug 2: Missing webhook router in test client
**Severity:** MEDIUM
**Status:** FIXED

**Issue:** Webhook endpoints return 404 in tests

**Root cause:** `webhooks` router not included in test client fixture (conftest.py)

**Fix:** Added to client fixture in conftest.py (imports + router include)

---

### Bug 3: ZoneInfo NotFoundError - Missing tzdata module
**Severity:** MEDIUM
**Status:** FIXED

**Issue:** ModuleNotFoundError: No module named 'tzdata' when running tests

**Fix:** Installed tzdata package: `pip install tzdata`

---

### Bug 4: Webhook API endpoints missing from conftest
**Severity:** MEDIUM
**Status:** FIXED

**Issue:** Several webhook API endpoints not registered:
- PATCH /webhooks/messages/{conversation_id}/handoff
- GET /webhooks/conversations

**Fix:** Include webhooks router in test client fixture

---

## Test Results After Fixes

```
pytest -q
99 passed, 110 warnings in 80.89s
```

---

## Summary

| Bug | Severity | Status |
|-----|----------|--------|
| TASK_TYPE_VIDEO_PUBLISH import | HIGH | FIXED |
| Missing webhook router in tests | MEDIUM | FIXED |
| ZoneInfo tzdata module | MEDIUM | FIXED |
| Missing API endpoints | MEDIUM | FIXED |
