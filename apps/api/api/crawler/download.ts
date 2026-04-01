import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/tmp/downloads';

interface DownloadRequest {
  video_id: string;
  source_url: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { video_id, source_url }: DownloadRequest = req.body;

    if (!video_id || !source_url) {
      return res.status(400).json({ error: 'video_id and source_url are required' });
    }

    // Update video status to downloading
    await supabase
      .from('videos')
      .update({ status: 'downloading' })
      .eq('id', video_id);

    // Download video
    const filePath = await downloadVideo(video_id, source_url);

    // Upload to Supabase Storage
    const storageUrl = await uploadToStorage(video_id, filePath);

    // Update video with file path
    await supabase
      .from('videos')
      .update({
        file_path: storageUrl,
        status: 'ready',
      })
      .eq('id', video_id);

    return res.status(200).json({
      success: true,
      video_id,
      file_path: storageUrl,
    });
  } catch (error: any) {
    console.error('Download error:', error);

    if (req.body.video_id) {
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          last_error: error.message,
        })
        .eq('id', req.body.video_id);
    }

    return res.status(500).json({ error: error.message });
  }
}

async function downloadVideo(videoId: string, sourceUrl: string): Promise<string> {
  // Ensure download directory exists
  const dir = join(DOWNLOAD_DIR, videoId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filePath = join(dir, 'video.mp4');

  // For TikTok/YouTube, we already have direct URLs from crawler
  // Download directly
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const writable = createWriteStream(filePath);
  await pipeline(response.body!, writable);

  return filePath;
}

async function uploadToStorage(videoId: string, filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(`${videoId}/video.mp4`, filePath, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(`${videoId}/video.mp4`);

  return urlData.publicUrl;
}
