import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabaseAdmin, env } from '../../lib/env';
import jwt from 'jsonwebtoken';

type Variables = { user_id?: string };

const auth = new Hono<{ Variables: Variables }>();

auth.use('/*', cors());

function verifyToken(authHeader: string | null | undefined): { user_id?: string; error?: string } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided' };
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    return { user_id: decoded.user_id };
  } catch {
    return { error: 'Invalid token' };
  }
}

auth.post('/login', async (c) => {
  const contentType = c.req.header('content-type') || '';
  const rawBody = await c.req.text();
  
  let username = '', password = '';
  
  if (contentType.includes('application/json')) {
    try {
      const body = JSON.parse(rawBody);
      username = body?.username || '';
      password = body?.password || '';
    } catch {
      username = '';
      password = '';
    }
  } else {
    const body = await c.req.parseBody();
    username = body.username as string;
    password = body.password as string;
  }
  
  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }
  
  const email = username.includes('@') ? username : `${username}@autocrawl.local`;
  
  // Use direct fetch to avoid supabase-js issues
  const response = await fetch('https://lqzvltnwbkthjyzjztdd.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxenZsdG53Ymt0aGp5emp6dGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2MDUzMCwiZXhwIjoyMDkwNjM2NTMwfQ.oZLm7o9cM3FoNgSzALIyIxH-aHQKFTp-513pzm5WSIM'
    },
    body: JSON.stringify({ email, password })
  });
  
  const authResult = await response.json() as {
    error?: string;
    user?: { id: string; email: string };
    refresh_token?: string;
  };
  
  if (!response.ok || authResult.error || !authResult.user) {
    return c.json({ error: 'Invalid login credentials', detail: authResult }, 401);
  }
  
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', authResult.user.id)
    .single();
    
  const token = jwt.sign(
    { user_id: authResult.user.id, email: authResult.user.email, role: profile?.role || 'operator' },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return c.json({
    user: { id: authResult.user.id, email: authResult.user.email, role: profile?.role || 'operator', display_name: profile?.display_name || authResult.user.email },
    session: { access_token: token, refresh_token: authResult.refresh_token, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 },
  });
});

auth.get('/me', async (c) => {
  const authResult = verifyToken(c.req.header('authorization'));
  if (authResult.error) return c.json({ error: authResult.error }, 401);
  const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(authResult.user_id!);
  if (error || !user.user) return c.json({ error: 'User not found' }, 401);
  const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('id', user.user.id).single();
  return c.json({ id: user.user.id, email: user.user.email, role: profile?.role || 'operator', display_name: profile?.display_name || user.user.email });
});

auth.post('/change-password', async (c) => {
  const authResult = verifyToken(c.req.header('authorization'));
  if (authResult.error) return c.json({ error: authResult.error }, 401);
  const { current_password, new_password } = await c.req.json().catch(() => ({}));
  if (!current_password || !new_password) return c.json({ error: 'Current and new password are required' }, 400);
  if (new_password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400);
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authResult.user_id!, { password: new_password });
  if (updateError) return c.json({ error: updateError.message }, 400);
  return c.json({ message: 'Password changed successfully' });
});

export default auth;