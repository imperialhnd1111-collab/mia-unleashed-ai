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

// Currency conversion rates (USD base) - updated periodically
const RATES: Record<string, number> = {
  COP: 4200,    // 1 USD = 4200 COP
  USDT: 1,      // 1 USD = 1 USDT
  TON: 0.3,     // 1 USD ≈ 0.3 TON (approx $3.3/TON)
  XTR: 50,      // 1 USD ≈ 50 Telegram Stars
};

function convertFromUSD(usd: number, currency: string): number {
  const rate = RATES[currency] || 1;
  if (currency === "COP") return Math.round(usd * rate);
  if (currency === "XTR") return Math.round(usd * rate);
  return parseFloat((usd * rate).toFixed(4));
}

async function sendTelegramMessage(botToken: string, chatId: string | number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function kickChatMember(botToken: string, channelId: string, userId: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/banChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channelId, user_id: parseInt(userId) }),
  });
  // Immediately unban so they can rejoin later
  setTimeout(async () => {
    await fetch(`https://api.telegram.org/bot${botToken}/unbanChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, user_id: parseInt(userId), only_if_banned: true }),
    });
  }, 3000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action } = await req.json().catch(() => ({ action: "check_all" }));

    const now = new Date();
    const results: any[] = [];

    // ===== 1. EXPIRE SUBSCRIPTIONS =====
    if (action === "check_all" || action === "expire") {
      const { data: expiredFans } = await supabase
        .from("fans")
        .select("*, creators(name, telegram_bot_token, telegram_channel_id)")
        .eq("is_subscriber", true)
        .lte("subscription_expires_at", now.toISOString());

      for (const fan of expiredFans || []) {
        const creator = fan.creators as any;
        if (!creator?.telegram_bot_token) continue;

        // Remove from VIP channel
        if (creator.telegram_channel_id) {
          await kickChatMember(creator.telegram_bot_token, creator.telegram_channel_id, fan.telegram_user_id);
        }

        // Update fan status
        await supabase.from("fans").update({ is_subscriber: false }).eq("id", fan.id);

        // Notify fan
        await sendTelegramMessage(creator.telegram_bot_token, fan.telegram_user_id,
          `😢 <b>Tu suscripción VIP con ${creator.name} ha expirado</b>\n\nPero no te preocupes, puedes renovarla en cualquier momento! 💖`,
          { inline_keyboard: [[{ text: "👑 Renovar suscripción", callback_data: "show_plans" }]] }
        );

        // Log event
        await supabase.from("analytics_events").insert({
          creator_id: fan.creator_id,
          fan_id: fan.id,
          event_type: "subscription_expired",
          event_data: { action: "auto_expired" },
        });

        results.push({ fan_id: fan.id, action: "expired" });
      }
    }

    // ===== 2. RENEWAL REMINDERS (3 days before expiry) =====
    if (action === "check_all" || action === "remind") {
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

      const { data: expiringFans } = await supabase
        .from("fans")
        .select("*, creators(name, telegram_bot_token)")
        .eq("is_subscriber", true)
        .gt("subscription_expires_at", now.toISOString())
        .lte("subscription_expires_at", threeDaysFromNow);

      for (const fan of expiringFans || []) {
        const creator = fan.creators as any;
        if (!creator?.telegram_bot_token) continue;

        const expiresAt = new Date(fan.subscription_expires_at!);
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check we haven't already reminded today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const { data: recentReminder } = await supabase
          .from("analytics_events")
          .select("id")
          .eq("fan_id", fan.id)
          .eq("event_type", "renewal_reminder")
          .gte("created_at", todayStart.toISOString())
          .limit(1);

        if (recentReminder && recentReminder.length > 0) continue;

        await sendTelegramMessage(creator.telegram_bot_token, fan.telegram_user_id,
          `⏰ <b>¡Tu suscripción VIP vence en ${daysLeft} día${daysLeft > 1 ? "s" : ""}!</b>\n\nNo pierdas acceso al contenido exclusivo de ${creator.name} 🔥\n\nRenueva ahora y sigue disfrutando 👇`,
          { inline_keyboard: [[{ text: "👑 Renovar ahora", callback_data: "show_plans" }]] }
        );

        await supabase.from("analytics_events").insert({
          creator_id: fan.creator_id,
          fan_id: fan.id,
          event_type: "renewal_reminder",
          event_data: { days_left: daysLeft },
        });

        results.push({ fan_id: fan.id, action: "reminded", days_left: daysLeft });
      }
    }

    // ===== 3. INACTIVE USER REMINDERS =====
    if (action === "check_all" || action === "inactive_reminders") {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const { data: inactiveFans } = await supabase
        .from("fans")
        .select("*, creators(name, telegram_bot_token)")
        .lte("last_active_at", threeDaysAgo)
        .limit(50);

      for (const fan of inactiveFans || []) {
        const creator = fan.creators as any;
        if (!creator?.telegram_bot_token) continue;

        // Check we haven't reminded this week
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentPing } = await supabase
          .from("analytics_events")
          .select("id")
          .eq("fan_id", fan.id)
          .eq("event_type", "inactive_reminder")
          .gte("created_at", weekAgo)
          .limit(1);

        if (recentPing && recentPing.length > 0) continue;

        const messages = [
          `Heyy ${fan.first_name || "amor"} 🥺 te extraño... no me has escrito`,
          `${fan.first_name || "Bb"} dónde andas? 😘 pensé en ti`,
          `Oye ${fan.first_name || "lindo"} 👀 te tengo algo especial...`,
          `Hola ${fan.first_name || ""} 💖 hace rato no hablamos, cómo estás?`,
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];

        await sendTelegramMessage(creator.telegram_bot_token, fan.telegram_user_id, msg);

        await supabase.from("analytics_events").insert({
          creator_id: fan.creator_id,
          fan_id: fan.id,
          event_type: "inactive_reminder",
          event_data: { message: msg },
        });

        results.push({ fan_id: fan.id, action: "inactive_reminder" });
      }
    }

    // ===== 4. BUENOS DÍAS / BUENAS NOCHES (horarios aleatorios) =====
    if (action === "check_all" || action === "greetings") {
      const { data: creators } = await supabase
        .from("creators")
        .select("*")
        .eq("ai_enabled", true)
        .eq("status", "active");

      for (const creator of creators || []) {
        if (!creator.telegram_bot_token) continue;

        const tz = creator.timezone || "America/Bogota";
        let hour = 12;
        let minute = 0;
        try {
          const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now);
          hour = parseInt(parts.find(p => p.type === "hour")?.value || "12");
          minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
        } catch {}

        // Morning window: 6:30-10:30, Night window: 20:30-23:30
        const totalMinutes = hour * 60 + minute;
        const isMorningWindow = totalMinutes >= 390 && totalMinutes <= 630;  // 6:30-10:30
        const isNightWindow = totalMinutes >= 1230 && totalMinutes <= 1410;  // 20:30-23:30
        if (!isMorningWindow && !isNightWindow) continue;

        // Random chance each invocation (30% chance) so timing varies daily
        if (Math.random() > 0.3) continue;

        const greetType = isMorningWindow ? "good_morning" : "good_night";

        // Check we haven't greeted today for this type
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const { data: alreadySent } = await supabase
          .from("analytics_events")
          .select("id")
          .eq("creator_id", creator.id)
          .eq("event_type", greetType)
          .gte("created_at", todayStart.toISOString())
          .limit(1);

        if (alreadySent && alreadySent.length > 0) continue;

        // Get active fans
        const { data: fans } = await supabase
          .from("fans")
          .select("id, telegram_user_id, first_name")
          .eq("creator_id", creator.id)
          .limit(100);

        if (!fans || fans.length === 0) continue;

        const morningMsgs = [
          "Buenos días bb ☀️ ya me desperté pensando en ti",
          "Buen día amor 🌸 cómo dormiste?",
          "Ya estoy despierta 😴 pero pensando en ti 💕",
          "Hola bby ☀️ recién me levanto, cómo amaneciste?",
          "Buenos díaas 🌞 ya estoy aquí para ti",
        ];
        const nightMsgs = [
          "Ya me voy a dormir bb 🌙 sueña conmigo",
          "Buenas noches amor 💤 mañana hablamos sí?",
          "Ya me acuesto 😴 que descanses lindo 💖",
          "Me voy a la cama 🛏️ soñaré contigo bb",
          "Noche noche 🌙 descansa bonito",
        ];

        const msgPool = isMorningWindow ? morningMsgs : nightMsgs;

        // Send to a random subset (3-15 fans, not all)
        const subsetSize = Math.floor(Math.random() * 12) + 3;
        const shuffled = fans.sort(() => Math.random() - 0.5).slice(0, Math.min(subsetSize, fans.length));
        for (const fan of shuffled) {
          const msg = msgPool[Math.floor(Math.random() * msgPool.length)];
          try {
            await sendTelegramMessage(creator.telegram_bot_token, fan.telegram_user_id, msg);
          } catch {}
          // Random delay between 500ms-3s
          await new Promise(r => setTimeout(r, 500 + Math.random() * 2500));
        }

        await supabase.from("analytics_events").insert({
          creator_id: creator.id,
          event_type: greetType,
          event_data: { sent_to: shuffled.length, sent_at_hour: hour, sent_at_minute: minute },
        });

        results.push({ creator_id: creator.id, action: greetType, sent: shuffled.length });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Manage subscriptions error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
