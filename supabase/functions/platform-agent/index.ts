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

    const { action } = await req.json();

    // ===== FULL PLATFORM ANALYSIS =====
    if (action === "analyze") {
      const [
        { data: creators },
        { count: totalFans },
        { count: totalConversations },
        { count: totalMessages },
        { data: recentEvents },
        { data: topFans },
        { data: recentPosts },
        { data: campaigns },
        { data: paymentSettings },
        { data: pendingSuggestions },
      ] = await Promise.all([
        supabase.from("creators").select("id, name, username, status, ai_enabled, subscription_price, timezone, current_emotion, channel_auto_publish"),
        supabase.from("fans").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("analytics_events").select("event_type, revenue, created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("fans").select("first_name, total_spent, relationship_level, is_subscriber, creator_id").order("total_spent", { ascending: false }).limit(15),
        supabase.from("channel_posts").select("status, post_type, created_at, published_at").order("created_at", { ascending: false }).limit(30),
        supabase.from("campaigns").select("name, status, total_sent, total_opened, total_converted, revenue_generated"),
        supabase.from("payment_settings").select("provider, is_enabled, config"),
        supabase.from("agent_suggestions").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      ]);

      const totalRevenue = recentEvents?.reduce((sum, e) => sum + (e.revenue || 0), 0) || 0;
      const publishedPosts = recentPosts?.filter(p => p.status === "published").length || 0;
      const failedPosts = recentPosts?.filter(p => p.status === "failed").length || 0;

      const context = `
ANÁLISIS COMPLETO DE LA PLATAFORMA:

📊 MÉTRICAS GENERALES:
- Creadoras activas: ${creators?.length || 0} (${creators?.map(c => c.name).join(", ")})
- Total fans: ${totalFans || 0}
- Conversaciones: ${totalConversations || 0}
- Mensajes totales: ${totalMessages || 0}
- Ingresos recientes: $${totalRevenue}

👩 CREADORAS:
${JSON.stringify(creators?.map(c => ({ name: c.name, status: c.status, emotion: c.current_emotion, ai: c.ai_enabled, price: c.subscription_price })) || [])}

🏆 TOP FANS:
${JSON.stringify(topFans?.slice(0, 10) || [])}

📢 CANAL:
- Posts recientes: ${recentPosts?.length || 0}
- Publicados: ${publishedPosts}
- Fallidos: ${failedPosts}

📣 CAMPAÑAS:
${JSON.stringify(campaigns || [])}

💰 PAGOS CONFIGURADOS:
${JSON.stringify(paymentSettings || [])}

📋 SUGERENCIAS PENDIENTES:
${JSON.stringify(pendingSuggestions?.map(s => ({ title: s.title, category: s.category })) || [])}

EVENTOS RECIENTES:
${JSON.stringify(recentEvents?.slice(0, 20)?.map(e => ({ type: e.event_type, revenue: e.revenue })) || [])}
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
              content: `Eres el SUPER AGENTE IA GENERAL de una agencia de creadoras de contenido. Tu trabajo es analizar TODA la plataforma y dar asesorías estratégicas al administrador.

TU ROL:
- Analizar el estado completo de la plataforma: creadoras, fans, pagos, campañas, canal, engagement
- Generar sugerencias CONCRETAS y ACCIONABLES que el admin puede aprobar/rechazar
- Si el admin aprueba, debes dar instrucciones exactas de implementación
- Identificar problemas, oportunidades y prioridades

CATEGORÍAS DE SUGERENCIAS:
- 📝 content: Ideas de contenido, posts, rutinas
- 📣 campaign: Campañas de marketing, retención
- 💰 payment: Optimización de pagos, precios, ofertas
- 🔧 platform: Mejoras técnicas, nuevas funciones
- 🤖 agent: Agregar/modificar agentes IA, personalidad

FORMATO:
- Responde en español profesional pero casual
- Usa emojis para cada sección
- Máximo 8 sugerencias concretas
- Cada sugerencia con: título, descripción, categoría, impacto estimado
- Incluye un resumen ejecutivo al inicio
- Finaliza con las 3 acciones más urgentes

IMPORTANTE: Genera sugerencias en formato estructurado para que puedan guardarse en la base de datos.`,
            },
            {
              role: "user",
              content: `Analiza estos datos de la plataforma completa y genera sugerencias accionables:\n${context}`,
            },
          ],
          max_tokens: 1200,
          temperature: 0.7,
          tools: [
            {
              type: "function",
              function: {
                name: "generate_suggestions",
                description: "Generate actionable suggestions for the platform administrator",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "Executive summary of platform status" },
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string", enum: ["content", "campaign", "payment", "platform", "agent"] },
                          title: { type: "string" },
                          description: { type: "string" },
                          impact: { type: "string", enum: ["alto", "medio", "bajo"] },
                          action_data: { type: "object", description: "Data needed to implement this suggestion" },
                        },
                        required: ["category", "title", "description", "impact"],
                      },
                    },
                  },
                  required: ["summary", "suggestions"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_suggestions" } },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI error:", response.status, errText);
        if (response.status === 429) return new Response(JSON.stringify({ error: "Demasiadas solicitudes" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "Error del servicio AI" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await response.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      let result: any = { summary: "", suggestions: [] };
      if (toolCall?.function?.arguments) {
        try {
          result = JSON.parse(toolCall.function.arguments);
        } catch {
          // Fallback to raw text
          result.summary = aiData.choices?.[0]?.message?.content || "Análisis completado";
        }
      }

      // Save suggestions to DB
      if (result.suggestions?.length > 0) {
        const toInsert = result.suggestions.map((s: any) => ({
          category: s.category,
          title: s.title,
          description: s.description,
          action_data: { impact: s.impact, ...(s.action_data || {}) },
          status: "pending",
        }));
        await supabase.from("agent_suggestions").insert(toInsert);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== APPROVE SUGGESTION =====
    if (action === "approve") {
      const { suggestion_id } = await req.json();
      await supabase.from("agent_suggestions").update({
        status: "approved",
        implemented_at: new Date().toISOString(),
      }).eq("id", suggestion_id);

      return new Response(JSON.stringify({ ok: true, status: "approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== REJECT SUGGESTION =====
    if (action === "reject") {
      const { suggestion_id } = await req.json();
      await supabase.from("agent_suggestions").update({ status: "rejected" }).eq("id", suggestion_id);

      return new Response(JSON.stringify({ ok: true, status: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GET SUGGESTIONS =====
    if (action === "get_suggestions") {
      const { data: suggestions } = await supabase
        .from("agent_suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      return new Response(JSON.stringify({ suggestions: suggestions || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no reconocida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Platform agent error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
