import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function getUserId(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
    return decoded.user_id;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { video_id } = req.query;

  if (!video_id || typeof video_id !== 'string') {
    return res.status(400).json({ error: 'Video ID required' });
  }

  if (req.method === 'GET') {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .select(`
          *,
          campaigns(id, name, target_page_id)
        `)
        .eq('id', video_id)
        .single();

      if (error) return res.status(404).json({ error: 'Video not found' });

      return res.status(200).json(video);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const updates = req.body;
      delete updates.id;
      delete updates.created_at;

      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .update(updates)
        .eq('id', video_id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json(video);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { error } = await supabaseAdmin
        .from('videos')
        .update({ is_deleted: true })
        .eq('id', video_id);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(204).send(null);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    const action = req.query.action;

    if (action === 'publish') {
      return handlePublish(req, res, video_id);
    }
    if (action === 'generate-caption') {
      return handleGenerateCaption(req, res, video_id);
    }
    if (action === 'retry') {
      return handleRetry(req, res, video_id);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handlePublish(req: VercelRequest, res: VercelResponse, videoId: string) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: task, error } = await supabaseAdmin
      .from('task_queue')
      .insert({
        task_type: 'publish_video',
        entity_type: 'video',
        entity_id: videoId,
        payload: { triggered_by: userId },
        status: 'queued',
        priority: 1,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ message: 'Publish task queued', task_id: task.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleGenerateCaption(req: VercelRequest, res: VercelResponse, videoId: string) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: task, error } = await supabaseAdmin
      .from('task_queue')
      .insert({
        task_type: 'generate_caption',
        entity_type: 'video',
        entity_id: videoId,
        payload: { triggered_by: userId },
        status: 'queued',
        priority: 10,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ message: 'Caption generation queued', task_id: task.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleRetry(req: VercelRequest, res: VercelResponse, videoId: string) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await supabaseAdmin
      .from('videos')
      .update({
        status: 'pending',
        last_error: null,
      })
      .eq('id', videoId);

    const { data: task, error } = await supabaseAdmin
      .from('task_queue')
      .insert({
        task_type: 'download_video',
        entity_type: 'video',
        entity_id: videoId,
        payload: { triggered_by: userId, is_retry: true },
        status: 'queued',
        priority: 3,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ message: 'Retry task queued', task_id: task.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
