import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// In-memory dedup cache to prevent processing same update twice
const processedUpdates = new Set<number>();

async function sendTypingAction(botToken: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendTelegramPhoto(botToken: string, chatId: number, photo: string, caption?: string) {
  const body: any = { chat_id: chatId, photo, parse_mode: "HTML" };
  if (caption) body.caption = caption;
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json();
}

async function sendTelegramVideo(botToken: string, chatId: number, video: string, caption?: string) {
  const body: any = { chat_id: chatId, video, parse_mode: "HTML" };
  if (caption) body.caption = caption;
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json();
}

function humanizeDelay(text: string): number {
  const words = text.split(" ").length;
  const baseDelay = Math.min(words * 400, 3000);
  const jitter = Math.random() * 1200;
  return baseDelay + jitter + 500;
}

function getLocalTime(timezone: string): { hour: number; minute: number; dayOfWeek: number; formatted: string } {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: timezone, hour: "numeric", minute: "numeric", hour12: false, weekday: "long" };
    const parts = new Intl.DateTimeFormat("es-CO", options).formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "12");
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    const weekday = parts.find(p => p.type === "weekday")?.value || "lunes";
    const dayOfWeek = now.getDay();
    
    let timeOfDay = "madrugada";
    if (hour >= 6 && hour < 12) timeOfDay = "mañana";
    else if (hour >= 12 && hour < 14) timeOfDay = "mediodía";
    else if (hour >= 14 && hour < 19) timeOfDay = "tarde";
    else if (hour >= 19 && hour < 23) timeOfDay = "noche";
    else timeOfDay = "madrugada";
    
    return { hour, minute, dayOfWeek, formatted: `Son las ${hour}:${minute < 10 ? "0" + minute : minute} (${timeOfDay}) del ${weekday}` };
  } catch {
    return { hour: 12, minute: 0, dayOfWeek: 1, formatted: "hora desconocida" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const botToken = url.searchParams.get("token");
    const update = await req.json();

    // ===== DEDUP: Prevent processing same update twice =====
    const updateId = update.update_id;
    if (updateId) {
      if (processedUpdates.has(updateId)) {
        console.log(`Skipping duplicate update_id: ${updateId}`);
        return new Response("ok", { status: 200 });
      }
      processedUpdates.add(updateId);
      // Keep cache small - remove old entries if > 500
      if (processedUpdates.size > 500) {
        const arr = Array.from(processedUpdates);
        for (let i = 0; i < 200; i++) processedUpdates.delete(arr[i]);
      }
    }

    // ===== FIND CREATOR BY BOT TOKEN =====
    let creator: any = null;
    if (botToken) {
      const { data } = await supabase
        .from("creators")
        .select("*")
        .eq("telegram_bot_token", botToken)
        .eq("ai_enabled", true)
        .eq("status", "active")
        .single();
      creator = data;
    }

    // Fallback: only if exactly ONE creator exists
    if (!creator) {
      const { data: creators } = await supabase
        .from("creators")
        .select("*")
        .eq("ai_enabled", true)
        .eq("status", "active");
      
      if (creators && creators.length === 1) {
        creator = creators[0];
      } else {
        console.error("No token provided and multiple creators exist. Ignoring.");
        return new Response("ok", { status: 200 });
      }
    }

    if (!creator) return new Response("ok", { status: 200 });
    
    const creatorBotToken = creator.telegram_bot_token;
    if (!creatorBotToken) return new Response("ok", { status: 200 });

    // ===== HANDLE CALLBACK QUERIES =====
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data || "";
      
      try {
        await fetch(`https://api.telegram.org/bot${creatorBotToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id }),
        });
        
        if (data.startsWith("pay_")) {
          const methodIndex = parseInt(data.replace("pay_", ""));
          const config = Array.isArray(creator.payment_methods_config) ? creator.payment_methods_config : [];
          const method = config[methodIndex] as any;
          if (method) {
            const text = `💳 <b>${method.name}</b>\n\n${method.instructions || "Contacta para más info"}`;
            const markup = method.url ? { inline_keyboard: [[{ text: `✅ ${method.button_text || "Pagar"}`, url: method.url }]] } : undefined;
            await sendTelegramMessage(creatorBotToken, chatId, text, markup);
          }
        }
      } catch (e) { console.error("Callback error:", e); }
      return new Response("ok", { status: 200 });
    }
    
    // ===== HANDLE MESSAGES =====
    const message = update.message || update.edited_message;
    if (!message) return new Response("ok", { status: 200 });

    const chatId = message.chat.id;
    const telegramUserId = String(message.from?.id);
    const userText = message.text || "";
    const userLang = message.from?.language_code || "es";
    const firstName = message.from?.first_name || "amigo";
    const username = message.from?.username || "";
    const telegramMessageId = String(message.message_id);

    // ===== DB-LEVEL DEDUP: Check if this telegram_message_id was already processed =====
    const { data: existingMsg } = await supabase
      .from("messages")
      .select("id")
      .eq("telegram_message_id", telegramMessageId)
      .limit(1);

    if (existingMsg && existingMsg.length > 0) {
      console.log(`Message ${telegramMessageId} already processed, skipping.`);
      return new Response("ok", { status: 200 });
    }

    // Upsert fan
    const { data: fan } = await supabase
      .from("fans")
      .upsert({
        creator_id: creator.id,
        telegram_user_id: telegramUserId,
        telegram_username: username,
        first_name: firstName,
        last_name: message.from?.last_name || "",
        language_code: userLang,
        last_active_at: new Date().toISOString(),
      }, { onConflict: "creator_id,telegram_user_id" })
      .select()
      .single();

    if (!fan) return new Response("ok", { status: 200 });

    // Upsert conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .upsert({
        creator_id: creator.id,
        fan_id: fan.id,
        last_message_at: new Date().toISOString(),
      }, { onConflict: "creator_id,fan_id" })
      .select()
      .single();

    if (!conversation) return new Response("ok", { status: 200 });

    // Save user message FIRST
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: userText,
      telegram_message_id: telegramMessageId,
      sent_at: new Date().toISOString(),
    });

    // Get conversation history (last 15 messages for THIS conversation only)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: false })
      .limit(15);

    // History already includes the user message we just inserted - use as-is
    const historyForAI = (history || []).reverse().map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Timezone-aware context
    const localTime = getLocalTime(creator.timezone || "America/Bogota");

    // Emotion context
    const emotionMap: Record<string, string> = {
      happy: "Estás contenta, con energía.",
      sad: "Estás un poco bajoneada.",
      tired: "Estás cansada, msgs cortos.",
      hungry: "Tienes hambre.",
      excited: "Estás emocionada.",
      bored: "Estás aburrida.",
      angry: "Estás irritable.",
      flirty: "Estás coqueta.",
      normal: "Normal, tranquila.",
    };
    const emotionContext = emotionMap[creator.current_emotion] || emotionMap["normal"];

    const langInstruction = userLang === "en"
      ? "User writes English. Reply in casual English."
      : "Responde en español natural.";

    const systemPrompt = `${creator.system_prompt}

HORA ACTUAL: ${localTime.formatted} en ${creator.timezone || "America/Bogota"}.
Actúa coherente con tu horario: si es madrugada estás dormida o medio dormida, si es mañana puedes estar en el gym o despertando, si es tarde puedes estar grabando contenido o descansando, si es noche estás relajada viendo Netflix o similar. NUNCA digas que vas al gym a las 12am o cosas incoherentes con la hora.

ESTADO: ${emotionContext}
IDIOMA: ${langInstruction}

REGLAS DE FORMATO:
- MÁXIMO 1-2 oraciones. Como WhatsApp real.
- NO listas, NO viñetas, NO párrafos.
- Emojis 0-2 max.
- Varía: a veces 1 palabra, a veces frase corta.
- PROHIBIDO asteriscos, markdown, comillas.
- Como persona de 22 años por WhatsApp: rápido, simple.
- NO repitas patrones. NO saludes siempre igual. NO siempre preguntes al final.
- El usuario se llama ${firstName}

PAGO: Si piden contenido VIP, suscripción, precios o cómo pagar, responde natural y breve.`;

    // Call AI - DO NOT add userText again, it's already in historyForAI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...historyForAI,
        ],
        max_tokens: 80,
        temperature: 1.0,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return new Response("ok", { status: 200 });
    }

    const aiData = await aiResponse.json();
    let replyText = aiData.choices?.[0]?.message?.content || "...";
    
    // Clean up AI artifacts
    replyText = replyText.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^["']|["']$/g, "").trim();
    
    // Truncate if too long
    if (replyText.length > 160) {
      const cutoff = replyText.lastIndexOf(" ", 140);
      replyText = replyText.slice(0, cutoff > 50 ? cutoff : 140);
    }

    // Typing delay
    const typingDelay = humanizeDelay(replyText);
    await sendTypingAction(creatorBotToken, chatId);
    await new Promise(resolve => setTimeout(resolve, Math.min(typingDelay, 4000)));

    // Check if user wants payment info
    const wantsPayment = /pagar|pago|suscri|vip|precio|cuánto|cuanto|nequi|binance|comprar|contenido exclusivo|cómo me suscribo|como pago|método|metodo|enlace|link/i.test(userText);
    let replyMarkup = undefined;

    if (wantsPayment) {
      const payConfig = Array.isArray(creator.payment_methods_config) ? creator.payment_methods_config : [];
      if (payConfig.length > 0) {
        const buttons = (payConfig as any[]).map((m: any, i: number) => ([{
          text: `${m.emoji || "💳"} ${m.name}`,
          callback_data: `pay_${i}`,
        }]));
        if (creator.vip_channel_link) {
          buttons.push([{ text: "🔥 Canal VIP", url: creator.vip_channel_link }] as any);
        }
        replyMarkup = { inline_keyboard: buttons };
      } else if (creator.vip_channel_link) {
        replyMarkup = {
          inline_keyboard: [[{ text: "🔥 Ver contenido exclusivo", url: creator.vip_channel_link }]],
        };
      }
    }

    await sendTelegramMessage(creatorBotToken, chatId, replyText, replyMarkup);

    // Save assistant message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: replyText,
      typing_delay_ms: Math.round(typingDelay),
      has_payment_button: !!replyMarkup,
      sent_at: new Date().toISOString(),
    });

    // Update conversation
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      message_count: (conversation.message_count || 0) + 2,
    }).eq("id", conversation.id);

    // Log analytics
    await supabase.from("analytics_events").insert({
      creator_id: creator.id,
      fan_id: fan.id,
      event_type: "message_sent",
      event_data: { user_message: userText.slice(0, 100), ai_tokens: aiData.usage?.total_tokens },
    });

    // Random emotion shift (~5%)
    if (Math.random() < 0.05) {
      const emotions = ["happy", "normal", "tired", "excited", "flirty", "bored"];
      await supabase.from("creators").update({ 
        current_emotion: emotions[Math.floor(Math.random() * emotions.length)] 
      }).eq("id", creator.id);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("ok", { status: 200 });
  }
});
