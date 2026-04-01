import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateCaptionRequest {
  video_id: string;
  original_caption?: string;
  custom_prompt?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { video_id, original_caption, custom_prompt } = await req.json() as GenerateCaptionRequest;

    if (!video_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: video_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default prompt for Facebook Reels
    const defaultPrompt = `You are a social media expert. Create an engaging caption for a Facebook Reels video.
Requirements:
- Maximum 2200 characters
- Include relevant hashtags
- Add a call-to-action
- Make it engaging and trendy

Original caption from video: ${original_caption || "No caption available"}

Generate a new caption:`;

    const prompt = custom_prompt || defaultPrompt;

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedCaption = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Truncate to 2200 characters (Facebook limit)
    const truncatedCaption = generatedCaption.slice(0, 2200);

    // Update video with generated caption
    const { error: updateError } = await supabase
      .from("videos")
      .update({ 
        ai_caption: truncatedCaption,
        updated_at: new Date().toISOString()
      })
      .eq("id", video_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        video_id,
        ai_caption: truncatedCaption,
        chars_used: truncatedCaption.length,
        max_chars: 2200
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