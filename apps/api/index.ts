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

export default app;