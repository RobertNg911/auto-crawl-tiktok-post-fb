import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DownloadRequest {
  video_id: string;
  video_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { video_id, video_url } = await req.json() as DownloadRequest;

    if (!video_id || !video_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: video_id, video_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update video status to downloading
    await supabase
      .from("videos")
      .update({ status: "downloading", updated_at: new Date().toISOString() })
      .eq("id", video_id);

    // NOTE: yt-dlp cannot run in Supabase Edge Functions (Deno runtime)
    // For production, use a dedicated download service or external API
    // This is a placeholder - actual download should be handled by external service

    // For production, consider:
    // 1. AWS Lambda with yt-dlp
    // 2. Dedicated server for downloads
    // 3. Third-party video download API
    // 4. Supabase Edge Function with streaming to storage (if yt-dlp available)

    // Queue download task for external handler
    const { data: task, error: taskError } = await supabase
      .from("task_queue")
      .insert({
        task_type: "download_video",
        entity_type: "video",
        entity_id: video_id,
        payload: {
          video_url,
          destination: `videos/${video_id}.mp4`
        },
        status: "queued",
        priority: 20
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Download task queued",
        task_id: task.id,
        note: "Edge function placeholder - use external download service for production"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Update video status to failed
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try to get video_id from request body for error update
      const body = await req.json().catch(() => ({}));
      if (body.video_id) {
        await supabase
          .from("videos")
          .update({ 
            status: "failed", 
            last_error: error.message,
            retry_count: 1
          })
          .eq("id", body.video_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});