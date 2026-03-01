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

// ===== CURRENCY CONVERSION (USD base) =====
const RATES: Record<string, number> = {
  COP: 4200,
  USDT: 1,
  TON: 0.3,   // 1 USD ≈ 0.3 TON
  XTR: 50,    // 1 USD ≈ 50 Stars
};

function convertUSD(usd: number, toCurrency: string): number {
  const rate = RATES[toCurrency] || 1;
  if (toCurrency === "COP" || toCurrency === "XTR") return Math.round(usd * rate);
  return parseFloat((usd * rate).toFixed(4));
}

function formatPrice(usd: number, currency: string): string {
  const val = convertUSD(usd, currency);
  if (currency === "COP") return `$${val.toLocaleString()} COP`;
  if (currency === "XTR") return `${val} ⭐`;
  if (currency === "TON") return `${val} TON`;
  return `${val} ${currency}`;
}

// ===== TELEGRAM HELPERS =====
async function sendTypingAction(botToken: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function humanizeDelay(text: string): number {
  const words = text.split(" ").length;
  return Math.min(words * 400, 3000) + Math.random() * 1200 + 500;
}

function getLocalTime(timezone: string) {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("es-CO", { timeZone: timezone, hour: "numeric", minute: "numeric", hour12: false, weekday: "long" }).formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "12");
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    let timeOfDay = "madrugada";
    if (hour >= 6 && hour < 12) timeOfDay = "mañana";
    else if (hour >= 12 && hour < 14) timeOfDay = "mediodía";
    else if (hour >= 14 && hour < 19) timeOfDay = "tarde";
    else if (hour >= 19 && hour < 23) timeOfDay = "noche";
    return { hour, minute, formatted: `Son las ${hour}:${minute < 10 ? "0" + minute : minute} (${timeOfDay}) del ${parts.find(p => p.type === "weekday")?.value || ""}` };
  } catch { return { hour: 12, minute: 0, formatted: "hora desconocida" }; }
}

async function createPaymentLink(provider: string, amount: number, currency: string, creatorId: string, fanId: string | null, purpose: string) {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/process-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}` },
    body: JSON.stringify({ action: "create_link", provider, amount, currency, creator_id: creatorId, fan_id: fanId, purpose }),
  });
  return await res.json();
}

// ===== PAYMENT BUTTONS FOR A GIVEN USD AMOUNT =====
async function getPaymentButtons(usdAmount: number, purpose: string, creatorId: string, fanId: string | null, label: string) {
  const { data: methods } = await supabase.from("payment_settings").select("provider, is_enabled").eq("is_enabled", true);
  const buttons: any[][] = [];
  for (const m of methods || []) {
    if (m.provider === "wompi") {
      const cop = convertUSD(usdAmount, "COP");
      buttons.push([{ text: `💳 Nequi/PSE ($${cop.toLocaleString()} COP)`, callback_data: `pay_${purpose}_wompi_${usdAmount}` }]);
    } else if (m.provider === "binance") {
      buttons.push([{ text: `🪙 USDT ($${usdAmount})`, callback_data: `pay_${purpose}_binance_${usdAmount}` }]);
    } else if (m.provider === "ton") {
      const ton = convertUSD(usdAmount, "TON");
      buttons.push([{ text: `💎 TON (${ton} TON)`, callback_data: `pay_${purpose}_ton_${usdAmount}` }]);
    } else if (m.provider === "telegram_stars") {
      const stars = convertUSD(usdAmount, "XTR");
      buttons.push([{ text: `⭐ ${stars} Estrellas`, callback_data: `pay_${purpose}_stars_${usdAmount}` }]);
    }
  }
  return buttons;
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
      else return new Response("ok", { status: 200 });
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
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id }),
        });

        const { data: fanData } = await supabase.from("fans").select("id").eq("telegram_user_id", userId).eq("creator_id", creator.id).single();

        // ===== SHOW SUBSCRIPTION PLANS =====
        if (cbData === "show_plans") {
          const { data: plans } = await supabase.from("subscription_plans").select("*").eq("creator_id", creator.id).eq("is_active", true).order("duration_months");
          if (plans && plans.length > 0) {
            const buttons = plans.map(p => {
              const dur = p.duration_months === 1 ? "1 mes" : `${p.duration_months} meses`;
              return [{ text: `👑 ${p.name} - $${p.price} USD (${dur})`, callback_data: `sub_plan_${p.id}` }];
            });
            await sendTelegramMessage(creatorBotToken, chatId,
              `👑 <b>Planes VIP de ${creator.name}</b>\n\n` +
              plans.map(p => `• <b>${p.name}</b> — $${p.price} USD (${p.duration_months === 1 ? "1 mes" : p.duration_months + " meses"})`).join("\n") +
              `\n\nElige tu plan 👇`,
              { inline_keyboard: buttons }
            );
          } else {
            await sendTelegramMessage(creatorBotToken, chatId, "👑 No hay planes disponibles por ahora");
          }
        }
        // ===== PLAN SELECTED → SHOW PAYMENT METHODS =====
        else if (cbData.startsWith("sub_plan_")) {
          const planId = cbData.replace("sub_plan_", "");
          const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", planId).single();
          if (plan) {
            const buttons = await getPaymentButtons(plan.price, `sub_${planId}`, creator.id, fanData?.id || null, plan.name);
            await sendTelegramMessage(creatorBotToken, chatId,
              `✨ <b>${plan.name}</b>\n💵 $${plan.price} USD\n` +
              `💳 ~${formatPrice(plan.price, "COP")} | 🪙 ${plan.price} USDT | 💎 ${formatPrice(plan.price, "TON")} | ⭐ ${formatPrice(plan.price, "XTR")}\n` +
              `📅 ${plan.duration_months} ${plan.duration_months === 1 ? "mes" : "meses"}\n\nElige método de pago 👇`,
              { inline_keyboard: buttons }
            );
          }
        }
        // ===== PROCESS PAYMENT (generic: pay_{purpose}_{provider}_{usdAmount}) =====
        else if (cbData.startsWith("pay_")) {
          const parts = cbData.split("_");
          // pay_sub_{planId}_{provider}_{usdAmount} or pay_gift_{giftId}_{provider}_{usdAmount} or pay_tip_{provider}_{usdAmount}
          const provider = parts[parts.length - 2];
          const usdAmount = parseFloat(parts[parts.length - 1]);
          const purpose = parts.slice(1, parts.length - 2).join("_");

          if (provider === "stars") {
            const stars = convertUSD(usdAmount, "XTR");
            await fetch(`https://api.telegram.org/bot${creatorBotToken}/sendInvoice`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                title: `⭐ Pago - $${usdAmount} USD`,
                description: `Pago a ${creator.name} 💖`,
                payload: `${purpose}_${userId}_${Date.now()}`,
                provider_token: "",
                currency: "XTR",
                prices: [{ label: `⭐ ${stars} estrellas`, amount: stars }],
              }),
            });
          } else {
            const currencyMap: Record<string, string> = { wompi: "COP", binance: "USDT", ton: "TON" };
            const cur = currencyMap[provider] || "USD";
            const convertedAmount = convertUSD(usdAmount, cur);
            const payData = await createPaymentLink(provider, convertedAmount, cur, creator.id, fanData?.id || null, purpose);
            if (payData.url) {
              const labels: Record<string, string> = { wompi: "💳 Pagar ahora", binance: "🪙 Pagar con USDT", ton: "💎 Abrir TON Wallet" };
              await sendTelegramMessage(creatorBotToken, chatId,
                `✅ <b>Pago listo!</b>\n💵 $${usdAmount} USD = ${formatPrice(usdAmount, cur)}\n\nHaz clic para completar 👇`,
                { inline_keyboard: [[{ text: labels[provider] || "💳 Pagar", url: payData.url }]] }
              );
            } else {
              await sendTelegramMessage(creatorBotToken, chatId, "❌ Error generando pago, intenta de nuevo");
            }
          }
        }
        // ===== SHOW GIFTS =====
        else if (cbData === "show_gifts") {
          const { data: gifts } = await supabase.from("gift_items").select("*").eq("is_active", true).order("sort_order");
          if (gifts && gifts.length > 0) {
            const buttons = gifts.map(g => [{ text: `${g.emoji} ${g.name} — $${g.price} USD`, callback_data: `gift_select_${g.id}` }]);
            await sendTelegramMessage(creatorBotToken, chatId,
              `🎁 <b>Regalos para ${creator.name}</b>\n\n` +
              gifts.map(g => `${g.emoji} <b>${g.name}</b> — $${g.price} USD`).join("\n") +
              `\n\nElige un regalo 👇`,
              { inline_keyboard: buttons }
            );
          } else {
            await sendTelegramMessage(creatorBotToken, chatId, "🎁 No hay regalos disponibles");
          }
        }
        // ===== GIFT SELECTED → SHOW PAYMENT METHODS =====
        else if (cbData.startsWith("gift_select_")) {
          const giftId = cbData.replace("gift_select_", "");
          const { data: gift } = await supabase.from("gift_items").select("*").eq("id", giftId).single();
          if (gift) {
            const buttons = await getPaymentButtons(gift.price, `gift_${giftId}`, creator.id, fanData?.id || null, gift.name);
            await sendTelegramMessage(creatorBotToken, chatId,
              `${gift.emoji} <b>${gift.name}</b>\n💵 $${gift.price} USD\n` +
              `💳 ~${formatPrice(gift.price, "COP")} | 🪙 ${gift.price} USDT | 💎 ${formatPrice(gift.price, "TON")} | ⭐ ${formatPrice(gift.price, "XTR")}\n\nElige método de pago 👇`,
              { inline_keyboard: buttons }
            );
          }
        }
        // ===== TIP CUSTOM =====
        else if (cbData === "tip_custom") {
          await sendTelegramMessage(creatorBotToken, chatId,
            "💰 <b>Propina personalizada</b>\n\nEscribe el monto en USD:\n<code>/propina 15</code>\n\nO elige una cantidad rápida 👇",
            { inline_keyboard: [
              [
                { text: "☕ $5", callback_data: "tip_amount_5" },
                { text: "🌹 $10", callback_data: "tip_amount_10" },
                { text: "💎 $25", callback_data: "tip_amount_25" },
              ],
              [
                { text: "🔥 $50", callback_data: "tip_amount_50" },
                { text: "👑 $100", callback_data: "tip_amount_100" },
              ],
            ]}
          );
        }
        // ===== TIP AMOUNT SELECTED → SHOW PAYMENT METHODS =====
        else if (cbData.startsWith("tip_amount_")) {
          const usdAmount = parseFloat(cbData.replace("tip_amount_", ""));
          const buttons = await getPaymentButtons(usdAmount, "tip", creator.id, fanData?.id || null, "Propina");
          await sendTelegramMessage(creatorBotToken, chatId,
            `💖 <b>Propina de $${usdAmount} USD</b>\n` +
            `💳 ~${formatPrice(usdAmount, "COP")} | 🪙 ${usdAmount} USDT | ⭐ ${formatPrice(usdAmount, "XTR")}\n\nElige método de pago 👇`,
            { inline_keyboard: buttons }
          );
        }
      } catch (e) { console.error("Callback error:", e); }
      return new Response("ok", { status: 200 });
    }

    // ===== HANDLE PRE-CHECKOUT (Telegram Stars) =====
    if (update.pre_checkout_query) {
      await fetch(`https://api.telegram.org/bot${creatorBotToken}/answerPreCheckoutQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
      });
      return new Response("ok", { status: 200 });
    }

    // ===== SUCCESSFUL PAYMENT (Stars) =====
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const userId = String(update.message.from?.id);
      const payload = payment.invoice_payload || "";

      // If it's a subscription payment, activate it
      if (payload.startsWith("sub_")) {
        const planIdMatch = payload.match(/^sub_([a-f0-9-]+)_/);
        if (planIdMatch) {
          const planId = planIdMatch[1];
          const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", planId).single();
          if (plan) {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + plan.duration_months);
            await supabase.from("fans").update({
              is_subscriber: true,
              subscription_expires_at: expiresAt.toISOString(),
            }).eq("telegram_user_id", userId).eq("creator_id", creator.id);

            // Send VIP link
            if (creator.vip_channel_link) {
              await sendTelegramMessage(creatorBotToken, update.message.chat.id,
                `🎉 <b>¡Suscripción activada!</b>\n\n👑 Plan: ${plan.name}\n📅 Hasta: ${expiresAt.toLocaleDateString("es-CO")}\n\nÚnete a mi canal VIP 👇`,
                { inline_keyboard: [[{ text: "🔥 Entrar al canal VIP", url: creator.vip_channel_link }]] }
              );
            }
          }
        }
      }

      await supabase.from("analytics_events").insert({
        creator_id: creator.id,
        event_type: "payment_confirmed",
        event_data: { provider: "telegram_stars", payload, amount: payment.total_amount },
        revenue: payment.total_amount / (RATES.XTR || 50),
      });

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
    const propinaMatch = userText.match(/^\/propina\s+(\d+(?:\.\d+)?)/i);
    if (propinaMatch) {
      const tipUSD = parseFloat(propinaMatch[1]);
      const { data: fan } = await supabase.from("fans").select("id").eq("telegram_user_id", telegramUserId).eq("creator_id", creator.id).single();
      const buttons = await getPaymentButtons(tipUSD, "tip", creator.id, fan?.id || null, "Propina");
      await sendTelegramMessage(creatorBotToken, chatId,
        `💖 <b>Propina de $${tipUSD} USD</b>\n` +
        `💳 ~${formatPrice(tipUSD, "COP")} | 🪙 ${tipUSD} USDT | ⭐ ${formatPrice(tipUSD, "XTR")}\n\nGracias por tu generosidad! 🥰\nElige método de pago 👇`,
        { inline_keyboard: buttons }
      );
      return new Response("ok", { status: 200 });
    }

    // Handle /start command with subscription activation
    if (userText.startsWith("/start")) {
      // Continue to normal flow (upsert fan + AI response)
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
      happy: "Estás contenta, con energía.", sad: "Estás un poco bajoneada.", tired: "Estás cansada, msgs cortos.",
      hungry: "Tienes hambre.", excited: "Estás emocionada.", bored: "Estás aburrida.",
      angry: "Estás irritable.", flirty: "Estás coqueta.", normal: "Normal, tranquila.",
    };

    const langInstruction = userLang === "en" ? "User writes English. Reply in casual English." : "Responde en español natural.";

    const systemPrompt = `${creator.system_prompt}

HORA ACTUAL: ${localTime.formatted} en ${creator.timezone || "America/Bogota"}.
Actúa coherente con tu horario.

ESTADO: ${emotionMap[creator.current_emotion] || emotionMap["normal"]}
IDIOMA: ${langInstruction}

REGLAS: MÁXIMO 1-2 oraciones. Como WhatsApp real. Emojis 0-2 max. PROHIBIDO asteriscos, markdown, comillas. El usuario se llama ${firstName}

PAGO: Si piden contenido VIP, suscripción, precios o cómo pagar, responde natural y breve.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...historyForAI],
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
      replyMarkup = { inline_keyboard: [
        [{ text: "👑 Ver Planes VIP", callback_data: "show_plans" }],
        ...(creator.vip_channel_link ? [[{ text: "🔥 Canal VIP", url: creator.vip_channel_link }]] : []),
      ]};
    } else if (wantsTip) {
      replyMarkup = { inline_keyboard: [
        [{ text: "🎁 Enviar Regalo", callback_data: "show_gifts" }],
        [{ text: "💰 Propina personalizada", callback_data: "tip_custom" }],
      ]};
    } else if (wantsPayment) {
      replyMarkup = { inline_keyboard: [
        [{ text: "👑 Suscripciones", callback_data: "show_plans" }],
        [{ text: "🎁 Regalos", callback_data: "show_gifts" }],
        [{ text: "💰 Propina", callback_data: "tip_custom" }],
      ]};
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
      creator_id: creator.id, fan_id: fan.id,
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
