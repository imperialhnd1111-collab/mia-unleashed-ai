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

    const { action, provider, amount, currency, fan_id, creator_id, purpose, reference } = await req.json();

    // ===== WOMPI: Create payment link =====
    if (action === "create_link" && provider === "wompi") {
      const WOMPI_PUBLIC_KEY = Deno.env.get("WOMPI_PUBLIC_KEY");
      const WOMPI_PRIVATE_KEY = Deno.env.get("WOMPI_PRIVATE_KEY");
      if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY) {
        return new Response(JSON.stringify({ error: "Wompi no configurado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create Wompi payment link
      const amountInCents = Math.round((amount || 10000) * 100);
      const ref = reference || `tip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const integrityString = `${ref}${amountInCents}${currency || "COP"}`;
      // Simple hash for integrity (production should use HMAC-SHA256 with events secret)
      const encoder = new TextEncoder();
      const data = encoder.encode(integrityString + (Deno.env.get("WOMPI_EVENTS_SECRET") || ""));
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const integrityHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${WOMPI_PUBLIC_KEY}&currency=${currency || "COP"}&amount-in-cents=${amountInCents}&reference=${ref}&signature%3Aintegrity=${integrityHash}`;

      // Log the transaction
      await supabase.from("analytics_events").insert({
        creator_id: creator_id || "00000000-0000-0000-0000-000000000000",
        fan_id: fan_id || null,
        event_type: "payment_initiated",
        event_data: { provider: "wompi", amount, currency: currency || "COP", reference: ref, purpose },
        revenue: 0,
      });

      return new Response(JSON.stringify({ url: checkoutUrl, reference: ref, provider: "wompi" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== WOMPI: Webhook confirmation =====
    if (action === "wompi_webhook") {
      const { data: eventData } = await req.json();
      // Verify signature with WOMPI_EVENTS_SECRET
      const transaction = eventData?.transaction;
      if (transaction?.status === "APPROVED") {
        await supabase.from("analytics_events").insert({
          creator_id: creator_id || "00000000-0000-0000-0000-000000000000",
          event_type: "payment_confirmed",
          event_data: { provider: "wompi", transaction_id: transaction.id, amount: transaction.amount_in_cents / 100 },
          revenue: transaction.amount_in_cents / 100,
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== BINANCE PAY =====
    if (action === "create_link" && provider === "binance") {
      const BINANCE_API_KEY = Deno.env.get("BINANCE_API_KEY");
      const BINANCE_MERCHANT_ID = Deno.env.get("BINANCE_MERCHANT_ID");
      if (!BINANCE_API_KEY || !BINANCE_MERCHANT_ID) {
        return new Response(JSON.stringify({ error: "Binance Pay no configurado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderRef = reference || `bp_${Date.now()}`;
      // Binance Pay C2B API
      const timestamp = Date.now();
      const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      const bodyPayload = {
        env: { terminalType: "WEB" },
        merchantTradeNo: orderRef,
        orderAmount: amount || 5,
        currency: currency || "USDT",
        description: purpose || "Propina",
        goodsType: "02",
      };

      const payloadStr = JSON.stringify(bodyPayload);
      const signStr = `${timestamp}\n${nonce}\n${payloadStr}\n`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(BINANCE_API_KEY), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signStr));
      const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();

      const res = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v3/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BinancePay-Timestamp": String(timestamp),
          "BinancePay-Nonce": nonce,
          "BinancePay-Certificate-SN": BINANCE_API_KEY,
          "BinancePay-Signature": signature,
        },
        body: payloadStr,
      });

      const binanceData = await res.json();
      if (binanceData.status === "SUCCESS") {
        await supabase.from("analytics_events").insert({
          creator_id: creator_id || "00000000-0000-0000-0000-000000000000",
          fan_id: fan_id || null,
          event_type: "payment_initiated",
          event_data: { provider: "binance", amount, reference: orderRef, purpose },
        });

        return new Response(JSON.stringify({
          url: binanceData.data?.universalUrl || binanceData.data?.checkoutUrl,
          reference: orderRef,
          provider: "binance",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: binanceData.errorMessage || "Binance Pay error" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== TELEGRAM STARS =====
    if (action === "create_invoice" && provider === "telegram_stars") {
      const { bot_token, chat_id, title, description: desc, star_amount } = await req.json();
      if (!bot_token || !chat_id) {
        return new Response(JSON.stringify({ error: "Bot token y chat ID requeridos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`https://api.telegram.org/bot${bot_token}/sendInvoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id,
          title: title || "⭐ Propina",
          description: desc || "Gracias por tu apoyo 💖",
          payload: `stars_${Date.now()}`,
          provider_token: "", // Empty for Telegram Stars
          currency: "XTR",
          prices: [{ label: "⭐ Stars", amount: star_amount || 50 }],
        }),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== TON WALLET =====
    if (action === "create_link" && provider === "ton") {
      const { data: settings } = await supabase
        .from("payment_settings")
        .select("config")
        .eq("provider", "ton")
        .single();

      const walletAddress = (settings?.config as any)?.wallet_address;
      if (!walletAddress) {
        return new Response(JSON.stringify({ error: "Wallet TON no configurada" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // TON deep link
      const tonAmount = amount || 1; // in TON
      const nanotons = Math.round(tonAmount * 1e9);
      const comment = purpose || "tip";
      const url = `ton://transfer/${walletAddress}?amount=${nanotons}&text=${encodeURIComponent(comment)}`;

      return new Response(JSON.stringify({ url, reference: `ton_${Date.now()}`, provider: "ton", wallet: walletAddress }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GET PAYMENT METHODS =====
    if (action === "get_methods") {
      const { data: settings } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("is_enabled", true);

      return new Response(JSON.stringify({ methods: settings || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no reconocida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
