export interface Database {
  public: {
    Tables: {
      target_channels: {
        Row: {
          id: string;
          channel_id: string;
          username: string;
          display_name: string | null;
          topic: string | null;
          status: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          name: string | null;
          topic: string | null;
          view_threshold: number;
          source_url: string | null;
          source_platform: string | null;
          source_kind: string | null;
          status: string;
          auto_post: boolean;
          target_page_id: string | null;
          schedule_interval: number;
          last_synced_at: string | null;
          last_sync_status: string | null;
          last_sync_error: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      videos: {
        Row: {
          id: string;
          campaign_id: string | null;
          original_id: string | null;
          source_platform: string | null;
          source_kind: string | null;
          source_video_url: string | null;
          file_path: string | null;
          original_caption: string | null;
          ai_caption: string | null;
          thumbnail_url: string | null;
          status: string;
          views: number;
          likes: number;
          comments_count: number;
          priority: number;
          publish_time: string | null;
          fb_post_id: string | null;
          last_error: string | null;
          retry_count: number;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      facebook_pages: {
        Row: {
          id: string;
          page_id: string | null;
          page_name: string | null;
          long_lived_access_token: string | null;
          auto_post: boolean;
          auto_comment: boolean;
          auto_inbox: boolean;
          caption_prompt: string | null;
          comment_ai_prompt: string | null;
          message_ai_prompt: string | null;
          comment_auto_reply_enabled: boolean;
          message_auto_reply_enabled: boolean;
          message_reply_schedule_enabled: boolean;
          message_reply_start_time: string;
          message_reply_end_time: string;
          message_reply_cooldown_minutes: number;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      task_queue: {
        Row: {
          id: string;
          task_type: string;
          entity_type: string | null;
          entity_id: string | null;
          payload: Json;
          status: string;
          priority: number;
          attempts: number;
          max_attempts: number;
          last_error: string | null;
          available_at: string;
          locked_at: string | null;
          locked_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}