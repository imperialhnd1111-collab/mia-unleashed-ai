
-- 1. UNIQUE constraint on fans(creator_id, telegram_user_id) for upsert
ALTER TABLE public.fans ADD CONSTRAINT fans_creator_telegram_user_unique UNIQUE (creator_id, telegram_user_id);

-- 2. UNIQUE constraint on conversations(creator_id, fan_id) for upsert
ALTER TABLE public.conversations ADD CONSTRAINT conversations_creator_fan_unique UNIQUE (creator_id, fan_id);

-- 3. Index on messages(telegram_message_id) for deduplication
CREATE INDEX IF NOT EXISTS idx_messages_telegram_message_id ON public.messages (telegram_message_id);
