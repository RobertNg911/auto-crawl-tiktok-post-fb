import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';
import jwt from 'jsonwebtoken';

type Variables = { user_id?: string };

const campaigns = new Hono<{ Variables: Variables }>();

function verifyToken(authHeader: string | null | undefined): { user_id?: string; error?: string } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { error: 'No token provided' };
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    return { user_id: decoded.user_id };
  } catch { return { error: 'Invalid token' }; }
}

function getUserId(authHeader: string | null | undefined): string | null {
  const result = verifyToken(authHeader);
  return result.user_id || null;
}

campaigns.get('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { topic, status, source_platform, page = '1', limit = '20' } = c.req.query();
  let query = supabaseAdmin.from('campaigns').select('*', { count: 'exact' }).eq('is_deleted', false).order('created_at', { ascending: false }).range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
  if (topic) query = query.eq('topic', topic);
  if (status) query = query.eq('status', status);
  if (source_platform) query = query.eq('source_platform', source_platform);
  const { data: campaigns, error, count } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ campaigns, total: count || 0, page: Number(page), limit: Number(limit) });
});

campaigns.get('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { data: campaign, error } = await supabaseAdmin.from('campaigns').select('*, videos(*)').eq('id', id).single();
  if (error) return c.json({ error: 'Campaign not found' }, 404);
  return c.json(campaign);
});

campaigns.post('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { name, source_url, topic, target_page_id, auto_post = false, schedule_interval = 0, view_threshold = 0 } = await c.req.json().catch(() => ({}));
  if (!name || !source_url) return c.json({ error: 'Name and source_url are required' }, 400);
  const { data: campaign, error } = await supabaseAdmin.from('campaigns').insert({ name, source_url, topic, target_page_id, auto_post, schedule_interval, view_threshold, created_by: userId }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(campaign, 201);
});

campaigns.patch('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const updates = await c.req.json().catch(() => ({}));
  const { data: campaign, error } = await supabaseAdmin.from('campaigns').update(updates).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(campaign);
});

campaigns.delete('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { error } = await supabaseAdmin.from('campaigns').update({ is_deleted: true }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Campaign deleted' });
});

export default campaigns;