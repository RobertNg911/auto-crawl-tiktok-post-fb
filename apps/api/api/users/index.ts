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

function verifyAdminAuth(authHeader: string | null | undefined): { user_id: string; role: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyAdmin(authHeader.split(' ')[1]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method === 'GET') {
    return handleListUsers(req, res);
  }

  if (req.method === 'POST') {
    return handleCreateUser(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleListUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const admin = verifyAdminAuth(req.headers.authorization);
    if (!admin) {
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

interface CreateUserRequest {
  email: string;
  password: string;
  role?: string;
  display_name?: string;
}

async function handleCreateUser(req: VercelRequest, res: VercelResponse) {
  try {
    const admin = verifyAdminAuth(req.headers.authorization);
    if (!admin) {
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
