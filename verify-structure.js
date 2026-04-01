const fs = require('fs');
const path = require('path');

console.log('=== Code Structure Verification ===\n');

const allFiles = [
  // API
  { file: 'apps/api/lib/supabase.ts', type: 'API' },
  { file: 'apps/api/lib/supabase-admin.ts', type: 'API' },
  { file: 'apps/api/api/auth/login.ts', type: 'API' },
  { file: 'apps/api/api/auth/me.ts', type: 'API' },
  { file: 'apps/api/api/auth/change-password.ts', type: 'API' },
  { file: 'apps/api/api/users/index.ts', type: 'API' },
  { file: 'apps/api/api/campaigns/index.ts', type: 'API' },
  { file: 'apps/api/api/videos/index.ts', type: 'API' },
  { file: 'apps/api/api/facebook/index.ts', type: 'API' },
  { file: 'apps/api/api/webhooks/fb.ts', type: 'API' },
  { file: 'apps/api/api/dashboard/overview.ts', type: 'API' },
  { file: 'apps/api/api/system/health.ts', type: 'API' },
  { file: 'apps/api/api/cron/process-queue.ts', type: 'API' },
  { file: 'apps/api/vercel.json', type: 'API' },
  { file: 'apps/api/package.json', type: 'API' },
  
  // Web
  { file: 'apps/web/lib/api.ts', type: 'Web' },
  { file: 'apps/web/lib/AuthContext.tsx', type: 'Web' },
  { file: 'apps/web/lib/supabase.ts', type: 'Web' },
  { file: 'apps/web/hooks/useCampaigns.ts', type: 'Web' },
  { file: 'apps/web/hooks/useVideos.ts', type: 'Web' },
  { file: 'apps/web/src/pages/LoginPage.tsx', type: 'Web' },
  { file: 'apps/web/src/pages/DashboardPage.tsx', type: 'Web' },
  { file: 'apps/web/src/App.tsx', type: 'Web' },
  { file: 'apps/web/package.json', type: 'Web' },
  
  // Supabase
  { file: 'supabase/migrations/001_initial_schema.sql', type: 'Supabase' },
  { file: 'supabase/migrations/003_user_profiles.sql', type: 'Supabase' },
  { file: 'supabase/functions/crawl-video/index.ts', type: 'Supabase' },
  { file: 'supabase/config.toml', type: 'Supabase' },
  
  // Root
  { file: 'SPEC.md', type: 'Root' },
  { file: 'TASKS.md', type: 'Root' },
  { file: 'bugs.md', type: 'Root' },
];

let counts = { API: 0, Web: 0, Supabase: 0, Root: 0 };
let missing = [];

for (const { file, type } of allFiles) {
  const exists = fs.existsSync(file);
  if (exists) {
    counts[type]++;
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}`);
    missing.push(file);
  }
}

console.log('\n=== Summary ===');
console.log(`API: ${counts.API}/${allFiles.filter(f => f.type === 'API').length}`);
console.log(`Web: ${counts.Web}/${allFiles.filter(f => f.type === 'Web').length}`);
console.log(`Supabase: ${counts.Supabase}/${allFiles.filter(f => f.type === 'Supabase').length}`);
console.log(`Root: ${counts.Root}/${allFiles.filter(f => f.type === 'Root').length}`);

const total = counts.API + counts.Web + counts.Supabase + counts.Root;
console.log(`\nTotal: ${total}/${allFiles.length}`);

if (missing.length === 0) {
  console.log('\n✅ All critical files exist!');
} else {
  console.log(`\n⚠️ ${missing.length} files missing`);
  process.exit(1);
}
