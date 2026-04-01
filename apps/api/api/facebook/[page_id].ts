import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { page_id } = req.query;

  if (!page_id || typeof page_id !== 'string') {
    return res.status(400).json({ error: 'Page ID required' });
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin
        .from('facebook_pages')
        .update({ is_deleted: true })
        .eq('id', page_id);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(204).send(null);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updates = req.body;
      delete updates.id;
      delete updates.created_at;

      const { data: page, error } = await supabaseAdmin
        .from('facebook_pages')
        .update(updates)
        .eq('id', page_id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json(page);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
