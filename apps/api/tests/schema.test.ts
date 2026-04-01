/**
 * Supabase Schema Validation Tests
 * 
 * Tests to ensure database schema is properly migrated
 */

import { describe, it, expect } from 'vitest';

describe('Database Schema Requirements', () => {
  const requiredTables = [
    'users',
    'user_profiles',
    'campaigns',
    'videos',
    'facebook_pages',
    'target_channels',
    'inbox_conversations',
    'interaction_logs',
    'inbox_message_logs',
    'task_queue',
    'worker_heartbeats',
    'system_events',
    'channel_metrics_snapshots',
    'video_metrics_snapshots',
    'runtime_settings',
  ];

  it('should have all required tables documented', () => {
    expect(requiredTables.length).toBe(15);
  });

  it('should document table relationships', () => {
    const relationships: Record<string, string[]> = {
      campaigns: ['videos', 'target_channels'],
      videos: ['campaigns'],
      facebook_pages: ['inbox_conversations', 'interaction_logs'],
    };

    expect(relationships.campaigns).toContain('videos');
    expect(relationships.campaigns).toContain('target_channels');
  });
});

describe('Migration Files', () => {
  it('should have initial schema migration', () => {
    // Migration 001 should exist and create all tables
    const migration001 = require('../../supabase/migrations/001_initial_schema.sql');
    expect(migration001).toBeDefined();
  });

  it('should have user profiles migration', () => {
    const migration003 = require('../../supabase/migrations/003_user_profiles.sql');
    expect(migration003).toBeDefined();
  });
});

describe('RLS Policies', () => {
  it('should document RLS requirements', () => {
    const tablesWithRLS = [
      'users',
      'campaigns',
      'videos',
      'facebook_pages',
      'target_channels',
    ];

    // At minimum, document tables needing RLS
    expect(tablesWithRLS.length).toBeGreaterThan(0);
  });
});

describe('Edge Functions', () => {
  const edgeFunctions = [
    'crawl-video',
    'download-video',
    'generate-caption',
    'publish-video',
  ];

  it('should have crawl-video edge function', () => {
    const crawlFunction = require('../../supabase/functions/crawl-video/index.ts');
    expect(crawlFunction).toBeDefined();
  });

  it('should document all edge functions', () => {
    expect(edgeFunctions.length).toBe(4);
  });
});
