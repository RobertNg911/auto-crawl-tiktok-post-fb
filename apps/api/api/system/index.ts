import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const path = req.url || '';
  
  if (path.includes('tasks')) {
    return handleTasks(req, res);
  }
  
  return handleHealth(req, res);
}

async function handleHealth(req: VercelRequest, res: VercelResponse) {
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

async function handleTasks(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: tasks, error } = await supabaseAdmin
      .from('task_queue')
      .select('*')
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });

    const { data: workers } = await supabaseAdmin
      .from('worker_heartbeats')
      .select('*')
      .gte('last_seen_at', new Date(Date.now() - 60000).toISOString());

    return res.status(200).json({
      tasks,
      workers,
      summary: {
        queued: tasks?.filter(t => t.status === 'queued').length || 0,
        processing: tasks?.filter(t => t.status === 'processing').length || 0,
        active_workers: workers?.length || 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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
