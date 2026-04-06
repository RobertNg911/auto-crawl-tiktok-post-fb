import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';

const crawler = new Hono();

crawler.post('/crawl', async (c) => {
  const { url, campaign_id } = await c.req.json().catch(() => ({}));
  if (!url) return c.json({ error: 'URL is required' }, 400);
  const videoData = { url, campaign_id, status: 'pending', source_platform: 'youtube' };
  const { data: video, error } = await supabaseAdmin.from('videos').insert(videoData).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Video queued for crawling', video }, 201);
});

crawler.post('/download', async (c) => {
  const { video_id, url } = await c.req.json().catch(() => ({}));
  if (!video_id || !url) return c.json({ error: 'video_id and url are required' }, 400);
  return c.json({ message: 'Download queued', video_id, url });
});

export default crawler;