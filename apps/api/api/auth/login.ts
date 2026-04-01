import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface LoginRequest {
  username: string;
  password: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: username.includes('@') ? username : `${username}@autocrawl.local`,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || 'operator',
        display_name: profile?.display_name || data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
