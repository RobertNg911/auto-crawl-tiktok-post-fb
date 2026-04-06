import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';
import jwt from 'jsonwebtoken';

const channels = new Hono();

function getUserId(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET) as any;
    return decoded.user_id;
  } catch { return null; }
}

channels.get('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { data: channels, error } = await supabaseAdmin.from('target_channels').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ channels });
});

channels.post('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { channel_id, username, display_name, topic } = await c.req.json().catch(() => ({}));
  if (!channel_id || !username) return c.json({ error: 'channel_id and username are required' }, 400);
  const { data: channel, error } = await supabaseAdmin.from('target_channels').insert({ channel_id, username, display_name, topic }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(channel, 201);
});

channels.delete('/:id', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { error } = await supabaseAdmin.from('target_channels').update({ is_deleted: true }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Channel deleted' });
});

export default channels;