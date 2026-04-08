import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';
import jwt from 'jsonwebtoken';

const facebook = new Hono();

function getUserId(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try { return jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET) as any; } catch { return null; }
}

facebook.get('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { data: pages, error } = await supabaseAdmin.from('facebook_pages').select('id, page_id, page_name, auto_post, auto_comment, auto_inbox, created_at').eq('is_deleted', false).order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ pages });
});

facebook.post('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { page_id, page_name, access_token } = await c.req.json().catch(() => ({}));
  if (!page_id || !page_name) return c.json({ error: 'page_id and page_name are required' }, 400);
  const { data: page, error } = await supabaseAdmin.from('facebook_pages').insert({ page_id, page_name, long_lived_access_token: access_token }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(page, 201);
});

facebook.patch('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const updates = await c.req.json().catch(() => ({}));
  const { data: page, error } = await supabaseAdmin.from('facebook_pages').update(updates).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(page);
});

facebook.delete('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { error } = await supabaseAdmin.from('facebook_pages').update({ is_deleted: true }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Page deleted' });
});

export default facebook;