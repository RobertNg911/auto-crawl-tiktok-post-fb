# AutoCrawl - Quản lý đăng bài TikTok/Facebook

[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers+%2B+Pages-F38020?logo=cloudflare&logoColor=white)](https://cloudflare.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

Hệ thống quản lý đăng bài TikTok/Facebook: crawl video từ TikTok và YouTube Shorts, tạo campaign, xếp lịch đăng Facebook Reels, quản lý nhiều fanpage.

## 🚀 Live Demo

- **Frontend:** https://master.auto-crawl-tiktok-post-fb.pages.dev
- **API:** https://auto-crawl-tiktok-post-fb.leesun190590.workers.dev

**Tài khoản test:**
- Email: `testuser@autocrawl.com`
- Password: `testpass123`

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
│       ├── dist/         # Built static files
│       └── package.json
├── supabase/             # Database migrations
├── database/
├── docs/
└── docker-compose.yml   # Legacy Docker setup
```

## 🚀 Deployment

### Deploy API (Cloudflare Workers)

```bash
cd apps/api
npm install
npx wrangler deploy
```

### Deploy Frontend (Cloudflare Pages)

```bash
cd apps/web
npm install
npm run build
npx wrangler pages deploy dist --project-name=auto-crawl-tiktok-post-fb
```

### Deploy với token

```bash
export CLOUDFLARE_API_TOKEN=your_token
npx wrangler deploy
```

## 🔑 Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-api.workers.dev
```

### Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

## 📡 API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/auth/login` | POST | Đăng nhập |
| `/api/auth/me` | GET | Lấy thông tin user |
| `/api/campaigns` | GET/POST | List/Tạo campaign |
| `/api/campaigns/:id` | GET/PATCH/DELETE | Chi tiết/Cập nhật/Xóa campaign |
| `/api/videos` | GET | List videos |
| `/api/facebook` | GET/POST | List/Tạo Facebook page |
| `/api/dashboard/` | GET | Thống kê tổng quan |
| `/api/system/health` | GET | Health check |

## 🗄️ Database Schema

Các bảng cần thiết trong Supabase:

- `user_profiles` - Thông tin user (id, role, display_name)
- `campaigns` - Chiến dịch (id, name, source_url, topic, status, is_deleted)
- `videos` - Video (id, campaign_id, url, title, status, source_platform)
- `facebook_pages` - Fanpage (id, page_id, page_name, access_token)
- `target_channels` - Kênh mục tiêu
- `runtime_settings` - Cấu hình hệ thống

## 📝 License

MIT
