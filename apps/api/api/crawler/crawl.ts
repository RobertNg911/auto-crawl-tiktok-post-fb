import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CrawlRequest {
  campaign_id: string;
  source_url: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaign_id, source_url }: CrawlRequest = req.body;

    if (!campaign_id || !source_url) {
      return res.status(400).json({ error: 'campaign_id and source_url are required' });
    }

    // Determine platform and kind from URL
    const platformInfo = analyzeSourceUrl(source_url);

    // Call external crawler service (or TikWM API directly)
    const videos = await fetchVideosFromCrawler(source_url, platformInfo);

    // Insert videos into database
    let insertedCount = 0;
    for (const video of videos) {
      const { error } = await supabase
        .from('videos')
        .upsert({
          campaign_id,
          original_id: video.original_id,
          source_platform: platformInfo.platform,
          source_kind: platformInfo.kind,
          source_video_url: video.source_video_url,
          original_caption: video.title,
          thumbnail_url: video.thumbnail_url,
          status: 'pending',
        }, {
          onConflict: 'campaign_id,original_id',
          ignoreDuplicates: true,
        });

      if (!error) insertedCount++;
    }

    // Update campaign last_synced_at
    await supabase
      .from('campaigns')
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: 'completed',
      })
      .eq('id', campaign_id);

    return res.status(200).json({
      success: true,
      campaign_id,
      videos_found: videos.length,
      videos_inserted: insertedCount,
    });
  } catch (error: any) {
    console.error('Crawl error:', error);

    // Update campaign with error
    if (req.body.campaign_id) {
      await supabase
        .from('campaigns')
        .update({
          last_sync_status: 'failed',
          last_sync_error: error.message,
        })
        .eq('id', req.body.campaign_id);
    }

    return res.status(500).json({ error: error.message });
  }
}

function analyzeSourceUrl(url: string): { platform: string; kind: string } {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('tiktok.com')) {
    if (urlLower.includes('/video/') || urlLower.includes('/@')) {
      return { platform: 'tiktok', kind: 'video' };
    }
    return { platform: 'tiktok', kind: 'profile' };
  }

  if (urlLower.includes('youtube.com/shorts/') || urlLower.includes('youtu.be/')) {
    return { platform: 'youtube', kind: 'shorts' };
  }

  if (urlLower.includes('youtube.com') && urlLower.includes('/shorts/')) {
    return { platform: 'youtube', kind: 'shorts' };
  }

  return { platform: 'unknown', kind: 'video' };
}

async function fetchVideosFromCrawler(
  url: string,
  platformInfo: { platform: string; kind: string }
): Promise<any[]> {
  const urlLower = url.toLowerCase();

  // TikTok
  if (platformInfo.platform === 'tiktok') {
    return fetchTiktokVideos(url, platformInfo.kind);
  }

  // YouTube
  if (platformInfo.platform === 'youtube') {
    return fetchYoutubeShorts(url);
  }

  return [];
}

async function fetchTiktokVideos(url: string, kind: string): Promise<any[]> {
  try {
    // Use TikWM API
    const apiUrl = 'https://www.tikwm.com/api/';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(url)}&count=20&cursor=0&web=1&hd=1`,
    });

    const data = await response.json();

    if (data.code === 0 && data.data) {
      if (kind === 'video') {
        const video = data.data;
        return [{
          original_id: video.id || url,
          source_video_url: video.play || video.hdplay || '',
          title: video.title || '',
          thumbnail_url: video.cover || '',
        }];
      } else if (data.data.videos) {
        return data.data.videos.map((v: any) => ({
          original_id: v.video_id,
          source_video_url: v.play || v.hdplay || '',
          title: v.title || v.description || '',
          thumbnail_url: v.cover || '',
        }));
      }
    }

    return [];
  } catch (error) {
    console.error('TikTok API error:', error);
    return [];
  }
}

async function fetchYoutubeShorts(url: string): Promise<any[]> {
  try {
    // Extract video ID
    const patterns = [
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    ];

    let videoId: string | null = null;
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) return [];

    // Use Invidious API
    const response = await fetch(
      `https://invidious.snopyta.org/api/v1/videos/${videoId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    const data = await response.json();

    if (data && data.videoId) {
      const videoUrl = data.adaptiveFormats
        ?.filter((f: any) => f.type.startsWith('video') && f.quality === '1080p')
        ?.map((f: any) => f.url)
        ?.shift() || data.formats
        ?.filter((f: any) => f.type.startsWith('video'))
        ?.map((f: any) => f.url)
        ?.shift() || '';

      return [{
        original_id: data.videoId,
        source_video_url: videoUrl,
        title: data.title || '',
        thumbnail_url: data.thumbnailThumbnails?.[0]?.url || data.thumbnail || '',
      }];
    }

    return [];
  } catch (error) {
    console.error('YouTube API error:', error);
    return [];
  }
}
