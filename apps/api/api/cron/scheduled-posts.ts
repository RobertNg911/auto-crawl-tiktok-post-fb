import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    // Find videos ready to publish (scheduled_at <= now)
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('status', 'ready')
      .lte('publish_time', now.toISOString())
      .eq('is_deleted', false)
      .limit(10);

    if (error) throw error;

    const published: string[] = [];
    const failed: string[] = [];

    for (const video of videos || []) {
      try {
        // Get campaign to find target page
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('target_page_id')
          .eq('id', video.campaign_id)
          .single();

        if (!campaign?.target_page_id) {
          failed.push(video.id);
          continue;
        }

        // Get page info
        const { data: page } = await supabase
          .from('facebook_pages')
          .select('*')
          .eq('page_id', campaign.target_page_id)
          .single();

        if (!page) {
          failed.push(video.id);
          continue;
        }

        // Create publish task
        await supabase
          .from('task_queue')
          .insert({
            task_type: 'publish_video',
            entity_type: 'video',
            entity_id: video.id,
            payload: { scheduled: true },
            status: 'queued',
            priority: 1,
          });

        // Update video status
        await supabase
          .from('videos')
          .update({ status: 'publishing' })
          .eq('id', video.id);

        published.push(video.id);
      } catch (err: any) {
        console.error(`Error scheduling video ${video.id}:`, err);
        failed.push(video.id);
      }
    }

    return res.status(200).json({
      scheduled: published.length,
      failed: failed.length,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Scheduler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
