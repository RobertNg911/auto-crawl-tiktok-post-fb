-- AutoCrawl Database Setup
-- Run this on Supabase SQL Editor if db push fails

-- =====================================================
-- ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Target Channels
CREATE TABLE IF NOT EXISTS target_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(255),
    topic VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR,
    topic VARCHAR(100),
    view_threshold INTEGER DEFAULT 0 NOT NULL,
    source_url VARCHAR,
    source_platform VARCHAR,
    source_kind VARCHAR,
    status VARCHAR(20) DEFAULT 'active',
    auto_post BOOLEAN DEFAULT FALSE,
    target_page_id VARCHAR,
    schedule_interval INTEGER DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    last_sync_status VARCHAR DEFAULT 'idle',
    last_sync_error VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    original_id VARCHAR,
    source_platform VARCHAR,
    source_kind VARCHAR,
    source_video_url VARCHAR,
    file_path VARCHAR,
    original_caption VARCHAR,
    ai_caption VARCHAR,
    thumbnail_url VARCHAR,
    status VARCHAR(20) DEFAULT 'pending',
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    publish_time TIMESTAMPTZ,
    fb_post_id VARCHAR,
    last_error VARCHAR,
    retry_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facebook Pages
CREATE TABLE IF NOT EXISTS facebook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id VARCHAR UNIQUE,
    page_name VARCHAR,
    long_lived_access_token VARCHAR,
    auto_post BOOLEAN DEFAULT TRUE NOT NULL,
    auto_comment BOOLEAN DEFAULT FALSE NOT NULL,
    auto_inbox BOOLEAN DEFAULT FALSE NOT NULL,
    caption_prompt VARCHAR,
    comment_ai_prompt VARCHAR,
    message_ai_prompt VARCHAR,
    comment_auto_reply_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    message_auto_reply_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inbox Conversations
CREATE TABLE IF NOT EXISTS inbox_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id VARCHAR NOT NULL,
    customer_id VARCHAR NOT NULL,
    customer_name VARCHAR,
    customer_avatar VARCHAR,
    ai_state VARCHAR(20) DEFAULT 'ai_active',
    assigned_user_id UUID,
    summary VARCHAR,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, customer_id)
);

-- Interaction Logs (comments)
CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id VARCHAR NOT NULL,
    post_id VARCHAR,
    comment_id VARCHAR UNIQUE,
    sender_id VARCHAR,
    sender_name VARCHAR,
    message_text VARCHAR,
    status VARCHAR(20) DEFAULT 'pending',
    ai_reply_text VARCHAR,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inbox Messages
CREATE TABLE IF NOT EXISTS inbox_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id VARCHAR NOT NULL,
    conversation_id UUID REFERENCES inbox_conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR,
    sender_name VARCHAR,
    recipient_id VARCHAR,
    message_id VARCHAR UNIQUE,
    message_text VARCHAR,
    is_from_page BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending',
    ai_reply_text VARCHAR,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Queue
CREATE TABLE IF NOT EXISTS task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'queued',
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    last_error VARCHAR,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Heartbeats
CREATE TABLE IF NOT EXISTS worker_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_name VARCHAR(100) UNIQUE NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Events
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    message VARCHAR,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Metrics
CREATE TABLE IF NOT EXISTS video_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    snapshot_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, snapshot_date)
);

-- Runtime Settings
CREATE TABLE IF NOT EXISTS runtime_settings (
    key VARCHAR PRIMARY KEY,
    value VARCHAR,
    is_secret BOOLEAN DEFAULT FALSE NOT NULL,
    updated_by_user_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'operator' NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_target_channels_username ON target_channels(username);
CREATE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(name);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_videos_campaign ON videos(campaign_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_task_status ON task_queue(status);

-- =====================================================
-- AUTO CREATE USER PROFILE
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SUCCESS
-- =====================================================

SELECT 'Setup complete!' as message;
