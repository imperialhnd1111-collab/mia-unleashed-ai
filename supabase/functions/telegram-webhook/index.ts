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
  // Simulate human typing speed (avg 40-60 wpm)
  const words = text.split(" ").length;
  const baseDelay = Math.min(words * 300, 4000);
  const jitter = Math.random() * 800;
  return baseDelay + jitter;
}

function addHumanErrors(text: string): string {
  // Occasionally add minor typos or naturalness (10% chance per word)
  if (Math.random() > 0.15) return text;
  const corrections = [
    ["que", "q"],
    ["porque", "xq"],
    ["también", "tmb"],
    ["estoy", "toy"],
    ["más", "mas"],
  ];
  let result = text;
  corrections.forEach(([from, to]) => {
    if (Math.random() > 0.7) {
      result = result.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
    }
  });
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const update = await req.json();
    const message = update.message || update.edited_message;
    if (!message) return new Response("ok", { status: 200 });

    const chatId = message.chat.id;
    const telegramUserId = String(message.from?.id);
    const userText = message.text || "";
    const userLang = message.from?.language_code || "es";
    const firstName = message.from?.first_name || "amigo";
    const username = message.from?.username || "";

    // Find the creator by matching the bot token from the webhook URL
    // We use a workaround: find any active creator with ai_enabled
    const { data: creators } = await supabase
      .from("creators")
      .select("*")
      .eq("ai_enabled", true)
      .eq("status", "active")
      .limit(1);

    if (!creators || creators.length === 0) {
      return new Response("ok", { status: 200 });
    }

    const creator = creators[0];

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

    // Get conversation history (last 20 messages)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: false })
      .limit(20);

    const historyForAI = (history || []).reverse().map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Build emotion context
    const emotionMap: Record<string, string> = {
      happy: "Estás de muy buen humor hoy, con energía y cariñosa.",
      sad: "Estás un poco triste hoy, aunque intentas no mostrarlo mucho.",
      tired: "Estás cansada del gym o del trabajo, tus respuestas son más cortas.",
      hungry: "Tienes hambre y lo mencionas de vez en cuando.",
      excited: "Estás emocionada por algo que pasó hoy.",
      bored: "Estás aburrida en casa, dispuesta a conversar.",
      angry: "Estás un poco irritable, aunque no con el usuario.",
      flirty: "Estás en modo coqueta, más amorosa y atenta.",
      normal: "Estás en tu modo normal, tranquila y accesible.",
    };

    const emotionContext = emotionMap[creator.current_emotion] || emotionMap["normal"];

    // Determine language
    const langInstruction = userLang === "en"
      ? "The user writes in English. Respond naturally in English while maintaining your Colombian personality."
      : "El usuario escribe en español. Responde en español natural colombiano.";

    const systemPrompt = `${creator.system_prompt}

ESTADO EMOCIONAL ACTUAL: ${emotionContext}

ADAPTACIÓN DE IDIOMA: ${langInstruction}

INSTRUCCIONES ADICIONALES:
- Escribe exactamente como lo haría una persona real en Telegram
- Usa abreviaciones naturales, emojis ocasionales pero no excesivos
- Varía la longitud de tus respuestas (a veces solo 1 palabra, a veces un párrafo)
- Si el usuario es agresivo, pon límites de forma natural sin ser grosera
- Recuerda: el usuario se llama ${firstName}

CONTEXTO DE MONETIZACIÓN:
- Canal VIP: ${creator.vip_channel_link || "disponible próximamente"}
- Métodos de pago: ${Array.isArray(creator.payment_methods) ? creator.payment_methods.join(", ") : "Nequi, PSE, Crypto"}
- Solo menciona pagos/ventas de forma natural cuando la conversación fluya hacia eso
`;

    // Call Lovable AI
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
        max_tokens: 300,
        temperature: 0.9,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response("ok", { status: 200 });
    }

    const aiData = await aiResponse.json();
    let replyText = aiData.choices?.[0]?.message?.content || "...";
    replyText = addHumanErrors(replyText);

    // Simulate typing delay
    const typingDelay = humanizeDelay(replyText);
    await sendTypingAction(creator.telegram_bot_token, chatId);
    await new Promise(resolve => setTimeout(resolve, Math.min(typingDelay, 5000)));

    // Check if we should add payment button (only for explicit content requests)
    const wantsContent = /vip|exclusivo|contenido|fotos|videos|pack|precio|cuánto|cuanto|comprar/i.test(userText);
    let replyMarkup = undefined;
    if (wantsContent && creator.vip_channel_link) {
      replyMarkup = {
        inline_keyboard: [[
          { text: "🔥 Ver contenido exclusivo", url: creator.vip_channel_link },
        ]],
      };
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

    // Update conversation stats
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

    // Randomly update emotion (every ~20 messages)
    if (Math.random() < 0.05) {
      const emotions = ["happy", "normal", "tired", "excited", "flirty", "bored"];
      const newEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      await supabase.from("creators").update({ current_emotion: newEmotion }).eq("id", creator.id);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("ok", { status: 200 });
  }
});
