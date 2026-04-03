import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'autocrawl-jwt-secret-change-in-production';

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

  if (req.method === 'POST') {
    if (req.url?.includes('change-password')) {
      return handleChangePassword(req, res);
    }
    return handleLogin(req, res);
  }

  if (req.method === 'GET') {
    return handleMe(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const email = username.includes('@') ? username : `${username}@autocrawl.local`;

    // Verify password using Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Generate custom JWT
    const token = jwt.sign(
      {
        user_id: authData.user.id,
        email: authData.user.email,
        role: profile?.role || 'operator',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile?.role || 'operator',
        display_name: profile?.display_name || authData.user.email,
      },
      session: {
        access_token: token,
        refresh_token: authData.session.refresh_token,
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleMe(req: VercelRequest, res: VercelResponse) {
  try {
    const authResult = verifyToken(req.headers.authorization);
    if (authResult.error) {
      return res.status(401).json({ error: authResult.error });
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(authResult.user_id!);

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

async function handleChangePassword(req: VercelRequest, res: VercelResponse) {
  try {
    const authResult = verifyToken(req.headers.authorization);
    if (authResult.error) {
      return res.status(401).json({ error: authResult.error });
    }

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authResult.user_id!,
      { password: new_password }
    );

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
