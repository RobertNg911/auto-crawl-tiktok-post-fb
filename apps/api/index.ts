import { Hono } from 'hono';
import { cors } from 'hono/cors';

import authHandler from './api/auth';
import usersHandler from './api/users';
import campaignsHandler from './api/campaigns';
import channelsHandler from './api/channels';
import videosHandler from './api/videos';
import crawlerHandler from './api/crawler';
import dashboardHandler from './api/dashboard/overview';
import facebookHandler from './api/facebook';
import systemHandler from './api/system';
import cronHandler from './api/cron';
import webhooksHandler from './api/webhooks/fb';

const app = new Hono();

app.use('/*', cors());

app.route('/api/auth', authHandler);
app.route('/api/users', usersHandler);
app.route('/api/campaigns', campaignsHandler);
app.route('/api/channels', channelsHandler);
app.route('/api/videos', videosHandler);
app.route('/api/crawler', crawlerHandler);
app.route('/api/dashboard', dashboardHandler);
app.route('/api/facebook', facebookHandler);
app.route('/api/system', systemHandler);
app.route('/api/cron', cronHandler);
app.route('/api/webhooks', webhooksHandler);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: any, ctx: any) => {
    console.log('⏰ Cron triggered at', new Date().toISOString());
    
    const workerUrl = env.WORKER_URL || 'https://auto-crawl-tiktok-post-fb.leesun190590.workers.dev';
    const cronSecret = env.CRON_SECRET;
    
    try {
      const [syncRes, postRes, replyRes] = await Promise.all([
        fetch(`${workerUrl}/api/cron/sync-campaigns`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cronSecret}` }
        }),
        fetch(`${workerUrl}/api/cron/auto-post`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cronSecret}` }
        }),
        fetch(`${workerUrl}/api/cron/auto-reply-comments`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cronSecret}` }
        })
      ]);
      
      const syncData = await syncRes.json();
      const postData = await postRes.json();
      const replyData = await replyRes.json();
      
      console.log('✅ Sync campaigns:', JSON.stringify(syncData));
      console.log('✅ Auto post:', JSON.stringify(postData));
      console.log('✅ Auto reply comments:', JSON.stringify(replyData));
    } catch (err) {
      console.error('❌ Cron error:', err);
    }
  }
};