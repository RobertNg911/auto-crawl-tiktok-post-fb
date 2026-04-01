# TASKS.md - Migration AutoCrawl sang Vercel + Supabase

## Task Count: 25 tasks across 7 phases

---

## Phase M1: Setup Supabase Project

### M1-T1: Create Supabase Project
- Create new Supabase project
- Get project URL, anon key, service role key
- Enable Email auth provider
- **Output**: `supabase-url`, `supabase-anon-key`, `supabase-service-key`

### M1-T2: Setup Database Schema
- Create all tables from SQLAlchemy models
- Map types: UUID, JSON, Boolean, DateTime, Enum, ForeignKey
- Create indexes
- Create RLS (Row Level Security) policies
- **Output**: `supabase/migrations/001_initial_schema.sql`

### M1-T3: Setup Supabase Storage
- Create bucket `videos` (public read, auth write)
- Create bucket `thumbnails`
- Setup storage policies
- **Output**: Storage buckets configured

### M1-T4: Setup Edge Functions CLI
- Install Supabase CLI
- Login to Supabase
- Link project
- Setup `apps/functions/` directory
- **Output**: Edge Functions ready

---

## Phase M2: Migrate Auth

### M2-T1: Install Supabase Client
```bash
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-nextjs
```
- **Output**: Dependencies installed

### M2-T2: Create Supabase Client Module
- Create `lib/supabase.ts` for client
- Create `lib/supabase-admin.ts` for server
- Setup SSR helpers if using Next.js
- **Output**: `lib/supabase.ts`

### M2-T3: Migrate Login Endpoint
- Replace JWT creation with Supabase Auth
- Use `supabase.auth.signInWithPassword()`
- Return Supabase session
- **Output**: `/api/auth/login`

### M2-T4: Migrate User Management
- Replace local User model with Supabase Auth Admin
- Create users via `admin.createUser()`
- Change password via `admin.updateUserById()`
- **Output**: `/api/users/*` working

---

## Phase M3: Migrate API Endpoints

### M3-T1: Setup Vercel API Structure
```
apps/
├── api/
│   ├── vercel.json
│   ├── api/
│   │   ├── auth/
│   │   ├── campaigns/
│   │   ├── facebook/
│   │   ├── webhooks/
│   │   └── dashboard/
│   └── package.json
└── web/
    └── (existing frontend)
```

### M3-T2: Migrate Campaign Endpoints
- Map all campaign endpoints
- Replace SQLAlchemy with Supabase JS
- **Output**: `/api/campaigns/*`

### M3-T3: Migrate Video Endpoints
- Map video CRUD endpoints
- Handle Supabase Storage for video files
- **Output**: `/api/videos/*`

### M3-T4: Migrate Facebook Endpoints
- Keep `fb_graph.py` logic as utility functions
- Call from Vercel API routes
- **Output**: `/api/facebook/*`

### M3-T5: Migrate Dashboard Endpoints
- Map dashboard overview, charts
- Use Supabase query for aggregations
- **Output**: `/api/dashboard/*`

---

## Phase M4: Migrate Crawler (yt-dlp)

### M4-T1: Create Supabase Edge Function for Crawler
```typescript
// supabase/functions/crawl-video/index.ts
import { createClient } from '@supabase/supabase-js'
```

### M4-T2: Implement yt-dlp in Edge Function
- Use `yt-dlp` npm package or subprocess
- Stream download to Supabase Storage
- Handle timeout (60s limit)
- **Output**: `crawl-video` Edge Function

### M4-T3: Migrate Campaign Sync Job
- Call Edge Function from campaign sync
- Poll for completion
- Update video status in DB
- **Output**: Campaign sync works

### M4-T4: Handle Video Download API
- Replace local file download with Supabase Storage URL
- Generate signed URLs for private videos
- **Output**: Video playback works

---

## Phase M5: Migrate Background Jobs

### M5-T1: Create Vercel Cron Jobs
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-campaigns",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### M5-T2: Migrate Task Queue Worker
- Convert to Vercel Cron or Edge Function
- Use Supabase DB for task queue
- **Output**: Task queue works

### M5-T3: Migrate Scheduler
- Create cron for scheduled posts
- Query videos with `scheduled_at` in past
- Process queue
- **Output**: Scheduled posts work

### M5-T4: Migrate AI Jobs
- Keep Gemini AI logic
- Wrap in Vercel Function
- Call from task queue
- **Output**: AI caption/reply works

---

## Phase M6: Migrate Frontend

### M6-T1: Update API Client
- Replace axios/fetch with Supabase JS
- Use `supabase.from('table').select()`
- **Output**: `lib/api.ts` updated

### M6-T2: Update Auth Context
- Replace JWT auth with Supabase Auth
- Use `supabase.auth.getSession()`
- Handle auth state changes
- **Output**: Auth context updated

### M6-T3: Update Video Components
- Replace local file URLs with Supabase Storage URLs
- Handle signed URLs for authenticated access
- **Output**: Video components work

### M6-T4: Deploy Frontend
```bash
vercel --prod
```
- Update env vars
- Update Vercel project settings
- **Output**: Frontend deployed

---

## Phase M7: Integration & Testing

### M7-T1: Setup Environment Variables
- Add all Supabase vars to Vercel
- Add Facebook vars to Vercel
- Add Gemini API key
- **Output**: All env vars configured

### M7-T2: Test Auth Flow
- Register new user
- Login/logout
- Password reset
- **Output**: Auth works

### M7-T3: Test Crawl Campaign
- Create campaign
- Sync campaign
- Download video
- **Output**: Crawler works

### M7-T4: Test Facebook Integration
- Post video to Facebook
- Receive webhook events
- **Output**: Facebook works

### M7-T5: Test AI Features
- Generate caption
- Reply to comment
- Inbox reply
- **Output**: AI works

### M7-T6: Production Cutover
- Update DNS if custom domain
- Update Facebook webhook URL
- Monitor for issues
- **Output**: Production live

---

## Dependency Chain

```
M1 → M2 → M3 → M4 → M5 → M6 → M7
 │     │     │     │     │
 └─────┴─────┴─────┴─────┴──→ Fullstack Agent
```

---

## Agent Assignment

| Phase | Agent | Tasks |
|-------|-------|-------|
| M1 | Fullstack | M1-T1 to M1-T4 |
| M2 | Fullstack | M2-T1 to M2-T4 |
| M3 | Fullstack | M3-T1 to M3-T5 |
| M4 | Fullstack | M4-T1 to M4-T4 |
| M5 | Fullstack | M5-T1 to M5-T4 |
| M6 | Fullstack | M6-T1 to M6-T4 |
| M7 | Fullstack + Tester | M7-T1 to M7-T6 |
