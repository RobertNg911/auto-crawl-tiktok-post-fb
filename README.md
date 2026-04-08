# AutoCrawl - Quản lý đăng bài TikTok/Facebook

[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers+%2B+Pages-F38020?logo=cloudflare&logoColor=white)](https://cloudflare.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

Hệ thống quản lý đăng bài TikTok/Facebook: crawl video, tạo campaign, xếp lịch đăng Facebook, quản lý fanpage.

## 🚀 Live Demo

- **Frontend:** https://master.auto-crawl-tiktok-post-fb.pages.dev
- **API:** https://auto-crawl-tiktok-post-fb.leesun190590.workers.dev

## 🛠️ Công nghệ

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript |
| API | Hono (Cloudflare Workers) |
| Database | Supabase (PostgreSQL) |
| Deployment | Cloudflare Workers + Pages |

## 📂 Cấu trúc dự án

```
auto-crawl-tiktok-post-fb/
├── apps/
│   ├── api/              # Cloudflare Workers API
│   │   ├── api/          # Route handlers (auth, campaigns, videos, etc.)
│   │   ├── lib/          # Supabase client, env
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── web/              # React Frontend
│       ├── src/
│       │   ├── pages/    # Dashboard, Campaigns, Videos, Facebook Pages
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/     # API client
│       ├── dist/        # Built static files
│       └── package.json
├── supabase/             # Database migrations
└── videos_storage/        # Downloaded videos
```

## 🚀 Deployment

### 1. Deploy API (Cloudflare Workers)

```bash
cd apps/api
npm install
npx wrangler deploy
```

### 2. Deploy Frontend (Cloudflare Pages)

```bash
cd apps/web
npm install
npm run build
npx wrangler pages deploy dist --project-name=auto-crawl-tiktok-post-fb
```

### 3. Database Setup

Chạy SQL trong `supabase/migrations/DEPLOY.sql` trên Supabase SQL Editor.

## 🔑 Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=your_api_url
```

### API (.dev.vars hoặc Cloudflare Secrets)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
CRON_SECRET=your_cron_secret
```

## 📡 API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/auth/login` | POST | Đăng nhập |
| `/api/auth/me` | GET | Thông tin user |
| `/api/campaigns` | GET/POST | List/Tạo campaign |
| `/api/campaigns/:id` | GET/PATCH/DELETE | Chi tiết/Cập nhật/Xóa |
| `/api/campaigns/:id/sync` | POST | Đồng bộ video |
| `/api/videos` | GET | List videos |
| `/api/facebook` | GET/POST | List/Tạo Facebook page |
| `/api/dashboard` | GET | Thống kê tổng quan |
| `/api/cron/*` | POST | Cron jobs (auto-post, sync) |

## 🗄️ Database Schema

Các bảng chính:

- `user_profiles` - Thông tin user
- `campaigns` - Chiến dịch
- `videos` - Video
- `facebook_pages` - Fanpage Facebook
- `target_channels` - Kênh mục tiêu

## ⏰ Cron Jobs

Cron chạy mỗi giờ tự động:
- Sync campaigns
- Auto-post videos lên Facebook
- Auto-reply comments

## ⚠️ Lưu ý

- Video crawl: Hiện tại dùng demo videos để test. Để crawl thật cần paid API hoặc browser automation.
- Database: Cần chạy migration trước khi sử dụng.

## 📝 License

MIT