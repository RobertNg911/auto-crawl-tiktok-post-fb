import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase-admin';

const FB_APP_SECRET = process.env.FB_APP_SECRET || '';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'autocrawl_verify_token';

function verifyFacebookSignature(body: string, signature: string | null): boolean {
  if (!signature || !FB_APP_SECRET) return true;
  const expectedSignature = 'sha256=' + require('crypto')
    .createHmac('sha256', FB_APP_SECRET)
    .update(body)
    .digest('hex');
  return signature === expectedSignature;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleWebhookVerify(req, res);
  }
  if (req.method === 'POST') {
    return handleWebhookPost(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleWebhookVerify(req: VercelRequest, res: VercelResponse) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ error: 'Forbidden' });
}

async function handleWebhookPost(req: VercelRequest, res: VercelResponse) {
  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'] as string | null;

    if (!verifyFacebookSignature(body, signature)) {
      console.error('Invalid Facebook signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const entries = req.body.entry || [];

    for (const entry of entries) {
      const pageId = entry.id;

      if (entry.messaging) {
        for (const message of entry.messaging) {
          await supabaseAdmin
            .from('inbox_message_logs')
            .insert({
              page_id: pageId,
              sender_id: message.sender?.id,
              recipient_id: message.recipient?.id,
              message_id: message.message?.mid,
              message_text: message.message?.text,
              payload: message,
            });
        }
      }

      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'feed' && change.value?.item === 'comment') {
            await supabaseAdmin
              .from('interaction_logs')
              .insert({
                page_id: pageId,
                post_id: change.value?.post_id,
                comment_id: change.value?.comment_id,
                sender_id: change.value?.from?.id,
                message_text: change.value?.message,
                payload: change.value,
              });
          }
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
