import { Hono } from 'hono';
import { supabaseAdmin, env } from '../../lib/env';
import { createHmac } from 'crypto';

const webhooks = new Hono();

function verifyFacebookSignature(body: string, signature: string | null): boolean {
  if (!signature || !env.FB_APP_SECRET) return true;
  const expectedSignature = 'sha256=' + createHmac('sha256', env.FB_APP_SECRET).update(body).digest('hex');
  return signature === expectedSignature;
}

webhooks.get('/', async (c) => {
  const mode = c.req.query('hub_mode');
  const token = c.req.query('hub_verify_token');
  const challenge = c.req.query('hub_challenge');
  if (mode === 'subscribe' && token === env.FB_VERIFY_TOKEN) {
    return c.text(challenge || '');
  }
  return c.json({ error: 'Invalid verification' }, 400);
});

webhooks.post('/', async (c) => {
  const signature = c.req.header('x-hub-signature-256') ?? null;
  const body = await c.req.text();
  if (!verifyFacebookSignature(body, signature)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }
  const data = JSON.parse(body);
  return c.json({ received: true, entry: data.entry });
});

export default webhooks;