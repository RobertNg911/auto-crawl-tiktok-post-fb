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
  const { 
    name, source_url, topic, target_page_id, 
    auto_post = false, schedule_interval = 0, view_threshold = 0,
    upload_delay = 0, ai_caption_enabled = false, ai_hashtag_enabled = true 
  } = await c.req.json().catch(() => ({}));
  if (!name || !source_url) return c.json({ error: 'Name and source_url are required' }, 400);
  const { data: campaign, error } = await supabaseAdmin.from('campaigns').insert({ 
    name, source_url, topic, target_page_id, 
    auto_post, schedule_interval, view_threshold,
    upload_delay, ai_caption_enabled, ai_hashtag_enabled 
  }).select().single();
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

campaigns.post('/:id/sync', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  
  const { data: campaign, error: campError } = await supabaseAdmin.from('campaigns').select('*').eq('id', id).single();
  if (campError || !campaign) return c.json({ error: 'Campaign not found' }, 404);
  
  // Just return success - actual sync happens via cron
  return c.json({ 
    status: 'queued',
    message: 'Sync started in background',
    campaign_id: id
  });
});

campaigns.post('/:id/sync-now', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  
  const { data: campaign, error: campError } = await supabaseAdmin.from('campaigns').select('*').eq('id', id).single();
  if (campError || !campaign) return c.json({ error: 'Campaign not found' }, 404);
  
  let videosFound = 0;
  
  // Always add demo videos for now
  const demoVideos = [
    { id: `demo_${Date.now()}_1`, title: 'Video Test 1', views: 15000 },
    { id: `demo_${Date.now()}_2`, title: 'Video Test 2', views: 50000 },
    { id: `demo_${Date.now()}_3`, title: 'Video Test 3', views: 100000 },
  ];
  
  for (const item of demoVideos) {
    if (item.views < (campaign.view_threshold || 0)) continue;
    await supabaseAdmin.from('videos').insert({
      campaign_id: id,
      original_id: item.id,
      title: item.title,
      views: item.views,
      status: 'ready',
      source_platform: campaign.source_platform,
    });
    videosFound++;
  }
  
  await supabaseAdmin.from('campaigns').update({ 
    last_synced_at: new Date().toISOString(),
    last_sync_status: 'idle'
  }).eq('id', id);
  
  return c.json({ 
    status: 'success',
    message: `Added ${videosFound} demo videos`,
    videos_found: videosFound
  });
});

campaigns.post('/:id/pause', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { error } = await supabaseAdmin.from('campaigns').update({ status: 'paused' }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Campaign paused' });
});

campaigns.post('/:id/resume', async (c) => {
  const userId = getUserId(c.req.header('authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { error } = await supabaseAdmin.from('campaigns').update({ status: 'active' }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Campaign resumed' });
});

export default campaigns;