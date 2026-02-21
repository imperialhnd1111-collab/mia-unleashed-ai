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

    const { creator_id, action } = await req.json();

    // Gather comprehensive data
    const [
      { data: creator },
      { data: recentPosts },
      { data: fans },
      { data: recentMessages },
      { data: conversations },
      { data: analyticsEvents },
    ] = await Promise.all([
      supabase.from("creators").select("*").eq("id", creator_id).single(),
      supabase.from("channel_posts").select("caption, post_type, status, published_at, engagement").eq("creator_id", creator_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("fans").select("first_name, telegram_username, total_spent, relationship_level, is_subscriber, last_active_at, detected_style").eq("creator_id", creator_id).order("last_active_at", { ascending: false }).limit(30),
      supabase.from("messages").select("role, content, created_at, conversation_id").order("created_at", { ascending: false }).limit(50),
      supabase.from("conversations").select("current_topic, mood_score, message_count, last_message_at").eq("creator_id", creator_id).order("last_message_at", { ascending: false }).limit(20),
      supabase.from("analytics_events").select("event_type, revenue, event_data, created_at").eq("creator_id", creator_id).order("created_at", { ascending: false }).limit(30),
    ]);

    const now = new Date();
    const dayOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][now.getDay()];
    const hour = now.getHours();

    const context = `
PERFIL DE LA CREADORA:
- Nombre: ${creator?.name || "Desconocida"}
- Username: @${creator?.username || ""}
- Bio: ${creator?.bio || "Sin bio"}
- Backstory: ${creator?.backstory || "Sin backstory"}
- Personalidad: ${JSON.stringify(creator?.personality_traits || [])}
- Rutina diaria: ${JSON.stringify(creator?.daily_routines || [])}
- Emoción actual: ${creator?.current_emotion || "normal"}
- Zona horaria: ${creator?.timezone || "America/Bogota"}
- Precio suscripción: $${creator?.subscription_price || 0}

CONTEXTO TEMPORAL:
- Día: ${dayOfWeek}
- Hora local aprox: ${hour}:00
- Fecha: ${now.toLocaleDateString("es-CO")}

ÚLTIMOS POSTS DEL CANAL (${recentPosts?.length || 0}):
${recentPosts?.slice(0, 10).map(p => `- [${p.status}] ${p.caption?.slice(0, 100)}`).join("\n") || "Sin posts"}

FANS ACTIVOS (${fans?.length || 0}):
- Suscriptores: ${fans?.filter(f => f.is_subscriber).length || 0}
- Top gastadores: ${JSON.stringify(fans?.slice(0, 5).map(f => ({ name: f.first_name, spent: f.total_spent, level: f.relationship_level })) || [])}
- Estilos detectados: ${JSON.stringify([...new Set(fans?.flatMap(f => Object.keys(f.detected_style || {})))] || [])}

TEMAS DE CONVERSACIÓN RECIENTES:
${conversations?.slice(0, 10).map(c => `- Tema: ${c.current_topic || "general"} | Mood: ${c.mood_score} | Msgs: ${c.message_count}`).join("\n") || "Sin conversaciones"}

MUESTRA DE MENSAJES RECIENTES:
${recentMessages?.slice(0, 15).map(m => `[${m.role}]: ${m.content?.slice(0, 80)}`).join("\n") || "Sin mensajes"}

EVENTOS RECIENTES:
${analyticsEvents?.slice(0, 10).map(e => `- ${e.event_type}: $${e.revenue || 0}`).join("\n") || "Sin eventos"}
`;

    let systemPrompt = "";

    if (action === "generate_image_prompt") {
      systemPrompt = `Eres un director creativo experto en contenido para creadoras de contenido en Telegram. Basándote en los datos de la creadora, genera EXACTAMENTE un prompt en inglés optimizado para generar una imagen atractiva para su canal.

El prompt debe:
- Ser descriptivo y visual (escena, iluminación, estilo, mood)
- Reflejar la personalidad y estética de la creadora
- Ser apropiado para redes sociales
- Considerar la hora del día y actividad actual
- NO incluir texto ni letras en la imagen
- Máximo 2 oraciones

Responde SOLO con el prompt en inglés, nada más.`;
    } else {
      systemPrompt = `Eres el Super Agente IA de Contenido para canales de Telegram. Analizas el perfil, fans, conversaciones, tendencias e interacciones de una creadora para generar estrategias de contenido.

TU MISIÓN:
1. 📊 ANÁLISIS: Evalúa el rendimiento actual del canal y patrones de interacción
2. 🔮 PREDICCIONES: Basándote en tendencias, predice qué tipo de contenido funcionará mejor
3. 📝 SUGERENCIAS DE POSTS: Genera 5 ideas de posts específicos para hoy/esta semana
4. 💬 TEMAS DE CONVERSACIÓN: Sugiere temas que la creadora debería abordar en chats
5. 📅 RUTINA DEL DÍA: Propón una agenda de publicaciones para hoy
6. 🚀 NOVEDADES: Sugiere funciones, herramientas o estrategias nuevas

FORMATO:
- Responde en español casual pero profesional
- Usa emojis para separar secciones
- Sé MUY específico (no genérico)
- Los posts sugeridos deben sonar como la creadora (usa su estilo)
- Incluye horarios óptimos de publicación
- Considera la hora actual y actividad de la creadora
- Máximo 800 palabras`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: action === "generate_image_prompt" 
            ? `Genera un prompt para crear una imagen atractiva para el canal de ${creator?.name}. Contexto:\n${context}`
            : `Analiza estos datos y genera el plan de contenido completo:\n${context}` 
          },
        ],
        max_tokens: action === "generate_image_prompt" ? 150 : 1000,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Error del servicio AI" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const result = aiData.choices?.[0]?.message?.content || "No se pudo generar análisis.";

    // If generating image prompt, now generate the actual image
    if (action === "generate_image_prompt") {
      const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: result }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResponse.ok) {
        return new Response(JSON.stringify({ analysis: result, image: null, error_image: "No se pudo generar imagen" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imgData = await imgResponse.json();
      const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;

      return new Response(JSON.stringify({ prompt: result, image: imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Channel AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
