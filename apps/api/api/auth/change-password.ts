import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
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

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { current_password, new_password }: ChangePasswordRequest = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      decoded.user_id,
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
