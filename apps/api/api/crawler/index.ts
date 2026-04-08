import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';

const crawler = new Hono();

async function crawlTikTokProfile(username: string, campaignId: string) {
  const results = [];
  
  try {
    const response = await fetch(`https://www.tiktok.com/api/item/list/?WebId&uniqueId=${username}&verifyId&category=`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const data = await response.json();
    const items = data?.data?.itemList || [];
    
    for (const item of items) {
      const video = {
        campaign_id: campaignId,
        original_id: item.id,
        title: item.desc?.substring(0, 100) || 'Untitled',
        original_caption: item.desc,
        thumbnail_url: item.video?.coverImageUrl || item.video?.shareCover,
        source_video_url: item.video?.downloadAddr,
        views: item.stats?.playCount || 0,
        likes: item.stats?.diggCount || 0,
        comments_count: item.stats?.commentCount || 0,
        status: 'ready',
        source_platform: 'tiktok',
      };
      
      const { data: newVideo, error } = await supabaseAdmin.from('videos').insert(video).select().single();
      if (!error && newVideo) {
        results.push(newVideo);
      }
    }
  } catch (err) {
    console.error('TikTok crawl error:', err);
  }
  
  return results;
}

async function crawlYouTubeChannel(channelUrl: string, campaignId: string) {
  const results = [];
  // YouTube scraping requires more complex setup
  // Return empty for now
  return results;
}

crawler.post('/crawl', async (c) => {
  const { url, campaign_id } = await c.req.json().catch(() => ({}));
  if (!url || !campaign_id) return c.json({ error: 'URL and campaign_id are required' }, 400);
  
  const { data: campaign, error: campError } = await supabaseAdmin.from('campaigns').select('*').eq('id', campaign_id).single();
  if (campError) return c.json({ error: 'Campaign not found' }, 404);
  
  let videos: any[] = [];
  const username = campaign.source_url?.match(/@(\w+)/)?.[1];
  
  if (campaign.source_platform === 'tiktok' && username) {
    videos = await crawlTikTok(username, campaign_id);
  } else if (campaign.source_platform === 'youtube') {
    videos = await crawlYouTube(campaign.source_url, campaign_id);
  }
  
  return c.json({ 
    message: `Found ${videos.length} videos`, 
    videos 
  }, 200);
});

crawler.post('/download', async (c) => {
  const { video_id } = await c.req.json().catch(() => ({}));
  if (!video_id) return c.json({ error: 'video_id is required' }, 400);
  
  const { data: video, error } = await supabaseAdmin.from('videos').select('*').eq('id', video_id).single();
  if (error || !video) return c.json({ error: 'Video not found' }, 404);
  
  return c.json({ message: 'Download queued', video_id });
});

export default crawler;