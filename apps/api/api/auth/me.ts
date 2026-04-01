import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(decoded.user_id);

    if (error || !user.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.user.id)
      .single();

    return res.status(200).json({
      id: user.user.id,
      email: user.user.email,
      role: profile?.role || 'operator',
      display_name: profile?.display_name || user.user.email,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
