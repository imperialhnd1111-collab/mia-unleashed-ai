import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { creator_id } = await req.json();

    // Gather data for analysis
    const [
      { data: creators },
      { count: totalFans },
      { count: totalConversations },
      { count: totalMessages },
      { data: recentEvents },
      { data: topFans },
      { data: recentMessages },
    ] = await Promise.all([
      creator_id
        ? supabase.from("creators").select("id, name, username, status, ai_enabled, subscription_price, timezone").eq("id", creator_id)
        : supabase.from("creators").select("id, name, username, status, ai_enabled, subscription_price, timezone"),
      supabase.from("fans").select("*", { count: "exact", head: true }).match(creator_id ? { creator_id } : {}),
      supabase.from("conversations").select("*", { count: "exact", head: true }).match(creator_id ? { creator_id } : {}),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("analytics_events").select("event_type, revenue, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("fans").select("first_name, total_spent, relationship_level, is_subscriber").order("total_spent", { ascending: false }).limit(10),
      supabase.from("messages").select("role, content, created_at").order("created_at", { ascending: false }).limit(30),
    ]);

    const context = `
DATOS DE LA AGENCIA:
- Creadoras: ${JSON.stringify(creators?.map(c => c.name) || [])}
- Total fans: ${totalFans || 0}
- Conversaciones: ${totalConversations || 0}
- Mensajes totales: ${totalMessages || 0}
- Top fans por gasto: ${JSON.stringify(topFans?.slice(0, 5) || [])}
- Eventos recientes: ${JSON.stringify(recentEvents?.slice(0, 10) || [])}
- Últimos mensajes (muestra): ${JSON.stringify(recentMessages?.slice(0, 15)?.map(m => ({ role: m.role, content: m.content?.slice(0, 80) })) || [])}
${creator_id ? `Analizando creadora específica: ${creators?.[0]?.name || "desconocida"}` : "Análisis general de toda la agencia"}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Eres el Super Agente IA de una agencia de creadoras de contenido. Analizas datos de conversaciones, fans y engagement para dar recomendaciones accionables.

TU ROL:
- Analizar patrones de conversación y engagement
- Sugerir ideas de contenido basadas en lo que más funciona
- Recomendar campañas y estrategias de monetización
- Sugerir si agregar más agentes/creadoras
- Proponer herramientas o mejoras para la plataforma
- Identificar fans de alto valor y oportunidades

FORMATO:
- Responde en español casual pero profesional
- Usa emojis para separar secciones
- Sé específico con números y datos
- Da máximo 5-6 recomendaciones concretas
- Incluye al menos 1 idea de contenido, 1 de campaña, y 1 estratégica`,
          },
          {
            role: "user",
            content: `Analiza estos datos y dame recomendaciones accionables:\n${context}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Error del servicio AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const analysis = aiData.choices?.[0]?.message?.content || "No se pudo generar análisis.";

    return new Response(JSON.stringify({ analysis, tokens: aiData.usage?.total_tokens }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analytics AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
