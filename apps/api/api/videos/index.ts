import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';
import jwt from 'jsonwebtoken';

const videos = new Hono();

function getUserId(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try { return jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET) as any; } catch { return null; }
}

videos.get('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { campaign_id, status, page = '1', limit = '20' } = c.req.query();
  let query = supabaseAdmin.from('videos').select('*', { count: 'exact' }).eq('is_deleted', false).order('created_at', { ascending: false }).range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
  if (campaign_id) query = query.eq('campaign_id', campaign_id);
  if (status) query = query.eq('status', status);
  const { data: videos, error, count } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ videos, total: count || 0, page: Number(page), limit: Number(limit) });
});

videos.get('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { data: video, error } = await supabaseAdmin.from('videos').select('*, campaign:campaigns(*)').eq('id', id).single();
  if (error) return c.json({ error: 'Video not found' }, 404);
  return c.json(video);
});

videos.patch('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const updates = await c.req.json().catch(() => ({}));
  const { data: video, error } = await supabaseAdmin.from('videos').update(updates).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(video);
});

videos.delete('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { error } = await supabaseAdmin.from('videos').update({ is_deleted: true }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Video deleted' });
});

export default videos;