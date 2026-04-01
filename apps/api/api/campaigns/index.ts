import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic, status, source_platform, page = 1, limit = 20 } = req.query;

    let query = supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        videos(count),
        target_channels(id, username, display_name)
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (topic) query = query.eq('topic', topic);
    if (status) query = query.eq('status', status);
    if (source_platform) query = query.eq('source_platform', source_platform);

    const { data: campaigns, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      campaigns,
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error: any) {
    console.error('List campaigns error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
