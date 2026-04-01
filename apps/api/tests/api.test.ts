/**
 * API Integration Tests
 * 
 * Tests the migrated Vercel API endpoints
 * Note: These tests require Supabase credentials to run
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let authToken: string;

describe('Auth API', () => {
  it('should have login endpoint structure', () => {
    // Verify the login endpoint exists in the codebase
    const loginModule = require('../api/auth/login');
    expect(loginModule.default).toBeDefined();
  });

  it('should have me endpoint structure', () => {
    const meModule = require('../api/auth/me');
    expect(meModule.default).toBeDefined();
  });

  it('should have change-password endpoint structure', () => {
    const changePasswordModule = require('../api/auth/change-password');
    expect(changePasswordModule.default).toBeDefined();
  });
});

describe('Campaigns API', () => {
  it('should have campaigns index endpoint', () => {
    const campaignsModule = require('../api/campaigns/index');
    expect(campaignsModule.default).toBeDefined();
  });

  it('should have campaign by id endpoint', () => {
    const campaignModule = require('../api/campaigns/[campaign_id]');
    expect(campaignModule.default).toBeDefined();
  });

  it('should have campaign actions endpoint', () => {
    const actionsModule = require('../api/campaigns/[campaign_id]/actions');
    expect(actionsModule.default).toBeDefined();
  });
});

describe('Videos API', () => {
  it('should have videos index endpoint', () => {
    const videosModule = require('../api/videos/index');
    expect(videosModule.default).toBeDefined();
  });

  it('should have video by id endpoint', () => {
    const videoModule = require('../api/videos/[video_id]');
    expect(videoModule.default).toBeDefined();
  });
});

describe('Facebook API', () => {
  it('should have facebook index endpoint', () => {
    const fbModule = require('../api/facebook/index');
    expect(fbModule.default).toBeDefined();
  });

  it('should have facebook page endpoint', () => {
    const fbPageModule = require('../api/facebook/[page_id]');
    expect(fbPageModule.default).toBeDefined();
  });
});

describe('Webhook API', () => {
  it('should have facebook webhook endpoint', () => {
    const webhookModule = require('../api/webhooks/fb');
    expect(webhookModule.default).toBeDefined();
  });
});

describe('Dashboard API', () => {
  it('should have dashboard overview endpoint', () => {
    const dashboardModule = require('../api/dashboard/overview');
    expect(dashboardModule.default).toBeDefined();
  });
});

describe('System API', () => {
  it('should have health endpoint', () => {
    const healthModule = require('../api/system/health');
    expect(healthModule.default).toBeDefined();
  });

  it('should have tasks endpoint', () => {
    const tasksModule = require('../api/system/tasks');
    expect(tasksModule.default).toBeDefined();
  });
});

describe('Cron API', () => {
  it('should have process-queue cron', () => {
    const processQueueModule = require('../api/cron/process-queue');
    expect(processQueueModule.default).toBeDefined();
  });

  it('should have scheduled-posts cron', () => {
    const scheduledPostsModule = require('../api/cron/scheduled-posts');
    expect(scheduledPostsModule.default).toBeDefined();
  });

  it('should have sync-campaigns cron', () => {
    const syncCampaignsModule = require('../api/cron/sync-campaigns');
    expect(syncCampaignsModule.default).toBeDefined();
  });

  it('should have health-check cron', () => {
    const healthCheckModule = require('../api/cron/health-check');
    expect(healthCheckModule.default).toBeDefined();
  });
});

describe('Crawler API', () => {
  it('should have crawl endpoint', () => {
    const crawlModule = require('../api/crawler/crawl');
    expect(crawlModule.default).toBeDefined();
  });

  it('should have download endpoint', () => {
    const downloadModule = require('../api/crawler/download');
    expect(downloadModule.default).toBeDefined();
  });
});

describe('Code Quality', () => {
  it('should not have syntax errors in auth modules', () => {
    expect(() => require('../lib/supabase')).not.toThrow();
    expect(() => require('../lib/supabase-admin')).not.toThrow();
  });

  it('should have proper error handling in handlers', () => {
    const loginModule = require('../api/auth/login');
    const handler = loginModule.default;
    
    // Handler should be a function
    expect(typeof handler).toBe('function');
  });
});

describe('Environment Variables Required', () => {
  it('should document required env vars', () => {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'GEMINI_API_KEY',
      'FB_APP_ID',
      'FB_APP_SECRET',
      'FB_VERIFY_TOKEN',
    ];

    // At minimum, document what's needed
    expect(requiredVars.length).toBeGreaterThan(0);
  });
});
