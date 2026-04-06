import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';
import jwt from 'jsonwebtoken';

type Variables = { user_id?: string };

const users = new Hono<{ Variables: Variables }>();

function verifyAdmin(token: string): { user_id: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
}

function verifyAdminAuth(authHeader: string | null | undefined): { user_id: string; role: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyAdmin(authHeader.split(' ')[1]);
}

users.get('/', async (c) => {
  const admin = verifyAdminAuth(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'Admin access required' }, 403);
  const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return c.json({ error: error.message }, 500);
  const userList = await Promise.all(authUsers.users.map(async (user) => {
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('id', user.id).single();
    return { id: user.id, email: user.email, role: profile?.role || 'operator', display_name: profile?.display_name || user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at };
  }));
  return c.json(userList);
});

users.post('/', async (c) => {
  const admin = verifyAdminAuth(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'Admin access required' }, 403);
  const { email, password, role = 'operator', display_name } = await c.req.json().catch(() => ({}));
  if (!email || !password) return c.json({ error: 'Email and password are required' }, 400);
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) return c.json({ error: authError.message }, 400);
  await supabaseAdmin.from('user_profiles').insert({ id: authUser.user.id, role, display_name: display_name || email.split('@')[0] });
  return c.json({ id: authUser.user.id, email: authUser.user.email, role, display_name: display_name || email.split('@')[0] }, 201);
});

export default users;