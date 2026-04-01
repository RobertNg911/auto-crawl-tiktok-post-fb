import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function verifyAdmin(token: string): { user_id: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!verifyAdmin(authHeader.split(' ')[1])) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const userList = await Promise.all(
      users.users.map(async (user) => {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        return {
          id: user.id,
          email: user.email,
          role: profile?.role || 'operator',
          display_name: profile?.display_name || user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        };
      })
    );

    return res.status(200).json(userList);
  } catch (error: any) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
