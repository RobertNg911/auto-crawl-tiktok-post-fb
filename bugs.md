# Bugs.md - Migration Issues Tracking

> Document bugs found during testing Phase M7

---

## Critical Issues

### CRITICAL-1: yt-dlp cannot run in Edge Functions

**Status**: ⚠️ WORKAROUND APPLIED

**Issue**: Supabase Edge Functions run on Deno runtime, which doesn't support Python subprocess needed for yt-dlp.

**Impact**: Cannot crawl videos directly in Edge Functions.

**Workaround Applied**: 
- Using TikWM API for TikTok videos
- Using Invidious API for YouTube Shorts
- Direct URL extraction without yt-dlp

**Remaining Risk**: External API dependencies, rate limits possible.

---

### CRITICAL-2: Video Download Timeout

**Status**: ⚠️ NEEDS ATTENTION

**Issue**: Video download may timeout on large files (>100MB) with Vercel function limits.

**Impact**: Videos may fail to download.

**Workaround**: Video URLs from TikWM/Invidious are direct stream URLs, reducing need for local download.

---

## High Priority Issues

### HIGH-1: Supabase Credentials Not Configured

**Status**: 🔴 BLOCKER

**Issue**: No Supabase project credentials provided yet.

**Impact**: Cannot deploy or test the application.

**Required Actions**:
1. Create Supabase project
2. Get URL, anon key, service role key
3. Add to environment variables

---

### HIGH-2: Facebook App Credentials Missing

**Status**: 🔴 BLOCKER

**Issue**: No Facebook App credentials configured.

**Impact**: Cannot receive webhooks or post to Facebook.

**Required Actions**:
1. Create Meta App
2. Get App ID and App Secret
3. Configure webhook URL
4. Subscribe to page events

---

## Medium Priority Issues

### MEDIUM-1: Auth Token Storage

**Status**: ⚠️ NEEDS REVIEW

**Issue**: Auth tokens stored in localStorage (vulnerable to XSS).

**Current Implementation**:
```typescript
localStorage.setItem('auth_token', response.session.access_token);
```

**Recommendation**: Use httpOnly cookies for production.

---

### MEDIUM-2: No Rate Limiting on API

**Status**: ⚠️ DOCUMENTED

**Issue**: No rate limiting implemented on Vercel API routes.

**Impact**: API could be abused.

**Note**: Vercel Pro has some built-in rate limiting.

---

### MEDIUM-3: Cold Start Performance

**Status**: 📝 DOCUMENTED

**Issue**: Vercel Serverless functions have cold starts (~500ms-2s).

**Impact**: First request after idle may be slow.

**Note**: Cron jobs can help keep functions warm.

---

## Low Priority Issues

### LOW-1: No E2E Tests

**Status**: 📝 TODO

**Issue**: No Playwright/Cypress E2E tests created.

**Impact**: Cannot automatically verify full user flows.

---

### LOW-2: Missing Loading States

**Status**: 📝 TODO

**Issue**: Some components may not have proper loading states.

**Impact**: Poor UX during async operations.

---

## Resolved Issues

### RESOLVED-1: Migration file naming

**Status**: ✅ FIXED

**Issue**: Alembic migration IDs exceeded 32 character limit.

**Fix**: Created new Supabase SQL migration files with shorter IDs.

---

## Testing Checklist

- [ ] Auth flow (login/logout)
- [ ] Campaign CRUD
- [ ] Video list and actions
- [ ] Facebook page management
- [ ] Webhook verification
- [ ] Cron job execution
- [ ] AI caption generation
- [ ] Dashboard data loading

---

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Auth
JWT_SECRET=xxx

# Facebook
FB_APP_ID=xxx
FB_APP_SECRET=xxx
FB_VERIFY_TOKEN=xxx

# AI
GEMINI_API_KEY=xxx

# Cron Security
CRON_SECRET=xxx
```

---

## Next Actions

1. Create Supabase project
2. Run migrations
3. Deploy to Vercel
4. Configure Facebook App
5. Run integration tests
