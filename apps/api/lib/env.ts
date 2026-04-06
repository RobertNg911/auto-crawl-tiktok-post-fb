import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lqzvltnwbkthjyzjztdd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxenZsdG53Ymt0aGp5emp6dGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2MDUzMCwiZXhwIjoyMDkwNjM2NTMwfQ.oZLm7o9cM3FoNgSzALIyIxH-aHQKFTp-513pzm5WSIM';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxenZsdG53Ymt0aGp5emp6dGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjA1MzAsImV4cCI6MjA5MDYzNjUzMH0.vYyVMpdd4GOiw2F22y6hlyC1ycrjKsl70lFcWLZwUw0';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const env = {
  JWT_SECRET: 'autocrawl-jwt-secret-change-in-production',
  CRON_SECRET: 'autocrawl-cron-secret-change',
  FB_APP_SECRET: '',
  FB_VERIFY_TOKEN: 'autocrawl_verify_token',
  GEMINI_API_KEY: 'your-gemini-api-key',
};