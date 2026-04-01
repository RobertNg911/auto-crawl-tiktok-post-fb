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

interface CreateUserRequest {
  email: string;
  password: string;
  role?: string;
  display_name?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    const { email, password, role = 'operator', display_name }: CreateUserRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
      id: authUser.user.id,
      role,
      display_name: display_name || email.split('@')[0],
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return res.status(201).json({
      id: authUser.user.id,
      email: authUser.user.email,
      role,
      display_name: display_name || email.split('@')[0],
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
