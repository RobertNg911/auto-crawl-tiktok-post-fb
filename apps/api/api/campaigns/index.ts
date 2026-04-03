import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function verifyToken(authHeader: string | null | undefined): { user_id?: string; error?: string } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided' };
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { user_id: decoded.user_id };
  } catch {
    return { error: 'Invalid token' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    if (id && typeof id === 'string') {
      return handleGetCampaign(req, res, id);
    }
    return handleListCampaigns(req, res);
  }

  if (req.method === 'POST') {
    return handleCreateCampaign(req, res);
  }

  if (req.method === 'PATCH' && id) {
    return handleUpdateCampaign(req, res, id as string);
  }

  if (req.method === 'DELETE' && id) {
    return handleDeleteCampaign(req, res, id as string);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleListCampaigns(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic, status, source_platform, page = 1, limit = 20 } = req.query;

    let query = supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact' })
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

async function handleGetCampaign(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, videos(*)')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Campaign not found' });

    return res.status(200).json(campaign);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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

async function handleCreateCampaign(req: VercelRequest, res: VercelResponse) {
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

async function handleUpdateCampaign(req: VercelRequest, res: VercelResponse, id: string) {
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

async function handleDeleteCampaign(req: VercelRequest, res: VercelResponse, id: string) {
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
