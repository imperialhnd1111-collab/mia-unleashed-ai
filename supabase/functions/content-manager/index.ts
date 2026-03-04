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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id, month, year } = await req.json();

    // Get creator info
    const { data: creator } = await supabase.from("creators").select("*").eq("id", creator_id).single();
    if (!creator) throw new Error("Creadora no encontrada");

    // Get fans stats
    const { count: totalFans } = await supabase.from("fans").select("id", { count: "exact", head: true }).eq("creator_id", creator_id);
    const { count: vipFans } = await supabase.from("fans").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).eq("is_subscriber", true);

    // Get recent content for pattern analysis
    const { data: recentContent } = await supabase.from("content_items").select("content_type, title, tags, is_premium, published_at").eq("creator_id", creator_id).order("created_at", { ascending: false }).limit(20);

    // Get recent analytics
    const { data: recentEvents } = await supabase.from("analytics_events").select("event_type, event_data, revenue").eq("creator_id", creator_id).order("created_at", { ascending: false }).limit(50);

    const daysInMonth = new Date(year, month, 0).getDate();
    const monthName = new Date(year, month - 1).toLocaleDateString("es-CO", { month: "long" });

    const prompt = `Eres un Manager de Contenido IA experto para creadoras de contenido digital.

CREADORA: ${creator.name} (@${creator.username})
BIO: ${creator.bio || "Sin bio"}
PERSONALIDAD: ${JSON.stringify(creator.personality_traits || [])}
BACKSTORY: ${creator.backstory || "Sin backstory"}

STATS:
- Total fans: ${totalFans || 0}
- Fans VIP: ${vipFans || 0}
- Contenido reciente: ${JSON.stringify((recentContent || []).slice(0, 10).map(c => ({ type: c.content_type, title: c.title, premium: c.is_premium })))}

MES: ${monthName} ${year} (${daysInMonth} días)

GENERA un plan de contenido detallado para el mes completo. Responde EXACTAMENTE en este formato JSON:

{
  "plan": "Resumen estratégico en markdown (máx 300 palabras) explicando la estrategia del mes, tendencias a aprovechar, y objetivos clave.",
  "events": [
    {
      "date": "${year}-${String(month).padStart(2, "0")}-DD",
      "platform": "instagram|tiktok|x|telegram_vip",
      "type": "photo|video|text|pack",
      "title": "Título corto del contenido",
      "description": "Descripción breve de qué publicar",
      "time": "HH:MM",
      "is_premium": false
    }
  ]
}

REGLAS:
- Genera entre 60-90 eventos distribuidos en el mes (3-4 publicaciones/día)
- Distribuye entre todas las plataformas: Instagram (stories + reels + posts), TikTok (trends + dance + lifestyle), X (tweets + threads), Telegram VIP (contenido exclusivo + packs)
- Los packs deben tener type "pack" y ser para Telegram VIP con is_premium: true
- Incluye variedad: fotos del día, videos cortos, stories, behind the scenes, Q&A, trends, etc.
- Horarios óptimos: Instagram 10am/2pm/7pm, TikTok 11am/3pm/8pm, X 9am/1pm/6pm, Telegram 12pm/6pm/10pm
- Los fines de semana incluir contenido más casual y personal
- Responde SOLO con JSON válido, sin texto adicional`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 8000,
      }),
    });

    const aiText = await aiRes.text();
    let aiData: any = {};
    try { aiData = JSON.parse(aiText); } catch { throw new Error("AI response not valid JSON: " + aiText.substring(0, 200)); }
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let parsed: any = { plan: "", events: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = { plan: content, events: [] };
    }

    // Log
    await supabase.from("ai_logs").insert({
      creator_id,
      action: "content_plan",
      model_used: "gemini-2.5-flash",
      input_data: { month, year },
      output_data: { events_count: parsed.events?.length || 0 },
    });

    return new Response(JSON.stringify({ plan: parsed.plan, events: parsed.events || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Content manager error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
