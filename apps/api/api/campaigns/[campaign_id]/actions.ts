import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function getUserId(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
    return decoded.user_id;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { campaign_id } = req.query;

  if (!campaign_id || typeof campaign_id !== 'string') {
    return res.status(400).json({ error: 'Campaign ID required' });
  }

  if (req.method === 'POST') {
    const action = req.query.action;

    if (action === 'sync') {
      return handleSync(req, res, campaign_id);
    }
    if (action === 'pause') {
      return handlePause(req, res, campaign_id);
    }
    if (action === 'resume') {
      return handleResume(req, res, campaign_id);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSync(req: VercelRequest, res: VercelResponse, campaignId: string) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        last_sync_status: 'syncing',
        last_sync_error: null,
      })
      .eq('id', campaignId);

    if (updateError) return res.status(500).json({ error: updateError.message });

    const { data: task, error: taskError } = await supabaseAdmin
      .from('task_queue')
      .insert({
        task_type: 'sync_campaign',
        entity_type: 'campaign',
        entity_id: campaignId,
        payload: { triggered_by: userId },
        status: 'queued',
        priority: 5,
      })
      .select()
      .single();

    if (taskError) return res.status(500).json({ error: taskError.message });

    return res.status(200).json({
      message: 'Sync task queued',
      task_id: task.id,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handlePause(req: VercelRequest, res: VercelResponse, campaignId: string) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(campaign);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleResume(req: VercelRequest, res: VercelResponse, campaignId: string) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(campaign);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
