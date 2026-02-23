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

async function createPaymentLink(provider: string, amount: number, currency: string, creatorId: string, fanId: string | null, purpose: string) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON}` },
    body: JSON.stringify({ action: "create_link", provider, amount, currency, creator_id: creatorId, fan_id: fanId, purpose }),
  });
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const botToken = url.searchParams.get("token");
    const update = await req.json();

    // Dedup
    const updateId = update.update_id;
    if (updateId) {
      if (processedUpdates.has(updateId)) return new Response("ok", { status: 200 });
      processedUpdates.add(updateId);
      if (processedUpdates.size > 500) {
        const arr = Array.from(processedUpdates);
        for (let i = 0; i < 200; i++) processedUpdates.delete(arr[i]);
      }
    }

    // Find creator
    let creator: any = null;
    if (botToken) {
      const { data } = await supabase.from("creators").select("*").eq("telegram_bot_token", botToken).eq("ai_enabled", true).eq("status", "active").single();
      creator = data;
    }
    if (!creator) {
      const { data: creators } = await supabase.from("creators").select("*").eq("ai_enabled", true).eq("status", "active");
      if (creators && creators.length === 1) creator = creators[0];
      else { console.error("No token provided and multiple creators exist. Ignoring."); return new Response("ok", { status: 200 }); }
    }
    if (!creator) return new Response("ok", { status: 200 });
    const creatorBotToken = creator.telegram_bot_token;
    if (!creatorBotToken) return new Response("ok", { status: 200 });

    // ===== CALLBACK QUERIES =====
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const cbData = cb.data || "";
      const userId = String(cb.from?.id);
      
      try {
        await fetch(`https://api.telegram.org/bot${creatorBotToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id }),
        });

        const { data: fanData } = await supabase.from("fans").select("id").eq("telegram_user_id", userId).eq("creator_id", creator.id).single();

        // ===== SUBSCRIPTION PLAN SELECTION =====
        if (cbData.startsWith("sub_plan_")) {
          const planId = cbData.replace("sub_plan_", "");
          const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", planId).single();
          if (plan) {
            // Show payment method buttons for this plan
            const { data: paymentMethods } = await supabase.from("payment_settings").select("provider, config, is_enabled").eq("is_enabled", true);
            const buttons: any[][] = [];
            for (const method of paymentMethods || []) {
              if (method.provider === "wompi") buttons.push([{ text: "💳 Nequi/PSE/Tarjeta", callback_data: `sub_pay_wompi_${planId}` }]);
              else if (method.provider === "binance") buttons.push([{ text: "🪙 Crypto (USDT)", callback_data: `sub_pay_binance_${planId}` }]);
              else if (method.provider === "ton") buttons.push([{ text: "💎 TON Wallet", callback_data: `sub_pay_ton_${planId}` }]);
              else if (method.provider === "telegram_stars") buttons.push([{ text: "⭐ Telegram Stars", callback_data: `sub_pay_stars_${planId}` }]);
            }
            await sendTelegramMessage(creatorBotToken, chatId,
              `✨ <b>${plan.name}</b> - $${plan.price} ${plan.currency}\n📅 Duración: ${plan.duration_months} ${plan.duration_months === 1 ? "mes" : "meses"}\n\nElige tu método de pago 👇`,
              { inline_keyboard: buttons }
            );
          }
        }
        // ===== SUBSCRIPTION PAYMENT =====
        else if (cbData.startsWith("sub_pay_")) {
          const parts = cbData.replace("sub_pay_", "").split("_");
          const provider = parts[0];
          const planId = parts.slice(1).join("_");
          const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", planId).single();
          if (plan) {
            if (provider === "stars") {
              const starAmount = Math.round(plan.price * 10); // rough conversion
              await fetch(`https://api.telegram.org/bot${creatorBotToken}/sendInvoice`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  title: `👑 ${plan.name} - ${creator.name}`,
                  description: `Suscripción VIP por ${plan.duration_months} ${plan.duration_months === 1 ? "mes" : "meses"}`,
                  payload: `sub_${planId}_${userId}_${Date.now()}`,
                  provider_token: "",
                  currency: "XTR",
                  prices: [{ label: `⭐ ${plan.name}`, amount: starAmount }],
                }),
              });
            } else {
              const amountMap: Record<string, number> = {
                wompi: plan.price * (plan.currency === "COP" ? 1 : 4000), // convert USD to COP approx
                binance: plan.price,
                ton: plan.price / 5, // rough TON conversion
              };
              const currencyMap: Record<string, string> = { wompi: "COP", binance: "USDT", ton: "TON" };
              const payData = await createPaymentLink(provider, amountMap[provider] || plan.price, currencyMap[provider] || plan.currency, creator.id, fanData?.id || null, `subscription_${plan.duration_months}m`);
              if (payData.url) {
                const labels: Record<string, string> = { wompi: "💳 Completar pago", binance: "🪙 Pagar con Crypto", ton: "💎 Abrir wallet TON" };
                await sendTelegramMessage(creatorBotToken, chatId,
                  `✅ <b>Pago listo!</b>\n\n👑 ${plan.name} - $${plan.price} ${plan.currency}\n📅 ${plan.duration_months} ${plan.duration_months === 1 ? "mes" : "meses"}\n\nHaz clic abajo para completar 👇`,
                  { inline_keyboard: [[{ text: labels[provider] || "💳 Pagar", url: payData.url }]] }
                );
              } else {
                await sendTelegramMessage(creatorBotToken, chatId, "❌ Error generando el pago, intenta de nuevo");
              }
            }
          }
        }
        // ===== GIFT PAYMENT =====
        else if (cbData.startsWith("gift_")) {
          const giftId = cbData.replace("gift_", "");
          const { data: gift } = await supabase.from("gift_items").select("*").eq("id", giftId).single();
          if (gift) {
            // Use first enabled payment method
            const { data: paymentMethods } = await supabase.from("payment_settings").select("provider, config, is_enabled").eq("is_enabled", true).limit(1);
            const pm = paymentMethods?.[0];
            if (pm) {
              if (pm.provider === "telegram_stars") {
                const starAmount = Math.round(gift.price * 10);
                await fetch(`https://api.telegram.org/bot${creatorBotToken}/sendInvoice`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    title: `${gift.emoji} ${gift.name}`,
                    description: `Regalo para ${creator.name} 💖`,
                    payload: `gift_${giftId}_${userId}_${Date.now()}`,
                    provider_token: "",
                    currency: "XTR",
                    prices: [{ label: `${gift.emoji} ${gift.name}`, amount: starAmount }],
                  }),
                });
              } else {
                const amount = pm.provider === "wompi" ? gift.price * 4000 : gift.price;
                const currency = pm.provider === "wompi" ? "COP" : pm.provider === "binance" ? "USDT" : "TON";
                const payData = await createPaymentLink(pm.provider, amount, currency, creator.id, fanData?.id || null, `gift_${gift.name}`);
                if (payData.url) {
                  await sendTelegramMessage(creatorBotToken, chatId,
                    `${gift.emoji} <b>${gift.name}</b> - $${gift.price} ${gift.currency}\n\nGracias por tu regalo! 🥰`,
                    { inline_keyboard: [[{ text: "💳 Enviar regalo", url: payData.url }]] }
                  );
                }
              }
            }
          }
        }
        // ===== CUSTOM TIP =====
        else if (cbData === "tip_custom") {
          await sendTelegramMessage(creatorBotToken, chatId, "💰 Envía el monto que quieras como propina escribiendo:\n\n<code>/propina 15</code>\n\n(reemplaza 15 por el valor en USD que desees)");
        }
        // ===== SHOW GIFTS =====
        else if (cbData === "show_gifts") {
          const { data: giftItems } = await supabase.from("gift_items").select("*").eq("is_active", true).order("sort_order");
          if (giftItems && giftItems.length > 0) {
            const buttons = giftItems.map(g => [{ text: `${g.emoji} ${g.name} - $${g.price}`, callback_data: `gift_${g.id}` }]);
            await sendTelegramMessage(creatorBotToken, chatId,
              `🎁 <b>Elige un regalo para ${creator.name}</b>\n\nCada regalo tiene un valor especial 💖`,
              { inline_keyboard: buttons }
            );
          } else {
            await sendTelegramMessage(creatorBotToken, chatId, "🎁 No hay regalos disponibles por ahora");
          }
        }
        // ===== SHOW SUBSCRIPTION PLANS =====
        else if (cbData === "show_plans") {
          const { data: subPlans } = await supabase.from("subscription_plans").select("*").eq("creator_id", creator.id).eq("is_active", true).order("duration_months");
          if (subPlans && subPlans.length > 0) {
            const buttons = subPlans.map(p => [{ text: `👑 ${p.name} - $${p.price} (${p.duration_months} ${p.duration_months === 1 ? "mes" : "meses"})`, callback_data: `sub_plan_${p.id}` }]);
            await sendTelegramMessage(creatorBotToken, chatId,
              `👑 <b>Planes VIP de ${creator.name}</b>\n\nElige tu plan de suscripción 👇`,
              { inline_keyboard: buttons }
            );
          } else {
            await sendTelegramMessage(creatorBotToken, chatId, "👑 No hay planes disponibles por ahora");
          }
        }
        // ===== LEGACY PAYMENT CALLBACKS =====
        else if (cbData === "pay_wompi" || cbData === "pay_binance" || cbData === "pay_ton") {
          const provider = cbData.replace("pay_", "");
          const amounts: Record<string, number> = { wompi: 10000, binance: 5, ton: 0.5 };
          const currencies: Record<string, string> = { wompi: "COP", binance: "USDT", ton: "TON" };
          const payData = await createPaymentLink(provider, amounts[provider], currencies[provider], creator.id, fanData?.id || null, "tip");
          if (payData.url) {
            const labels: Record<string, string> = { wompi: "💳 Pagar con Nequi/PSE", binance: "🪙 Pagar con Crypto", ton: "💎 Abrir wallet TON" };
            await sendTelegramMessage(creatorBotToken, chatId,
              `✨ <b>Link de pago listo!</b>\n\nHaz clic abajo para completar 👇`,
              { inline_keyboard: [[{ text: labels[provider] || "💳 Pagar", url: payData.url }]] }
            );
          } else {
            await sendTelegramMessage(creatorBotToken, chatId, "❌ Error generando el pago, intenta de nuevo");
          }
        } else if (cbData === "pay_stars") {
          await fetch(`https://api.telegram.org/bot${creatorBotToken}/sendInvoice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              title: "⭐ Apoyo con Estrellas",
              description: `Apoya a ${creator.name} con estrellas de Telegram 💖`,
              payload: `stars_${Date.now()}_${userId}`,
              provider_token: "",
              currency: "XTR",
              prices: [{ label: "⭐ Estrellas", amount: 50 }],
            }),
          });
        } else if (cbData.startsWith("tip_")) {
          const amount = parseInt(cbData.replace("tip_", ""));
          const payData = await createPaymentLink("wompi", amount, "COP", creator.id, fanData?.id || null, "tip");
          if (payData.url) {
            await sendTelegramMessage(creatorBotToken, chatId,
              `💖 <b>Propina de $${amount.toLocaleString()}</b>\n\nGracias por tu generosidad! 🥰`,
              { inline_keyboard: [[{ text: "💳 Completar propina", url: payData.url }]] }
            );
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

    // DB-level dedup
    const { data: existingMsg } = await supabase.from("messages").select("id").eq("telegram_message_id", telegramMessageId).limit(1);
    if (existingMsg && existingMsg.length > 0) return new Response("ok", { status: 200 });

    // Handle /propina command
    const propinaMatch = userText.match(/^\/propina\s+(\d+)/i);
    if (propinaMatch) {
      const tipAmount = parseInt(propinaMatch[1]);
      const { data: fan } = await supabase.from("fans").select("id").eq("telegram_user_id", telegramUserId).eq("creator_id", creator.id).single();
      const payData = await createPaymentLink("wompi", tipAmount * 4000, "COP", creator.id, fan?.id || null, "tip");
      if (payData.url) {
        await sendTelegramMessage(creatorBotToken, chatId,
          `💖 <b>Propina de $${tipAmount} USD</b>\n\nGracias por tu generosidad! 🥰`,
          { inline_keyboard: [[{ text: "💳 Completar propina", url: payData.url }]] }
        );
      }
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

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: userText,
      telegram_message_id: telegramMessageId,
      sent_at: new Date().toISOString(),
    });

    // Get history
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

    const localTime = getLocalTime(creator.timezone || "America/Bogota");

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
    replyText = replyText.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^["']|["']$/g, "").trim();
    if (replyText.length > 160) {
      const cutoff = replyText.lastIndexOf(" ", 140);
      replyText = replyText.slice(0, cutoff > 50 ? cutoff : 140);
    }

    const typingDelay = humanizeDelay(replyText);
    await sendTypingAction(creatorBotToken, chatId);
    await new Promise(resolve => setTimeout(resolve, Math.min(typingDelay, 4000)));

    // Detect intent
    const wantsSubscription = /suscri|vip|precio|cuánto|cuanto|cómo me suscribo|como pago|plan|premium/i.test(userText);
    const wantsTip = /propina|tip|donar|dona|regalo|regalar|apoyar|apoyo|invitar|invitarte/i.test(userText);
    const wantsPayment = /pagar|pago|nequi|binance|comprar|contenido exclusivo|método|metodo|enlace|link/i.test(userText);
    let replyMarkup = undefined;

    if (wantsSubscription) {
      // Show subscription plans
      const buttons: any[][] = [
        [{ text: "👑 Ver Planes VIP", callback_data: "show_plans" }],
      ];
      if (creator.vip_channel_link) {
        buttons.push([{ text: "🔥 Canal VIP Exclusivo", url: creator.vip_channel_link }]);
      }
      replyMarkup = { inline_keyboard: buttons };
    } else if (wantsTip) {
      // Show gift and tip options
      const buttons: any[][] = [
        [{ text: "🎁 Enviar Regalo", callback_data: "show_gifts" }],
        [{ text: "💰 Propina personalizada", callback_data: "tip_custom" }],
        [
          { text: "☕ $5", callback_data: "tip_5000" },
          { text: "🌹 $10", callback_data: "tip_10000" },
          { text: "💎 $25", callback_data: "tip_25000" },
        ],
      ];
      replyMarkup = { inline_keyboard: buttons };
    } else if (wantsPayment) {
      const { data: paymentMethods } = await supabase.from("payment_settings").select("provider, config, is_enabled").eq("is_enabled", true);
      const buttons: any[][] = [];
      for (const method of paymentMethods || []) {
        if (method.provider === "wompi") buttons.push([{ text: "💳 Pagar con Nequi/PSE/Tarjeta", callback_data: "pay_wompi" }]);
        else if (method.provider === "binance") buttons.push([{ text: "🪙 Pagar con Crypto (USDT)", callback_data: "pay_binance" }]);
        else if (method.provider === "ton") buttons.push([{ text: "💎 Pagar con TON", callback_data: "pay_ton" }]);
        else if (method.provider === "telegram_stars") buttons.push([{ text: "⭐ Enviar Estrellas", callback_data: "pay_stars" }]);
      }
      if (buttons.length > 0) replyMarkup = { inline_keyboard: buttons };
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

    // Random emotion shift
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
