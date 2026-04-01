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

interface CreateCampaignRequest {
  name: string;
  source_url: string;
  topic?: string;
  target_page_id?: string;
  auto_post?: boolean;
  schedule_interval?: number;
  view_threshold?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      source_url,
      topic,
      target_page_id,
      auto_post = false,
      schedule_interval = 0,
      view_threshold = 0,
    }: CreateCampaignRequest = req.body;

    if (!name || !source_url) {
      return res.status(400).json({ error: 'Name and source_url are required' });
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name,
        source_url,
        topic,
        target_page_id,
        auto_post,
        schedule_interval,
        view_threshold,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(campaign);
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
