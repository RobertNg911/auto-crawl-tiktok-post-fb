import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url || '/';
  
  if (path.startsWith('/api/auth')) {
    return authHandler(req, res);
  }
  if (path.startsWith('/api/users')) {
    return usersHandler(req, res);
  }
  if (path.startsWith('/api/campaigns')) {
    return campaignsHandler(req, res);
  }
  if (path.startsWith('/api/channels')) {
    return channelsHandler(req, res);
  }
  if (path.startsWith('/api/videos')) {
    return videosHandler(req, res);
  }
  if (path.startsWith('/api/crawler')) {
    return crawlerHandler(req, res);
  }
  if (path.startsWith('/api/dashboard')) {
    return dashboardHandler(req, res);
  }
  if (path.startsWith('/api/facebook')) {
    return facebookHandler(req, res);
  }
  if (path.startsWith('/api/system')) {
    return systemHandler(req, res);
  }
  if (path.startsWith('/api/cron')) {
    return cronHandler(req, res);
  }
  if (path.startsWith('/api/webhooks')) {
    return webhooksHandler(req, res);
  }
  
  return res.status(404).json({ error: 'Not found' });
}
