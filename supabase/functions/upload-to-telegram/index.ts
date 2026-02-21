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

    const formData = await req.formData();
    const creatorId = formData.get("creator_id") as string;
    const purpose = formData.get("purpose") as string; // "avatar" | "channel_post"
    const caption = formData.get("caption") as string || "";
    const postId = formData.get("post_id") as string || "";

    if (!creatorId) {
      return new Response(JSON.stringify({ error: "creator_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get creator's bot token
    const { data: creator } = await supabase
      .from("creators")
      .select("telegram_bot_token, telegram_channel_id")
      .eq("id", creatorId)
      .single();

    if (!creator?.telegram_bot_token) {
      return new Response(JSON.stringify({ error: "Creator sin bot token configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect all files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No se enviaron archivos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { file_id: string; file_type: string }[] = [];

    if (purpose === "avatar") {
      // Upload single photo to Telegram by sending to saved messages (bot's own chat)
      // We use a private channel or the bot sends to itself - use sendPhoto to a temp storage
      const file = files[0];
      const tgForm = new FormData();
      tgForm.append("chat_id", creator.telegram_channel_id || creatorId);
      tgForm.append("photo", file, file.name);

      // Send to channel as storage - then delete. Or use a helper approach.
      // Best approach: send to channel, get file_id, then use it as avatar URL via Telegram CDN
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/sendPhoto`, {
        method: "POST",
        body: tgForm,
      });
      const data = await res.json();
      
      if (!data.ok) {
        return new Response(JSON.stringify({ error: data.description || "Error subiendo foto" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fileId = data.result.photo[data.result.photo.length - 1]?.file_id;
      
      // Get file path to construct URL
      const fileRes = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result?.file_path;
      const avatarUrl = `https://api.telegram.org/file/bot${creator.telegram_bot_token}/${filePath}`;

      // Update creator avatar
      await supabase.from("creators").update({ avatar_url: avatarUrl }).eq("id", creatorId);

      // Delete the message from channel to keep it clean
      if (data.result.message_id && creator.telegram_channel_id) {
        await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: creator.telegram_channel_id, message_id: data.result.message_id }),
        });
      }

      return new Response(JSON.stringify({ avatar_url: avatarUrl, file_id: fileId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // purpose === "channel_post" - Upload photos/videos to channel
    if (!creator.telegram_channel_id) {
      return new Response(JSON.stringify({ error: "Creator sin canal configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (files.length === 1) {
      // Single photo
      const file = files[0];
      const isVideo = file.type.startsWith("video/");
      const tgForm = new FormData();
      tgForm.append("chat_id", creator.telegram_channel_id);
      tgForm.append(isVideo ? "video" : "photo", file, file.name);
      if (caption) tgForm.append("caption", caption);
      tgForm.append("parse_mode", "HTML");

      const endpoint = isVideo ? "sendVideo" : "sendPhoto";
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/${endpoint}`, {
        method: "POST",
        body: tgForm,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description);

      let fileId = "";
      if (data.result.photo) fileId = data.result.photo[data.result.photo.length - 1]?.file_id;
      if (data.result.video) fileId = data.result.video.file_id;
      results.push({ file_id: fileId, file_type: isVideo ? "video" : "photo" });

      // Update post if postId
      if (postId) {
        await supabase.from("channel_posts").update({
          status: "published",
          published_at: new Date().toISOString(),
          telegram_message_id: String(data.result.message_id),
          engagement: { file_id: fileId, views: 0, reactions: 0, shares: 0 },
        }).eq("id", postId);
      }
    } else {
      // Multiple photos - use sendMediaGroup (up to 10)
      const mediaGroup: any[] = [];
      const tgForm = new FormData();
      tgForm.append("chat_id", creator.telegram_channel_id);

      for (let i = 0; i < Math.min(files.length, 10); i++) {
        const file = files[i];
        const isVideo = file.type.startsWith("video/");
        const attachKey = `file_${i}`;
        tgForm.append(attachKey, file, file.name);
        mediaGroup.push({
          type: isVideo ? "video" : "photo",
          media: `attach://${attachKey}`,
          ...(i === 0 && caption ? { caption, parse_mode: "HTML" } : {}),
        });
      }

      tgForm.append("media", JSON.stringify(mediaGroup));

      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/sendMediaGroup`, {
        method: "POST",
        body: tgForm,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description);

      for (const msg of data.result) {
        let fileId = "";
        if (msg.photo) fileId = msg.photo[msg.photo.length - 1]?.file_id;
        if (msg.video) fileId = msg.video?.file_id;
        results.push({ file_id: fileId, file_type: msg.video ? "video" : "photo" });
      }

      if (postId) {
        await supabase.from("channel_posts").update({
          status: "published",
          published_at: new Date().toISOString(),
          telegram_message_id: String(data.result[0]?.message_id),
          engagement: { file_ids: results.map(r => r.file_id), views: 0, reactions: 0, shares: 0 },
        }).eq("id", postId);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
