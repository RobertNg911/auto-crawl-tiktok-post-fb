/**
 * Crawler Service - External Service Pattern
 * 
 * Since yt-dlp cannot run in Vercel/Supabase Edge Functions (no subprocess, Python not available),
 * this service should be deployed to AWS Lambda, Railway, or similar.
 * 
 * This file contains the crawler logic that can be deployed separately.
 */

export interface CrawlerConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export interface CrawlRequest {
  campaign_id: string;
  source_url: string;
  source_platform: 'tiktok' | 'youtube';
  source_kind: 'video' | 'profile' | 'shorts';
  view_threshold?: number;
}

export interface VideoEntry {
  original_id: string;
  source_video_url: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  create_time?: string;
}

/**
 * Extract video metadata from TikTok URL
 * Uses unofficial TikTok API or web scraping
 */
export async function crawlTiktokVideo(url: string): Promise<VideoEntry | null> {
  try {
    // Option 1: Use TikWM API (unofficial TikTok API)
    const apiUrl = `https://www.tikwm.com/api/`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(url)}&count=12&cursor=0&web=1&hd=1`,
    });
    
    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      const video = data.data;
      return {
        original_id: video.id || url,
        source_video_url: video.play || video.wmplay || video.hdplay || '',
        title: video.title || '',
        description: video.title || '',
        thumbnail_url: video.cover || video.thumbnail || '',
        duration: video.duration || 0,
        view_count: video.play_count || 0,
        like_count: video.digg_count || 0,
        comment_count: video.comment_count || 0,
        share_count: video.share_count || 0,
        create_time: new Date((video.create_time || 0) * 1000).toISOString(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('TikTok crawl error:', error);
    return null;
  }
}

/**
 * Extract videos from TikTok profile
 */
export async function crawlTiktokProfile(username: string, limit: number = 20): Promise<VideoEntry[]> {
  try {
    const response = await fetch(`https://www.tikwm.com/api/user/posts?unique_id=${username}&count=${limit}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const data = await response.json();
    
    if (data.code === 0 && data.data?.videos) {
      return data.data.videos.map((video: any) => ({
        original_id: video.video_id,
        source_video_url: video.play || video.hdplay || '',
        title: video.title || '',
        description: video.description || '',
        thumbnail_url: video.cover || '',
        duration: video.duration || 0,
        view_count: video.play_count || 0,
        like_count: video.digg_count || 0,
        comment_count: video.comment_count || 0,
        share_count: video.share_count || 0,
        create_time: new Date((video.create_time || 0) * 1000).toISOString(),
      }));
    }
    
    return [];
  } catch (error) {
    console.error('TikTok profile crawl error:', error);
    return [];
  }
}

/**
 * Crawl YouTube Shorts
 */
export async function crawlYoutubeShorts(url: string): Promise<VideoEntry | null> {
  try {
    // Extract video ID from URL
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) return null;
    
    // Use Invidious API (privacy-friendly YouTube frontend)
    const response = await fetch(`https://invidious.snopyta.org/api/v1/videos/${videoId}`);
    const data = await response.json();
    
    if (data && data.videoId) {
      return {
        original_id: data.videoId,
        source_video_url: data.adaptiveFormats?.find((f: any) => f.type.startsWith('video'))?.url || '',
        title: data.title || '',
        description: data.description || '',
        thumbnail_url: data.thumbnailThumbnails?.[0]?.url || data.thumbnail || '',
        duration: data.lengthSeconds || 0,
        view_count: data.viewCount || 0,
        like_count: data.likeCount || 0,
        comment_count: data.subCountText ? parseInt(data.subCountText) : 0,
        create_time: data.publishedText || '',
      };
    }
    
    return null;
  } catch (error) {
    console.error('YouTube crawl error:', error);
    return null;
  }
}

function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Main crawl function based on source type
 */
export async function crawlContent(request: CrawlRequest): Promise<VideoEntry[]> {
  const { source_url, source_platform, source_kind, view_threshold = 0 } = request;
  
  let videos: VideoEntry[] = [];
  
  if (source_platform === 'tiktok') {
    if (source_kind === 'video') {
      const video = await crawlTiktokVideo(source_url);
      if (video) videos = [video];
    } else if (source_kind === 'profile') {
      const username = extractTiktokUsername(source_url);
      if (username) {
        videos = await crawlTiktokProfile(username);
      }
    }
  } else if (source_platform === 'youtube') {
    if (source_kind === 'shorts') {
      const video = await crawlYoutubeShorts(source_url);
      if (video) videos = [video];
    }
  }
  
  // Filter by view threshold
  if (view_threshold > 0) {
    videos = videos.filter(v => (v.view_count || 0) >= view_threshold);
  }
  
  return videos;
}

function extractTiktokUsername(url: string): string | null {
  const match = url.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/);
  return match ? match[1] : null;
}
