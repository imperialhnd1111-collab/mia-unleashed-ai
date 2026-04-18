
-- Añadir columnas para el paywall del chat: contador de mensajes gratis usados
-- y estado/expiración de la membresía premium del chat (separada del canal VIP).
ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS free_messages_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_premium_expires_at timestamp with time zone;
