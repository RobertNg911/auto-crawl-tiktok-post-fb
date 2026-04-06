import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqzvltnwbkthjyzjztdd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxenZsdG53Ymt0aGp5emp6dGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2MDUzMCwiZXhwIjoyMDkwNjM2NTMwfQ.oZLm7o9cM3FoNgSzALIyIxH-aHQKFTp-513pzm5WSIM';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type AdminClient = typeof supabaseAdmin;