import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';
import jwt from 'jsonwebtoken';

const dashboard = new Hono();

function getUserId(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try { return jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET) as any; } catch { return null; }
}

dashboard.get('/', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const [campaigns, videos, pages] = await Promise.all([
      supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabaseAdmin.from('videos').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabaseAdmin.from('facebook_pages').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    ]);
    return c.json({
      total_campaigns: campaigns.count || 0,
      total_videos: videos.count || 0,
      total_pages: pages.count || 0,
      pending_videos: 0,
      published_videos: 0,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default dashboard;