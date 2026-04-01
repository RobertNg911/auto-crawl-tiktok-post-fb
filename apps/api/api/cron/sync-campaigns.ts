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
    const processed: string[] = [];
    const failed: string[] = [];

    // Find active campaigns that need syncing
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .eq('is_deleted', false);

    for (const campaign of campaigns || []) {
      try {
        // Check if last sync was more than 1 hour ago
        const lastSync = campaign.last_synced_at ? new Date(campaign.last_synced_at) : null;
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (!lastSync || lastSync < hourAgo) {
          // Check if there's already a sync task in queue
          const { data: existingTask } = await supabase
            .from('task_queue')
            .select('id')
            .eq('task_type', 'sync_campaign')
            .eq('entity_id', campaign.id)
            .in('status', ['queued', 'processing'])
            .single();

          if (!existingTask) {
            // Create sync task
            await supabase
              .from('task_queue')
              .insert({
                task_type: 'sync_campaign',
                entity_type: 'campaign',
                entity_id: campaign.id,
                payload: { auto: true },
                status: 'queued',
                priority: 5,
              });

            processed.push(campaign.id);
          }
        }
      } catch (err: any) {
        console.error(`Error syncing campaign ${campaign.id}:`, err);
        failed.push(campaign.id);
      }
    }

    return res.status(200).json({
      campaigns_synced: processed.length,
      failed: failed.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Campaign sync cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}
