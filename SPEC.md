# SPEC.md - Migrate AutoCrawl sang Vercel + Supabase

## 1. Mục tiêu

Migrate dự án `auto-crawl-tiktok-post-fb` từ Docker (FastAPI + PostgreSQL) sang:
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL hosted)
- **Frontend**: Vercel Hosting
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth

---

## 2. Architecture

### Hiện tại (Docker)
```
Frontend (React) → Backend (FastAPI) → PostgreSQL (Docker)
                         ↓
                    Worker (Background Jobs)
                         ↓
                    yt-dlp Crawler
```

### Mới (Vercel + Supabase)
```
Frontend (Vercel) → API Routes (Vercel) → Supabase DB
                         ↓
              Edge Functions / Cron Jobs
                         ↓
              Supabase Storage + yt-dlp (serverless)
```

---

## 3. Technical Mapping

### 3.1 Backend API

| Component | Docker (FastAPI) | Vercel + Supabase |
|-----------|------------------|-------------------|
| Auth | JWT + bcrypt | Supabase Auth |
| Database ORM | SQLAlchemy | Supabase JS Client |
| API Framework | FastAPI | Next.js API Routes / Vercel Functions |
| Background Jobs | APScheduler + Worker | Supabase Edge Functions / Vercel Cron |
| Scheduler | APScheduler | Vercel Cron Jobs |

### 3.2 Database Models → Supabase Tables

| Model | Table |
|-------|-------|
| TargetChannel | target_channels |
| Campaign | campaigns |
| Video | videos |
| FacebookPage | facebook_pages |
| InboxConversation | inbox_conversations |
| InteractionLog | interaction_logs |
| InboxMessageLog | inbox_message_logs |
| TaskQueue | task_queue |
| User | users |
| RuntimeSetting | runtime_settings |
| VideoMetricsSnapshot | video_metrics_snapshots |
| ChannelMetricsSnapshot | channel_metrics_snapshots |

### 3.3 Services Mapping

| Service | Migration Strategy |
|---------|-------------------|
| accounts.py | Supabase Auth Admin SDK |
| ai_generator.py | Vercel Function (keep) |
| campaign_jobs.py | Vercel Cron + Edge Functions |
| crawler (yt-dlp) | **CHALLENGE** - see below |
| facebook_publisher.py | Keep as Vercel Function |
| fb_graph.py | Keep as Vercel Function |
| inbox_memory.py | Supabase DB + Edge Functions |
| security.py | Supabase JWT verification |
| task_queue.py | Supabase DB + Edge Functions |
| tiktok_analytics.py | Keep as Vercel Function |
| runtime_settings.py | Supabase DB |

### 3.4 yt-dlp Challenge

**Vấn đề**: yt-dlp không chạy được trên Vercel Serverless (timeout 10s, RAM limit).

**Giải pháp options**:
1. **Vercel Functions với extended timeout** (Enterprise plan 60s)
2. **Supabase Edge Functions** (timeout 60s)
3. **AWS Lambda** cho crawler riêng
4. **Dedicated server** chỉ cho crawler

**Đề xuất**: Dùng **Supabase Edge Functions** cho yt-dlp với stream upload lên Supabase Storage.

### 3.5 Video Storage

| Component | Docker | Supabase |
|-----------|--------|----------|
| Video files | Local `/videos_storage` | Supabase Storage |
| Thumbnails | Local | Supabase Storage |

---

## 4. API Endpoints (giữ nguyên)

Tất cả endpoints hiện tại giữ nguyên path, chỉ thay đổi implementation:

### Auth
- `POST /auth/login` → Supabase Auth
- `GET /auth/me` → Supabase Auth
- `POST /auth/change-password` → Supabase Auth Admin

### Campaigns
- `POST /campaigns/`, `GET /campaigns/`, `POST /campaigns/{id}/sync`, etc.

### Facebook
- `POST /facebook/config`, discover-pages, import-pages, etc.

### Webhooks
- `GET /webhooks/fb`, `POST /webhooks/fb` → Vercel Function với HTTPS

### Dashboard
- `GET /dashboard/overview`, charts, etc.

---

## 5. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Facebook
FB_APP_ID=xxx
FB_APP_SECRET=xxx
FB_VERIFY_TOKEN=xxx

# AI
GEMINI_API_KEY=xxx

# Vercel
VERCEL_TOKEN=xxx
```

---

## 6. Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend API (Vercel)
```bash
vercel --prod --cwd=apps/api
```

### Database Migrations (Supabase)
```bash
supabase db push
```

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| yt-dlp timeout | HIGH | Supabase Edge Functions (60s) |
| Cold starts | MEDIUM | Vercel warmup cron |
| Webhook HTTPS | LOW | Vercel provides HTTPS |
| Rate limits free tier | MEDIUM | Upgrade plan if needed |
| Auth session | LOW | Supabase handles |

---

## 8. Milestones

1. **M1**: Setup Supabase project + schema
2. **M2**: Migrate Auth (Supabase Auth)
3. **M3**: Migrate API endpoints
4. **M4**: Migrate Crawler (yt-dlp → Edge Functions)
5. **M5**: Migrate Frontend
6. **M6**: Deploy + Testing
7. **M7**: Production cutover

---

## 9. Acceptance Criteria

- [ ] Supabase project created with all tables
- [ ] Auth works with Supabase (login/logout)
- [ ] All API endpoints functional
- [ ] Crawler downloads video to Supabase Storage
- [ ] Frontend deploys to Vercel
- [ ] Webhook Facebook receives events
- [ ] AI caption generation works
- [ ] No breaking changes for users
