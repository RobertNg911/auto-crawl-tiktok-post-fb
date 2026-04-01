import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function verifyCronAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const path = req.url || '';
  
  if (path.includes('process-queue')) {
    return handleProcessQueue(req, res);
  }
  if (path.includes('sync-campaigns')) {
    return handleSyncCampaigns(req, res);
  }
  if (path.includes('scheduled-posts')) {
    return handleScheduledPosts(req, res);
  }
  if (path.includes('health-check')) {
    return handleHealthCheck(req, res);
  }

  return res.status(400).json({ error: 'Unknown cron endpoint' });
}

async function handleProcessQueue(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const processedTasks: string[] = [];
    const failedTasks: string[] = [];

    for (let i = 0; i < 10; i++) {
      const { data: task, error: claimError } = await supabase
        .from('task_queue')
        .update({ status: 'processing' })
        .eq('status', 'queued')
        .eq('attempts', 0)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .select()
        .single();

      if (!task) break;

      try {
        await processTask(supabase, task);
        await supabase
          .from('task_queue')
          .update({ status: 'completed' })
          .eq('id', task.id);
        processedTasks.push(task.id);
      } catch (taskError: any) {
        await supabase
          .from('task_queue')
          .update({
            status: 'failed',
            last_error: taskError.message,
            attempts: task.attempts + 1,
          })
          .eq('id', task.id);
        failedTasks.push(task.id);
      }
    }

    return res.status(200).json({
      processed: processedTasks.length,
      failed: failedTasks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Queue processing error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function processTask(supabase: any, task: any) {
  const { task_type, entity_type, entity_id, payload } = task;

  switch (task_type) {
    case 'sync_campaign':
      await handleSyncCampaign(supabase, entity_id, payload);
      break;
    case 'download_video':
      await handleDownloadVideo(supabase, entity_id, payload);
      break;
    case 'generate_caption':
      await handleGenerateCaption(supabase, entity_id, payload);
      break;
    case 'publish_video':
      await handlePublishVideo(supabase, entity_id, payload);
      break;
    case 'reply_comment':
      await handleReplyComment(supabase, entity_id, payload);
      break;
    case 'reply_message':
      await handleReplyMessage(supabase, entity_id, payload);
      break;
    case 'sync_channel_metrics':
      await handleSyncChannelMetrics(supabase, entity_id, payload);
      break;
    default:
      throw new Error(`Unknown task type: ${task_type}`);
  }
}

async function handleSyncCampaign(supabase: any, campaignId: string, payload: any) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) throw new Error('Campaign not found');

  const sourceUrl = campaign.source_url;
  const platform = campaign.source_platform;

  let videos: any[] = [];
  
  if (platform === 'tiktok') {
    const response = await fetch(`https://www.tikwm.com/api/user/posts?unique_id=${sourceUrl}&page=0&count=20`);
    const data = await response.json();
    videos = data.data?.videos || [];
  } else if (platform === 'youtube') {
    const response = await fetch(`https://inv.nadeko.net/api/v1/channels/${sourceUrl}/videos`);
    const data = await response.json();
    videos = data.videos || [];
  }

  for (const video of videos) {
    const videoId = video.video_id || video.id;
    const existing = await supabase
      .from('videos')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('original_id', videoId)
      .single();

    if (!existing.data) {
      await supabase.from('videos').insert({
        campaign_id: campaignId,
        original_id: videoId,
        source_platform: platform,
        source_kind: video.type || 'video',
        source_video_url: video.play || video.url,
        original_caption: video.title || video.desc,
        thumbnail_url: video.cover || video.thumbnail,
        status: 'pending',
        priority: 0,
      });
    }
  }

  await supabase
    .from('campaigns')
    .update({ last_synced_at: new Date().toISOString(), last_sync_status: 'success' })
    .eq('id', campaignId);
}

async function handleDownloadVideo(supabase: any, videoId: string, payload: any) {
  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (!video) throw new Error('Video not found');

  await supabase
    .from('videos')
    .update({ status: 'downloading' })
    .eq('id', videoId);

  const downloadUrl = video.source_video_url;
  const response = await fetch(downloadUrl);
  const buffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(`${videoId}/video.mp4`, Buffer.from(buffer), {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(`${videoId}/video.mp4`);

  await supabase
    .from('videos')
    .update({
      file_path: urlData.publicUrl,
      status: 'ready',
    })
    .eq('id', videoId);
}

async function handleGenerateCaption(supabase: any, videoId: string, payload: any) {
  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (!video) throw new Error('Video not found');

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate a catchy Vietnamese Facebook caption for this video: ${video.original_caption || video.ai_caption || 'No caption'}. Make it engaging and include relevant hashtags.`
          }]
        }]
      })
    }
  );

  const data = await response.json();
  const caption = data.candidates?.[0]?.content?.parts?.[0]?.text || video.original_caption;

  await supabase
    .from('videos')
    .update({ ai_caption: caption })
    .eq('id', videoId);
}

async function handlePublishVideo(supabase: any, videoId: string, payload: any) {
  const { data: video } = await supabase
    .from('videos')
    .select('*, campaigns(target_page_id)')
    .eq('id', videoId)
    .single();

  if (!video) throw new Error('Video not found');

  const pageId = video.campaigns?.target_page_id;
  if (!pageId) throw new Error('No target page configured');

  const { data: page } = await supabase
    .from('facebook_pages')
    .select('*')
    .eq('page_id', pageId)
    .single();

  if (!page) throw new Error('Page not found');

  const caption = video.ai_caption || video.original_caption || '';
  
  if (video.file_path) {
    const videoResponse = await fetch(video.file_path);
    const videoBlob = await videoResponse.blob();

    const formData = new FormData();
    formData.append('source', videoBlob, 'video.mp4');
    formData.append('message', caption);
    formData.append('access_token', page.long_lived_access_token);

    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/videos`,
      { method: 'POST', body: formData }
    );

    const fbData = await fbResponse.json();
    if (fbData.id) {
      await supabase
        .from('videos')
        .update({ status: 'posted', fb_post_id: fbData.id })
        .eq('id', videoId);
    } else {
      throw new Error(fbData.error?.message || 'Facebook upload failed');
    }
  }
}

async function handleReplyComment(supabase: any, interactionId: string, payload: any) {
  const { data: interaction } = await supabase
    .from('interaction_logs')
    .select('*')
    .eq('id', interactionId)
    .single();

  if (!interaction) throw new Error('Interaction not found');

  const reply = await generateReplyWithAI(interaction.message_text || '', 'comment');
  await sendFacebookCommentReply(supabase, interaction.comment_id, reply, interaction.page_id);

  await supabase
    .from('interaction_logs')
    .update({ status: 'replied' })
    .eq('id', interactionId);
}

async function handleReplyMessage(supabase: any, messageId: string, payload: any) {
  const { data: message } = await supabase
    .from('inbox_message_logs')
    .select('*')
    .eq('id', messageId)
    .single();

  if (!message) throw new Error('Message not found');

  const reply = await generateReplyWithAI(message.message_text || '', 'message');
  await sendFacebookMessage(supabase, message.sender_id, reply, message.page_id);

  await supabase
    .from('inbox_message_logs')
    .update({ status: 'replied' })
    .eq('id', messageId);
}

async function handleSyncChannelMetrics(supabase: any, channelId: string, payload: any) {
  const { data: channel } = await supabase
    .from('target_channels')
    .select('*')
    .eq('id', channelId)
    .single();

  if (!channel) throw new Error('Channel not found');

  await supabase
    .from('target_channels')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', channelId);
}

async function generateReplyWithAI(text: string, type: string): Promise<string> {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return `Cảm ơn bạn!`;

    const prompt = type === 'comment'
      ? `Generate a short, friendly reply in Vietnamese to this comment: "${text}"`
      : `Generate a short, friendly auto-reply message in Vietnamese for this inbox message: "${text}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Cảm ơn bạn!';
  } catch (error) {
    console.error('AI reply error:', error);
    return 'Cảm ơn bạn!';
  }
}

async function sendFacebookCommentReply(supabase: any, commentId: string, message: string, pageId: string) {
  const { data: page } = await supabase
    .from('facebook_pages')
    .select('long_lived_access_token')
    .eq('page_id', pageId)
    .single();

  if (!page?.long_lived_access_token) throw new Error('Page token not found');

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${commentId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: page.long_lived_access_token,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API error: ${error.error?.message || 'Unknown'}`);
  }
}

async function sendFacebookMessage(supabase: any, recipientId: string, message: string, pageId: string) {
  const { data: page } = await supabase
    .from('facebook_pages')
    .select('long_lived_access_token')
    .eq('page_id', pageId)
    .single();

  if (!page?.long_lived_access_token) throw new Error('Page token not found');

  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: page.long_lived_access_token,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API error: ${error.error?.message || 'Unknown'}`);
  }
}

async function handleSyncCampaigns(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const processed: string[] = [];
    const failed: string[] = [];

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .eq('is_deleted', false);

    for (const campaign of campaigns || []) {
      try {
        const lastSync = campaign.last_synced_at ? new Date(campaign.last_synced_at) : null;
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (!lastSync || lastSync < hourAgo) {
          const { data: existingTask } = await supabase
            .from('task_queue')
            .select('id')
            .eq('task_type', 'sync_campaign')
            .eq('entity_id', campaign.id)
            .in('status', ['queued', 'processing'])
            .single();

          if (!existingTask) {
            await supabase
              .from('task_queue')
              .insert({
                task_type: 'sync_campaign',
                entity_type: 'campaign',
                entity_id: campaign.id,
                payload: { auto: true },
                status: 'queued',
                priority: 5,
              });

            processed.push(campaign.id);
          }
        }
      } catch (err: any) {
        console.error(`Error syncing campaign ${campaign.id}:`, err);
        failed.push(campaign.id);
      }
    }

    return res.status(200).json({
      campaigns_synced: processed.length,
      failed: failed.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Campaign sync cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleScheduledPosts(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('status', 'ready')
      .lte('publish_time', now.toISOString())
      .eq('is_deleted', false)
      .limit(10);

    if (error) throw error;

    const published: string[] = [];
    const failed: string[] = [];

    for (const video of videos || []) {
      try {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('target_page_id')
          .eq('id', video.campaign_id)
          .single();

        if (!campaign?.target_page_id) {
          failed.push(video.id);
          continue;
        }

        const { data: page } = await supabase
          .from('facebook_pages')
          .select('*')
          .eq('page_id', campaign.target_page_id)
          .single();

        if (!page) {
          failed.push(video.id);
          continue;
        }

        await supabase
          .from('task_queue')
          .insert({
            task_type: 'publish_video',
            entity_type: 'video',
            entity_id: video.id,
            payload: { scheduled: true },
            status: 'queued',
            priority: 1,
          });

        await supabase
          .from('videos')
          .update({ status: 'publishing' })
          .eq('id', video.id);

        published.push(video.id);
      } catch (err: any) {
        console.error(`Error scheduling video ${video.id}:`, err);
        failed.push(video.id);
      }
    }

    return res.status(200).json({
      scheduled: published.length,
      failed: failed.length,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Scheduler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleHealthCheck(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const health: Record<string, any> = {
      timestamp: new Date().toISOString(),
      services: {},
    };

    try {
      const { error: dbError } = await supabase.from('campaigns').select('id').limit(1);
      health.services.database = dbError ? 'down' : 'up';
    } catch {
      health.services.database = 'down';
    }

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
      health.services.workers = 'up';
    }

    try {
      const { error: storageError } = await supabase.storage.listBuckets();
      health.services.storage = storageError ? 'down' : 'up';
    } catch {
      health.services.storage = 'down';
    }

    const serviceValues = Object.values(health.services) as (string | { status: string })[];
    const allUp = serviceValues.every(
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
