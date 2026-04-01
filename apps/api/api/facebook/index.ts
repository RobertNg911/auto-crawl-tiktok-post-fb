import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';
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
  if (req.method === 'GET') {
    return handleList(req, res);
  }
  if (req.method === 'POST') {
    return handleCreate(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleList(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: pages, error } = await supabaseAdmin
      .from('facebook_pages')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(pages);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

interface CreateFacebookPageRequest {
  page_id: string;
  page_name: string;
  access_token: string;
  auto_post?: boolean;
  auto_comment?: boolean;
  auto_inbox?: boolean;
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      page_id,
      page_name,
      access_token,
      auto_post = true,
      auto_comment = false,
      auto_inbox = false,
    }: CreateFacebookPageRequest = req.body;

    if (!page_id || !page_name || !access_token) {
      return res.status(400).json({ error: 'page_id, page_name, and access_token are required' });
    }

    const { data: page, error } = await supabaseAdmin
      .from('facebook_pages')
      .insert({
        page_id,
        page_name,
        long_lived_access_token: access_token,
        auto_post,
        auto_comment,
        auto_inbox,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Page already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(page);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
