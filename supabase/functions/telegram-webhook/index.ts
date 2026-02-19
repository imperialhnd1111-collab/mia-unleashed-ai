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

function humanizeDelay(text: string): number {
  const words = text.split(" ").length;
  const baseDelay = Math.min(words * 400, 3000);
  const jitter = Math.random() * 1200;
  return baseDelay + jitter + 500;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const update = await req.json();
    
    // Handle callback queries (payment buttons)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data || "";
      
      // Find creator by matching bot token - try all active creators
      const { data: creators } = await supabase
        .from("creators")
        .select("*")
        .eq("ai_enabled", true)
        .eq("status", "active");
      
      if (!creators || creators.length === 0) return new Response("ok", { status: 200 });
      
      // Try to answer callback for any creator that has a valid bot token
      for (const creator of creators) {
        if (!creator.telegram_bot_token) continue;
        try {
          // Answer callback query
          await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: cb.id }),
          });
          
          // Handle payment method selection
          if (data.startsWith("pay_")) {
            const methodIndex = parseInt(data.replace("pay_", ""));
            const config = Array.isArray(creator.payment_methods_config) ? creator.payment_methods_config : [];
            const method = config[methodIndex] as any;
            if (method) {
              const text = `💳 <b>${method.name}</b>\n\n${method.instructions || "Contacta para más info"}`;
              const markup = method.url ? { inline_keyboard: [[{ text: `✅ ${method.button_text || "Pagar"}`, url: method.url }]] } : undefined;
              await sendTelegramMessage(creator.telegram_bot_token, chatId, text, markup);
            }
          }
          break;
        } catch { continue; }
      }
      return new Response("ok", { status: 200 });
    }
    
    const message = update.message || update.edited_message;
    if (!message) return new Response("ok", { status: 200 });

    const chatId = message.chat.id;
    const telegramUserId = String(message.from?.id);
    const userText = message.text || "";
    const userLang = message.from?.language_code || "es";
    const firstName = message.from?.first_name || "amigo";
    const username = message.from?.username || "";

    // CRITICAL FIX: Find creator by trying ALL active creators and testing which bot token works
    const { data: creators } = await supabase
      .from("creators")
      .select("*")
      .eq("ai_enabled", true)
      .eq("status", "active");

    if (!creators || creators.length === 0) return new Response("ok", { status: 200 });

    // Find the right creator by checking which bot token can reach this chat
    let creator = null;
    for (const c of creators) {
      if (!c.telegram_bot_token) continue;
      try {
        const res = await fetch(`https://api.telegram.org/bot${c.telegram_bot_token}/getChat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId }),
        });
        const data = await res.json();
        if (data.ok) { creator = c; break; }
      } catch { continue; }
    }

    if (!creator) return new Response("ok", { status: 200 });

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

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: userText,
      telegram_message_id: String(message.message_id),
      sent_at: new Date().toISOString(),
    });

    // Get conversation history (last 15 messages)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: false })
      .limit(15);

    const historyForAI = (history || []).reverse().map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Emotion context
    const emotionMap: Record<string, string> = {
      happy: "Estás contenta, con energía.",
      sad: "Estás un poco bajoneada hoy.",
      tired: "Estás cansada, tus msgs son cortos.",
      hungry: "Tienes hambre.",
      excited: "Estás emocionada por algo.",
      bored: "Estás aburrida en casa.",
      angry: "Estás irritable.",
      flirty: "Estás coqueta.",
      normal: "Normal, tranquila.",
    };
    const emotionContext = emotionMap[creator.current_emotion] || emotionMap["normal"];

    const langInstruction = userLang === "en"
      ? "User writes English. Reply in casual English."
      : "Responde en español natural.";

    // IMPROVED SYSTEM PROMPT for ultra-short WhatsApp-like messages
    const systemPrompt = `${creator.system_prompt}

ESTADO: ${emotionContext}
IDIOMA: ${langInstruction}

REGLAS DE FORMATO OBLIGATORIAS:
- Responde MÁXIMO 1-2 oraciones. Como un mensaje de WhatsApp real.
- NO hagas listas, NO pongas viñetas, NO escribas párrafos largos.
- Usa emojis con moderación (0-2 por mensaje máximo).
- Varía: a veces responde con 1 sola palabra ("jaja", "sii", "uff"), a veces una frase corta.
- PROHIBIDO usar asteriscos, formato markdown, comillas o estructuras formales.
- Escribe como una persona de 22 años por WhatsApp: rápido, simple, directo.
- NO repitas patrones. NO saludes siempre igual. NO siempre hagas preguntas al final.
- Puedes dejar mensajes sin pregunta, como haría una persona real.
- El usuario se llama ${firstName}

PAGO: Si el usuario pide contenido VIP, suscripción, precios o cómo pagar, responde de forma natural y breve.`;

    // Call AI
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
          { role: "user", content: userText },
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
    
    // Truncate if too long (max ~150 chars for naturalness)
    if (replyText.length > 160) {
      const cutoff = replyText.lastIndexOf(" ", 140);
      replyText = replyText.slice(0, cutoff > 50 ? cutoff : 140);
    }

    // Typing delay
    const typingDelay = humanizeDelay(replyText);
    await sendTypingAction(creator.telegram_bot_token, chatId);
    await new Promise(resolve => setTimeout(resolve, Math.min(typingDelay, 4000)));

    // Check if user wants payment/subscription info
    const wantsPayment = /pagar|pago|suscri|vip|precio|cuánto|cuanto|nequi|binance|comprar|contenido exclusivo|cómo me suscribo|como pago/i.test(userText);
    let replyMarkup = undefined;

    if (wantsPayment) {
      const payConfig = Array.isArray(creator.payment_methods_config) ? creator.payment_methods_config : [];
      if (payConfig.length > 0) {
        // Build payment buttons
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

    await sendTelegramMessage(creator.telegram_bot_token, chatId, replyText, replyMarkup);

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
