import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CrawlRequest {
  campaign_id: string;
  source_url: string;
  view_threshold?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, source_url, view_threshold = 0 }: CrawlRequest = await req.json();

    if (!campaign_id || !source_url) {
      return new Response(
        JSON.stringify({ error: "campaign_id and source_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze source URL
    const { platform, kind } = analyzeUrl(source_url);

    // Fetch videos using public APIs
    const videos = await fetchVideos(source_url, platform, kind);

    // Filter by view threshold
    const filteredVideos = view_threshold > 0
      ? videos.filter(v => (v.view_count || 0) >= view_threshold)
      : videos;

    // Insert videos
    let inserted = 0;
    for (const video of filteredVideos) {
      const { error } = await supabase
        .from("videos")
        .upsert({
          campaign_id,
          original_id: video.original_id,
          source_platform: platform,
          source_kind: kind,
          source_video_url: video.source_video_url,
          original_caption: video.title,
          thumbnail_url: video.thumbnail_url,
          status: "pending",
        }, {
          onConflict: "campaign_id,original_id",
          ignoreDuplicates: true,
        });

      if (!error) inserted++;
    }

    // Update campaign
    await supabase
      .from("campaigns")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "completed",
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        videos_found: filteredVideos.length,
        videos_inserted: inserted,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Crawl error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function analyzeUrl(url: string): { platform: string; kind: string } {
  const u = url.toLowerCase();
  
  if (u.includes("tiktok.com")) {
    if (u.includes("/video/")) return { platform: "tiktok", kind: "video" };
    return { platform: "tiktok", kind: "profile" };
  }
  
  if (u.includes("youtube.com/shorts/") || u.includes("youtu.be/")) {
    return { platform: "youtube", kind: "shorts" };
  }
  
  return { platform: "unknown", kind: "video" };
}

async function fetchVideos(
  url: string,
  platform: string,
  kind: string
): Promise<any[]> {
  try {
    if (platform === "tiktok") {
      return await fetchTiktok(url, kind);
    }
    if (platform === "youtube") {
      return await fetchYoutube(url);
    }
    return [];
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

async function fetchTiktok(url: string, kind: string): Promise<any[]> {
  const apiUrl = "https://www.tikwm.com/api/";
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `url=${encodeURIComponent(url)}&count=20&cursor=0&web=1&hd=1`,
  });
  
  const data = await response.json();
  
  if (data.code !== 0 || !data.data) return [];
  
  if (kind === "video") {
    const v = data.data;
    return [{
      original_id: v.id || url,
      source_video_url: v.play || v.hdplay || "",
      title: v.title || "",
      thumbnail_url: v.cover || "",
      view_count: v.play_count || 0,
    }];
  }
  
  if (data.data.videos) {
    return data.data.videos.map((v: any) => ({
      original_id: v.video_id,
      source_video_url: v.play || v.hdplay || "",
      title: v.title || v.description || "",
      thumbnail_url: v.cover || "",
      view_count: v.play_count || 0,
    }));
  }
  
  return [];
}

async function fetchYoutube(url: string): Promise<any[]> {
  const patterns = [
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  let videoId: string | null = null;
  for (const p of patterns) {
    const m = url.match(p);
    if (m) { videoId = m[1]; break; }
  }
  
  if (!videoId) return [];
  
  const response = await fetch(
    `https://invidious.snopyta.org/api/v1/videos/${videoId}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  
  const data = await response.json();
  
  if (!data || !data.videoId) return [];
  
  return [{
    original_id: data.videoId,
    source_video_url: data.adaptiveFormats
      ?.filter((f: any) => f.type.startsWith("video"))
      ?.map((f: any) => f.url)[0] || "",
    title: data.title || "",
    thumbnail_url: data.thumbnailThumbnails?.[0]?.url || data.thumbnail || "",
    view_count: data.viewCount || 0,
  }];
}
