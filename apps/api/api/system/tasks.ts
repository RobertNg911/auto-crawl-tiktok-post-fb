import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
