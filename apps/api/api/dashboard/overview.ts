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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: overview, error } = await supabaseAdmin
      .rpc('get_dashboard_overview');

    if (error) {
      const [campaigns, videos, pages] = await Promise.all([
        supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabaseAdmin.from('videos').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabaseAdmin.from('facebook_pages').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      ]);

      const { data: stats } = await supabaseAdmin
        .from('videos')
        .select('status')
        .eq('is_deleted', false);

      const statusCounts = stats?.reduce((acc: any, v: any) => {
        acc[v.status] = (acc[v.status] || 0) + 1;
        return acc;
      }, {});

      return res.status(200).json({
        total_campaigns: campaigns.count || 0,
        total_videos: videos.count || 0,
        total_pages: pages.count || 0,
        videos_by_status: statusCounts || {},
      });
    }

    return res.status(200).json(overview);
  } catch (error: any) {
    console.error('Dashboard overview error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
