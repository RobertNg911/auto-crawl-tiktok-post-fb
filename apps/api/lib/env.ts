import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const env = {
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-jwt-secret',
  CRON_SECRET: process.env.CRON_SECRET || 'change-this-cron-secret',
  FB_APP_SECRET: process.env.FB_APP_SECRET || '',
  FB_VERIFY_TOKEN: process.env.FB_VERIFY_TOKEN || 'verify-token',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};
