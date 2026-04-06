# Todo - Task List

> Migration AutoCrawl: Docker → Vercel + Supabase

---

## Phase M1: Setup Supabase ✅

- [x] M1-T1: Create Supabase Project
- [x] M1-T2: Setup Database Schema (supabase/migrations/001_initial_schema.sql)
- [x] M1-T3: Setup Supabase Storage (supabase/storage/)
- [x] M1-T4: Setup Edge Functions (supabase/functions/)

## Phase M2: Migrate Auth ✅

- [x] M2-T1: Install Supabase Client (package.json created)
- [x] M2-T2: Create Supabase Client Module (lib/supabase.ts, lib/supabase-admin.ts)
- [x] M2-T3: Migrate Login Endpoint (api/auth/login.ts)
- [x] M2-T4: Migrate User Management (api/users/index.ts, api/users/[user_id].ts)

## Phase M3: Migrate API Endpoints ✅

- [x] M3-T1: Setup Vercel API Structure
- [x] M3-T2: Migrate Campaign Endpoints (index.ts, [id].ts, actions.ts)
- [x] M3-T3: Migrate Video Endpoints (index.ts, [video_id].ts)
- [x] M3-T4: Migrate Facebook Endpoints (index.ts, [page_id].ts)
- [x] M3-T5: Migrate Dashboard Endpoints (overview.ts, system/tasks.ts, system/health.ts)

## Phase M4: Migrate Crawler ✅

- [x] M4-T1: Create Supabase Edge Function for Crawler (crawl-video/index.ts)
- [x] M4-T2: Implement crawler using TikWM API + Invidious API (replacement for yt-dlp)
- [x] M4-T3: Migrate Campaign Sync Job (apps/api/api/crawler/crawl.ts)
- [x] M4-T4: Handle Video Download API (apps/api/api/crawler/download.ts)

## Phase M5: Migrate Background Jobs ✅

- [x] M5-T1: Create Vercel Cron Jobs (vercel.json with 4 cron routes)
- [x] M5-T2: Migrate Task Queue Worker (api/cron/process-queue.ts)
- [x] M5-T3: Migrate Scheduler (api/cron/scheduled-posts.ts)
- [x] M5-T4: Migrate AI Jobs (generate-caption, reply-comment/message)

## Phase M6: Migrate Frontend ✅

- [x] M6-T1: Update API Client (lib/api.ts with all endpoints)
- [x] M6-T2: Update Auth Context (lib/AuthContext.tsx with Supabase Auth)
- [x] M6-T3: Create hooks (useCampaigns, useVideos, useFacebookPages, useDashboard)
- [x] M6-T4: Create pages & components (Dashboard, Campaigns, Videos, FacebookPages, Layout)

## Phase M7: Integration & Testing ✅

- [x] M7-T1: Setup Environment Variables (.env.example files)
- [x] M7-T2: Code Structure Verification (31/31 files exist)
- [x] M7-T3: Test files created (api.test.ts, schema.test.ts, components.test.tsx)
- [x] M7-T4: Bugs documented (bugs.md created)

### Manual Testing Required:
- [x] Test Auth Flow (login/logout) - ĐÃ HOẠT ĐỘNG
- [ ] Test Crawl Campaign (sync from TikTok) - CHƯA TEST
- [ ] Test Facebook Integration (webhook, post) - CHƯA TEST
- [ ] Test AI Features (caption generation) - CHƯA TEST
- [ ] Test Production Cutover - CHƯA TEST

---

## 🚀 DEPLOYMENT STATUS (Cloudflare)

### URLs
- **Frontend:** https://master.auto-crawl-tiktok-post-fb.pages.dev
- **API:** https://auto-crawl-tiktok-post-fb.leesun190590.workers.dev

### ✅ Đã hoạt động
- [x] Đăng nhập (testuser@autocrawl.com / testpass123)
- [x] Menu sidebar hiển thị
- [x] Cloudflare Workers API deploy
- [x] Cloudflare Pages frontend deploy

### ❌ Cần fix - LỖI DATABASE
```
API Error: "column campaigns.is_deleted does not exist"
```

**Nguyên nhân:** Supabase database chưa có bảng/columns cần thiết.

**Cần tạo tables:**
1. `campaigns` - id, name, source_url, topic, status, created_by, is_deleted, created_at...
2. `videos` - id, campaign_id, url, title, status, source_platform, is_deleted...
3. `facebook_pages` - id, page_id, page_name, access_token, created_by, is_deleted...
4. `user_profiles` - id, role, display_name (đã có)

---

## Completed

- (none yet)