import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CrawlerRequest {
  channel_username: string;
  campaign_id: string;
  view_threshold?: number;
}

interface TikTokVideo {
  id: string;
  url: string;
  description: string;
  create_time: number;
  stats: {
    play_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { channel_username, campaign_id, view_threshold = 0 } = await req.json() as CrawlerRequest;

    if (!channel_username || !campaign_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: channel_username, campaign_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // NOTE: yt-dlp cannot run in Supabase Edge Functions (Deno runtime)
    // For production, use a dedicated crawler service or external API
    // This is a placeholder that simulates the crawler response

    // In production, replace with actual TikTok API or external crawler
    // Example using TikTok API:
    // const tiktokApiUrl = `https://api.tiktok.com/v1/channel/${channel_username}/videos`;

    // For now, return a mock response structure
    const mockVideos: TikTokVideo[] = [];

    // Return the crawl job ID - actual crawling should be handled by external service
    const { data: task, error: taskError } = await supabase
      .from("task_queue")
      .insert({
        task_type: "crawl_channel",
        entity_type: "campaign",
        entity_id: campaign_id,
        payload: {
          channel_username,
          view_threshold,
          platform: "tiktok"
        },
        status: "queued",
        priority: 10
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Crawl task queued",
        task_id: task.id,
        videos_found: mockVideos.length,
        note: "Edge function placeholder - use external crawler service for production"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});