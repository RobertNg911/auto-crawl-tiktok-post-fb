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
    const processedTasks: string[] = [];
    const failedTasks: string[] = [];

    // Process up to 10 tasks at a time
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

  // Call crawl-video Edge Function
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/crawl-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      campaign_id: campaignId,
      source_url: campaign.source_url,
      view_threshold: campaign.view_threshold,
    }),
  });

  if (!response.ok) {
    throw new Error(`Crawl failed: ${response.statusText}`);
  }
}

async function handleDownloadVideo(supabase: any, videoId: string, payload: any) {
  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (!video) throw new Error('Video not found');

  // Call download endpoint
  const response = await fetch(`${process.env.API_URL}/api/crawler/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({
      video_id: videoId,
      source_url: video.source_video_url,
    }),
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
}

async function handleGenerateCaption(supabase: any, videoId: string, payload: any) {
  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (!video) throw new Error('Video not found');

  const caption = await generateCaptionWithAI(video.original_caption || '');

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
  if (!video.file_path) throw new Error('Video file not available');

  const targetPageId = video.campaigns?.target_page_id;
  if (!targetPageId) throw new Error('No target page configured');

  const { data: page } = await supabase
    .from('facebook_pages')
    .select('*')
    .eq('page_id', targetPageId)
    .single();

  if (!page) throw new Error('Facebook page not found');

  // Upload to Facebook
  await uploadToFacebook(video.file_path, video.ai_caption || video.original_caption, page);
}

async function handleReplyComment(supabase: any, interactionId: string, payload: any) {
  const { data: interaction } = await supabase
    .from('interaction_logs')
    .select('*')
    .eq('id', interactionId)
    .single();

  if (!interaction) throw new Error('Interaction not found');

  const reply = await generateReplyWithAI(interaction.message_text || '', 'comment');

  await sendFacebookCommentReply(interaction.comment_id, reply, interaction.page_id);

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

  await sendFacebookMessage(message.sender_id, reply, message.page_id);

  await supabase
    .from('inbox_message_logs')
    .update({ status: 'replied' })
    .eq('id', messageId);
}

async function handleSyncChannelMetrics(supabase: any, channelId: string, payload: any) {
  // Sync channel metrics from TikTok/YouTube
  // Implementation depends on crawler service
  console.log('Syncing channel metrics:', channelId);
}

// AI Helper functions
async function generateCaptionWithAI(originalCaption: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return originalCaption;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate an engaging Facebook Reels caption for this video. Original caption: "${originalCaption}". Keep it under 200 characters with relevant hashtags.`
            }]
          }]
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || originalCaption;
  } catch (error) {
    console.error('AI caption error:', error);
    return originalCaption;
  }
}

async function generateReplyWithAI(message: string, type: 'comment' | 'message'): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return 'Cảm ơn bạn đã phản hồi!';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a friendly reply to this ${type}: "${message}". Reply in Vietnamese, under 100 characters.`
            }]
          }]
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Cảm ơn bạn!';
  } catch (error) {
    console.error('AI reply error:', error);
    return 'Cảm ơn bạn!';
  }
}

// Facebook API helpers
async function sendFacebookCommentReply(commentId: string, message: string, pageId: string) {
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

async function sendFacebookMessage(recipientId: string, message: string, pageId: string) {
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

async function uploadToFacebook(videoPath: string, caption: string, page: any) {
  // Facebook video upload requires multi-step process
  // 1. Create empty video upload session
  // 2. Upload video chunks
  // 3. Publish video
  // This is a simplified version
  
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${page.page_id}/videos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: caption,
        access_token: page.long_lived_access_token,
        url: videoPath,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook upload error: ${error.error?.message || 'Unknown'}`);
  }

  const result = await response.json();
  return result.id;
}
