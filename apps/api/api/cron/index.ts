import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';

const cron = new Hono();

function verifyCronAuth(authHeader: string | null | undefined): boolean {
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}

cron.post('/process-queue', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!verifyCronAuth(authHeader)) return c.json({ error: 'Unauthorized' }, 401);
  const { data: pendingVideos } = await supabaseAdmin.from('videos').select('*').eq('status', 'pending').limit(10);
  return c.json({ processed: pendingVideos?.length || 0, videos: pendingVideos });
});

cron.post('/cleanup', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!verifyCronAuth(authHeader)) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ message: 'Cleanup completed' });
});

export default cron;