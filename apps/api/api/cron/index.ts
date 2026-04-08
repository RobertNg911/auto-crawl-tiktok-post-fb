import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';

const cron = new Hono();

function verifyCronAuth(authHeader: string | null | undefined): boolean {
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}

async function generateAICaption(originalCaption: string, topic: string, withHashtag: boolean): Promise<string> {
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'your-gemini-api-key') {
    return originalCaption;
  }
  
  try {
    const prompt = withHashtag 
      ? `Generate a catchy Facebook post caption in Vietnamese for this TikTok video. Topic: ${topic}. Original caption: ${originalCaption}. Add relevant hashtags at the end. Keep it under 500 characters.`
      : `Generate a catchy Facebook post caption in Vietnamese for this TikTok video. Topic: ${topic}. Original caption: ${originalCaption}. Keep it under 500 characters.`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
      })
    });
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || originalCaption;
  } catch (err) {
    console.error('AI caption error:', err);
    return originalCaption;
  }
}

cron.post('/process-queue', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!verifyCronAuth(authHeader)) return c.json({ error: 'Unauthorized' }, 401);
  
  const { data: pendingVideos } = await supabaseAdmin.from('videos').select('*').eq('status', 'pending').limit(10);
  return c.json({ processed: pendingVideos?.length || 0, videos: pendingVideos });
});

cron.post('/cleanup', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!verifyCronAuth(authHeader)) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ message: 'Cleanup completed' });
});

cron.post('/sync-campaigns', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!verifyCronAuth(authHeader)) return c.json({ error: 'Unauthorized' }, 401);
  
  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .eq('is_deleted', false);
  
  if (error) return c.json({ error: error.message }, 500);
  
  const results = [];
  for (const campaign of campaigns || []) {
    const { data: videos, error: crawlError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_deleted', false)
      .gte('views', campaign.view_threshold || 0)
      .eq('status', 'ready')
      .limit(5);
    
    if (!crawlError && videos) {
      for (const video of videos) {
        if (campaign.auto_post && campaign.target_page_id) {
          await supabaseAdmin
            .from('videos')
            .update({ status: 'posting' })
            .eq('id', video.id);
          
          results.push({ campaign: campaign.name, video: video.id, action: 'queued_for_post' });
        }
      }
    }
  }
  
  return c.json({ synced: campaigns?.length || 0, actions: results });
});

cron.post('/auto-post', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!verifyCronAuth(authHeader)) return c.json({ error: 'Unauthorized' }, 401);
  
  const now = new Date().toISOString();
  
  const { data: videosToPost, error } = await supabaseAdmin
    .from('videos')
    .select('*, campaigns(*), facebook_pages(*)')
    .eq('status', 'ready')
    .eq('is_deleted', false)
    .eq('campaigns.auto_post', true)
    .limit(10);
  
  if (error) return c.json({ error: error.message }, 500);
  
  const results = [];
  for (const video of videosToPost || []) {
    const campaign = video.campaigns;
    const page = video.facebook_pages;
    
    if (!campaign?.target_page_id || !page?.long_lived_access_token) {
      results.push({ video: video.id, status: 'skipped', reason: 'missing_config' });
      continue;
    }
    
    if (video.fb_post_id) {
      results.push({ video: video.id, status: 'skipped', reason: 'already_posted' });
      continue;
    }
    
    const uploadDelayMs = (campaign.upload_delay || 0) * 60 * 1000;
    if (uploadDelayMs > 0) {
      const lastPostTime = video.updated_at;
      if (lastPostTime && (new Date(now).getTime() - new Date(lastPostTime).getTime()) < uploadDelayMs) {
        results.push({ video: video.id, status: 'skipped', reason: 'upload_delay_waiting' });
        continue;
      }
    }
    
    let caption = video.original_caption || video.description || '';
    if (campaign.ai_caption_enabled) {
      caption = await generateAICaption(caption, campaign.topic || '', campaign.ai_hashtag_enabled);
    }
    
    try {
      const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${campaign.target_page_id}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: video.source_video_url,
          title: (video.title || video.original_caption || 'Video').substring(0, 60),
          description: caption,
          access_token: page.long_lived_access_token,
        }),
      });
      
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        await supabaseAdmin
          .from('videos')
          .update({ 
            status: 'posted', 
            posted_at: now,
            ai_caption: caption,
            fb_post_id: fbData.id
          })
          .eq('id', video.id);
        
        results.push({ video: video.id, status: 'posted', fb_post_id: fbData.id });
      } else {
        const fbError = await fbResponse.text();
        await supabaseAdmin
          .from('videos')
          .update({ status: 'failed', last_error: fbError })
          .eq('id', video.id);
        
        results.push({ video: video.id, status: 'failed', error: fbError });
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('videos')
        .update({ status: 'failed', last_error: err.message })
        .eq('id', video.id);
      
      results.push({ video: video.id, status: 'failed', error: err.message });
    }
  }
  
  return c.json({ processed: results.length, results });
});

cron.post('/auto-reply-comments', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!verifyCronAuth(authHeader)) return c.json({ error: 'Unauthorized' }, 401);
  
  const { data: pages, error } = await supabaseAdmin
    .from('facebook_pages')
    .select('*')
    .eq('comment_auto_reply_enabled', true)
    .eq('auto_comment', true)
    .eq('is_deleted', false);
  
  if (error) return c.json({ error: error.message }, 500);
  
  const results = [];
  for (const page of pages || []) {
    try {
      const commentsRes = await fetch(
        `https://graph.facebook.com/v18.0/${page.page_id}/comments?access_token=${page.long_lived_access_token}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      const commentsData = await commentsRes.json();
      const comments = commentsData.data || [];
      
      for (const comment of comments) {
        const { data: existing } = await supabaseAdmin
          .from('interaction_logs')
          .select('id')
          .eq('comment_id', comment.id)
          .single();
        
        if (existing) continue;
        
        await supabaseAdmin
          .from('interaction_logs')
          .insert({
            page_id: page.page_id,
            post_id: comment.message?.id,
            comment_id: comment.id,
            sender_id: comment.from?.id,
            sender_name: comment.from?.name,
            message_text: comment.message,
          });
        
        let reply = 'Cảm ơn bạn! 🎬';
        if (env.GEMINI_API_KEY && page.comment_ai_prompt) {
          const aiPrompt = `${page.comment_ai_prompt}. User comment: ${comment.message}. Reply in Vietnamese, keep short.`;
          
          try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: aiPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
              })
            });
            
            const aiData = await aiRes.json();
            reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || reply;
          } catch (err) {
            console.error('AI reply error:', err);
          }
        }
        
        try {
          await fetch(`https://graph.facebook.com/v18.0/${comment.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: reply,
              access_token: page.long_lived_access_token,
            })
          });
          
          results.push({ comment: comment.id, reply: 'sent' });
        } catch (replyErr) {
          results.push({ comment: comment.id, reply: 'failed', error: String(replyErr) });
        }
      }
    } catch (err) {
      results.push({ page: page.page_id, error: String(err) });
    }
  }
  
  return c.json({ processed: results.length, results });
});

export default cron;