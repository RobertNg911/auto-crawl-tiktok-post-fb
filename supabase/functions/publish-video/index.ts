import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  video_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { video_id } = await req.json() as PublishRequest;

    if (!video_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: video_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get video details with campaign info
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select(`
        *,
        campaigns (
          target_page_id,
          auto_post
        )
      `)
      .eq("id", video_id)
      .single();

    if (videoError) throw videoError;
    if (!video) throw new Error("Video not found");

    const campaign = video.campaigns;
    if (!campaign || !campaign.target_page_id) {
      throw new Error("Campaign or target page not configured");
    }

    // Get Facebook page access token
    const { data: page, error: pageError } = await supabase
      .from("facebook_pages")
      .select("page_id, long_lived_access_token")
      .eq("page_id", campaign.target_page_id)
      .single();

    if (pageError) throw pageError;
    if (!page || !page.long_lived_access_token) {
      throw new Error("Facebook page not found or missing access token");
    }

    // Get video file from storage
    const videoPath = video.file_path || `videos/${video_id}.mp4`;
    
    // For now, this is a placeholder - actual implementation would:
    // 1. Get video from Supabase Storage
    // 2. Upload to Facebook Graph API
    // 3. Get post_id
    // 4. Update video status to "posted"

    // Placeholder response
    const fbPostId = `fb_${Date.now()}_${video_id.slice(0, 8)}`;

    // Update video status
    const { error: updateError } = await supabase
      .from("videos")
      .update({ 
        status: "posted",
        fb_post_id: fbPostId,
        updated_at: new Date().toISOString()
      })
      .eq("id", video_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        video_id,
        fb_post_id: fbPostId,
        message: "Video published successfully (placeholder)"
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