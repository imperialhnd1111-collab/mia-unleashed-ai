import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find posts that are scheduled and past their scheduled_at time
    const now = new Date().toISOString();
    const { data: posts, error } = await supabase
      .from("channel_posts")
      .select("*, creators(name, telegram_bot_token, telegram_channel_id)")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ published: 0, message: "No posts to publish" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let published = 0;
    const results: any[] = [];

    for (const post of posts) {
      const creator = post.creators as any;
      if (!creator?.telegram_bot_token || !creator?.telegram_channel_id) {
        results.push({ id: post.id, error: "Missing bot token or channel ID" });
        continue;
      }

      try {
        let data: any;
        const botToken = creator.telegram_bot_token;
        const channelId = creator.telegram_channel_id;

        if (post.post_type === "photo" && post.media_url) {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channelId,
              photo: post.media_url,
              caption: post.caption || "",
              parse_mode: "HTML",
            }),
          });
          data = await res.json();
        } else if (post.post_type === "video" && post.media_url) {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channelId,
              video: post.media_url,
              caption: post.caption || "",
              parse_mode: "HTML",
            }),
          });
          data = await res.json();
        } else {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channelId,
              text: post.caption || "",
              parse_mode: "HTML",
            }),
          });
          data = await res.json();
        }

        if (!data.ok) {
          results.push({ id: post.id, error: data.description });
          // Mark as failed
          await supabase.from("channel_posts").update({ status: "failed" }).eq("id", post.id);
          continue;
        }

        const telegramMsgId = String(data.result.message_id);
        let fileId = null;
        if (data.result.photo) fileId = data.result.photo[data.result.photo.length - 1]?.file_id;
        if (data.result.video) fileId = data.result.video.file_id;

        await supabase.from("channel_posts").update({
          status: "published",
          published_at: new Date().toISOString(),
          telegram_message_id: telegramMsgId,
          engagement: { file_id: fileId, views: 0, reactions: 0, shares: 0 },
        }).eq("id", post.id);

        published++;
        results.push({ id: post.id, success: true, telegram_message_id: telegramMsgId });
      } catch (e: any) {
        results.push({ id: post.id, error: e.message });
        await supabase.from("channel_posts").update({ status: "failed" }).eq("id", post.id);
      }
    }

    console.log(`Published ${published}/${posts.length} scheduled posts`);

    return new Response(JSON.stringify({ published, total: posts.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Publish scheduled error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
