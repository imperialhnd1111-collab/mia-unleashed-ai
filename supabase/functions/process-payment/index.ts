import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, provider, amount, currency, fan_id, creator_id, purpose, reference } = body;

    // ===== WOMPI =====
    if (action === "create_link" && provider === "wompi") {
      const WOMPI_PUBLIC_KEY = Deno.env.get("WOMPI_PUBLIC_KEY");
      const WOMPI_PRIVATE_KEY = Deno.env.get("WOMPI_PRIVATE_KEY");
      if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY) {
        return new Response(JSON.stringify({ error: "Wompi no configurado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const amountInCents = Math.round((amount || 10000) * 100);
      const ref = reference || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const cur = currency || "COP";

      const integrityString = `${ref}${amountInCents}${cur}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(integrityString + (Deno.env.get("WOMPI_EVENTS_SECRET") || ""));
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const integrityHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${WOMPI_PUBLIC_KEY}&currency=${cur}&amount-in-cents=${amountInCents}&reference=${ref}&signature%3Aintegrity=${integrityHash}`;

      await supabase.from("analytics_events").insert({
        creator_id: creator_id || "00000000-0000-0000-0000-000000000000",
        fan_id: fan_id || null,
        event_type: "payment_initiated",
        event_data: { provider: "wompi", amount, currency: cur, reference: ref, purpose },
      });

      return new Response(JSON.stringify({ url: checkoutUrl, reference: ref, provider: "wompi" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== BINANCE PAY =====
    if (action === "create_link" && provider === "binance") {
      const BINANCE_API_KEY = Deno.env.get("BINANCE_API_KEY");
      const BINANCE_MERCHANT_ID = Deno.env.get("BINANCE_MERCHANT_ID");
      const BINANCE_SECRET_KEY = Deno.env.get("BINANCE_SECRET_KEY");
      if (!BINANCE_API_KEY || !BINANCE_MERCHANT_ID) {
        return new Response(JSON.stringify({ error: "Binance Pay no configurado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const orderRef = reference || `bp_${Date.now()}`;
      const timestamp = Date.now();
      const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      const bodyPayload = {
        env: { terminalType: "WEB" },
        merchantTradeNo: orderRef,
        orderAmount: String(amount || 5),
        currency: currency || "USDT",
        description: purpose || "Pago",
        goodsType: "02",
      };

      const payloadStr = JSON.stringify(bodyPayload);
      const signStr = `${timestamp}\n${nonce}\n${payloadStr}\n`;
      const encoder = new TextEncoder();
      const secretKey = BINANCE_SECRET_KEY || BINANCE_API_KEY;
      const key = await crypto.subtle.importKey("raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
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
      console.log("Binance Pay response:", JSON.stringify(binanceData));

      if (binanceData.status === "SUCCESS") {
        await supabase.from("analytics_events").insert({
          creator_id: creator_id || "00000000-0000-0000-0000-000000000000",
          fan_id: fan_id || null,
          event_type: "payment_initiated",
          event_data: { provider: "binance", amount, currency: currency || "USDT", reference: orderRef, purpose },
        });
        return new Response(JSON.stringify({
          url: binanceData.data?.universalUrl || binanceData.data?.checkoutUrl,
          reference: orderRef, provider: "binance",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: binanceData.errorMessage || "Binance Pay error", details: binanceData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== TON WALLET =====
    if (action === "create_link" && provider === "ton") {
      const { data: settings } = await supabase.from("payment_settings").select("config").eq("provider", "ton").single();
      const walletAddress = (settings?.config as any)?.wallet_address;
      if (!walletAddress) {
        return new Response(JSON.stringify({ error: "Wallet TON no configurada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const tonAmount = amount || 1;
      const nanotons = Math.round(tonAmount * 1e9);
      const url = `ton://transfer/${walletAddress}?amount=${nanotons}&text=${encodeURIComponent(purpose || "payment")}`;
      return new Response(JSON.stringify({ url, reference: `ton_${Date.now()}`, provider: "ton" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GET METHODS =====
    if (action === "get_methods") {
      const { data: settings } = await supabase.from("payment_settings").select("*").eq("is_enabled", true);
      return new Response(JSON.stringify({ methods: settings || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no reconocida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
