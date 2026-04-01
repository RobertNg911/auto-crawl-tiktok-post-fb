import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const health: Record<string, any> = {
      timestamp: new Date().toISOString(),
      services: {},
    };

    // Check database
    try {
      const { error: dbError } = await supabase.from('campaigns').select('id').limit(1);
      health.services.database = dbError ? 'down' : 'up';
    } catch {
      health.services.database = 'down';
    }

    // Check queue
    try {
      const { count } = await supabase
        .from('task_queue')
        .select('*', { count: 'exact', head: true })
        .in('status', ['queued', 'processing']);
      health.services.queue = {
        status: 'up',
        pending_tasks: count || 0,
      };
    } catch {
      health.services.queue = 'down';
    }

    // Check workers (heartbeats)
    try {
      const { data: workers } = await supabase
        .from('worker_heartbeats')
        .select('worker_name, last_seen_at')
        .gte('last_seen_at', new Date(Date.now() - 60000).toISOString());

      health.services.workers = {
        status: 'up',
        active: workers?.length || 0,
      };
    } catch {
      health.services.workers = 'up'; // Vercel doesn't need workers
    }

    // Check storage
    try {
      const { error: storageError } = await supabase.storage.listBuckets();
      health.services.storage = storageError ? 'down' : 'up';
    } catch {
      health.services.storage = 'down';
    }

    // Overall status
    const allUp = Object.values(health.services).every(
      (s) => typeof s === 'string' ? s === 'up' : s.status === 'up'
    );
    health.status = allUp ? 'healthy' : 'degraded';

    return res.status(200).json(health);
  } catch (error: any) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
