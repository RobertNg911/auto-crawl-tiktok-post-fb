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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Campaign ID required' });
  }

  if (req.method === 'GET') {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { data: campaign, error } = await supabaseAdmin
        .from('campaigns')
        .select(`
          *,
          videos(*),
          target_channels(id, username, display_name)
        `)
        .eq('id', id)
        .single();

      if (error) return res.status(404).json({ error: 'Campaign not found' });

      return res.status(200).json(campaign);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const updates = req.body;
      delete updates.id;
      delete updates.created_at;

      const { data: campaign, error } = await supabaseAdmin
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json(campaign);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { error } = await supabaseAdmin
        .from('campaigns')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(204).send(null);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
