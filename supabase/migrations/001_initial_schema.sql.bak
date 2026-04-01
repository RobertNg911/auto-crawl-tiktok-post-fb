-- Migration: 001_initial_schema
-- Description: Initial schema migration for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Target Channels Table
CREATE TABLE target_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(255),
    topic VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_target_channels_username ON target_channels(username);
CREATE INDEX idx_target_channels_status ON target_channels(status);

-- Campaigns Table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX idx_campaigns_name ON campaigns(name);
CREATE INDEX idx_campaigns_topic ON campaigns(topic);
CREATE INDEX idx_campaigns_source_platform ON campaigns(source_platform);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Videos Table
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, original_id)
);

CREATE INDEX idx_videos_original_id ON videos(original_id);
CREATE INDEX idx_videos_source_platform ON videos(source_platform);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_campaign_id ON videos(campaign_id);

-- Facebook Pages Table
CREATE TABLE facebook_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    message_reply_schedule_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    message_reply_start_time VARCHAR DEFAULT '08:00' NOT NULL,
    message_reply_end_time VARCHAR DEFAULT '22:00' NOT NULL,
    message_reply_cooldown_minutes INTEGER DEFAULT 0 NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facebook_pages_page_id ON facebook_pages(page_id);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR UNIQUE,
    display_name VARCHAR,
    password_hash VARCHAR NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    must_change_password BOOLEAN DEFAULT FALSE NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);

-- Inbox Conversations Table
CREATE TABLE inbox_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id VARCHAR REFERENCES facebook_pages(page_id),
    sender_id VARCHAR NOT NULL,
    recipient_id VARCHAR,
    status VARCHAR(20) DEFAULT 'ai_active' NOT NULL,
    conversation_summary VARCHAR,
    current_intent VARCHAR,
    customer_facts JSONB,
    needs_handoff BOOLEAN DEFAULT FALSE NOT NULL,
    handoff_reason VARCHAR,
    assigned_to_user_id UUID REFERENCES users(id),
    internal_note VARCHAR,
    latest_customer_message_id VARCHAR,
    latest_reply_message_id VARCHAR,
    last_customer_message_at TIMESTAMPTZ,
    last_ai_reply_at TIMESTAMPTZ,
    last_operator_reply_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, sender_id)
);

CREATE INDEX idx_inbox_conversations_page_id ON inbox_conversations(page_id);
CREATE INDEX idx_inbox_conversations_sender_id ON inbox_conversations(sender_id);
CREATE INDEX idx_inbox_conversations_status ON inbox_conversations(status);
CREATE INDEX idx_inbox_conversations_assigned_user_id ON inbox_conversations(assigned_to_user_id);

-- Interactions Log Table
CREATE TABLE interactions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id VARCHAR REFERENCES facebook_pages(page_id),
    post_id VARCHAR,
    comment_id VARCHAR UNIQUE,
    user_id VARCHAR,
    user_message VARCHAR,
    ai_reply VARCHAR,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inbox Message Logs Table
CREATE TABLE inbox_message_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id VARCHAR REFERENCES facebook_pages(page_id),
    conversation_id UUID REFERENCES inbox_conversations(id),
    facebook_message_id VARCHAR UNIQUE,
    sender_id VARCHAR,
    recipient_id VARCHAR,
    user_message VARCHAR,
    ai_reply VARCHAR,
    facebook_reply_message_id VARCHAR,
    reply_source VARCHAR,
    reply_author_user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    last_error VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inbox_message_logs_page_id ON inbox_message_logs(page_id);
CREATE INDEX idx_inbox_message_logs_conversation_id ON inbox_message_logs(conversation_id);
CREATE INDEX idx_inbox_message_logs_facebook_message_id ON inbox_message_logs(facebook_message_id);
CREATE INDEX idx_inbox_message_logs_sender_id ON inbox_message_logs(sender_id);

-- Task Queue Table
CREATE TABLE task_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type VARCHAR NOT NULL,
    entity_type VARCHAR,
    entity_id VARCHAR,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'queued',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error VARCHAR,
    available_at TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_queue_task_type ON task_queue(task_type);
CREATE INDEX idx_task_queue_entity_type ON task_queue(entity_type);
CREATE INDEX idx_task_queue_entity_id ON task_queue(entity_id);
CREATE INDEX idx_task_queue_status ON task_queue(status);

-- Worker Heartbeats Table
CREATE TABLE worker_heartbeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name VARCHAR UNIQUE NOT NULL,
    app_role VARCHAR NOT NULL,
    hostname VARCHAR,
    status VARCHAR DEFAULT 'idle' NOT NULL,
    current_task_id VARCHAR,
    current_task_type VARCHAR,
    details JSONB,
    last_seen_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worker_heartbeats_worker_name ON worker_heartbeats(worker_name);

-- System Events Table
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope VARCHAR NOT NULL,
    level VARCHAR NOT NULL,
    message VARCHAR NOT NULL,
    details JSONB,
    actor_user_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_events_scope ON system_events(scope);
CREATE INDEX idx_system_events_level ON system_events(level);
CREATE INDEX idx_system_events_created_at ON system_events(created_at);

-- Channel Metrics Snapshots Table
CREATE TABLE channel_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES target_channels(id) ON DELETE CASCADE NOT NULL,
    followers INTEGER DEFAULT 0 NOT NULL,
    following INTEGER DEFAULT 0 NOT NULL,
    likes INTEGER DEFAULT 0 NOT NULL,
    video_count INTEGER DEFAULT 0 NOT NULL,
    total_views INTEGER DEFAULT 0 NOT NULL,
    snapshot_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, snapshot_date)
);

CREATE INDEX idx_channel_metrics_snapshots_channel_id ON channel_metrics_snapshots(channel_id);
CREATE INDEX idx_channel_metrics_snapshots_snapshot_date ON channel_metrics_snapshots(snapshot_date);

-- Video Metrics Snapshots Table
CREATE TABLE video_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
    views INTEGER DEFAULT 0 NOT NULL,
    likes INTEGER DEFAULT 0 NOT NULL,
    comments INTEGER DEFAULT 0 NOT NULL,
    shares INTEGER DEFAULT 0 NOT NULL,
    snapshot_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, snapshot_date)
);

CREATE INDEX idx_video_metrics_snapshots_video_id ON video_metrics_snapshots(video_id);
CREATE INDEX idx_video_metrics_snapshots_snapshot_date ON video_metrics_snapshots(snapshot_date);

-- Runtime Settings Table
CREATE TABLE runtime_settings (
    key VARCHAR PRIMARY KEY,
    value VARCHAR,
    is_secret BOOLEAN DEFAULT FALSE NOT NULL,
    updated_by_user_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (true);

-- Service role has full access (for serverless functions)
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Enable realtime for task_queue (for workers)
ALTER PUBLICATION supabase_realtime ADD TABLE task_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE videos;
ALTER PUBLICATION supabase_realtime ADD TABLE worker_heartbeats;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_target_channels_updated_at BEFORE UPDATE ON target_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_pages_updated_at BEFORE UPDATE ON facebook_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inbox_conversations_updated_at BEFORE UPDATE ON inbox_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interactions_log_updated_at BEFORE UPDATE ON interactions_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inbox_message_logs_updated_at BEFORE UPDATE ON inbox_message_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_queue_updated_at BEFORE UPDATE ON task_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_heartbeats_updated_at BEFORE UPDATE ON worker_heartbeats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runtime_settings_updated_at BEFORE UPDATE ON runtime_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
