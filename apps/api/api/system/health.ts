import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: runtimeSettings } = await supabaseAdmin
      .from('runtime_settings')
      .select('*');

    const settings: Record<string, any> = {};
    runtimeSettings?.forEach((s: any) => {
      settings[s.key] = s.is_secret ? '***' : s.value;
    });

    const dbHealthy = await checkDatabaseHealth();
    const storageHealthy = settings.SUPABASE_URL ? true : false;

    return res.status(200).json({
      status: dbHealthy && storageHealthy ? 'healthy' : 'degraded',
      services: {
        database: dbHealthy ? 'up' : 'down',
        storage: storageHealthy ? 'up' : 'down',
        api: 'up',
      },
      settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('campaigns').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
