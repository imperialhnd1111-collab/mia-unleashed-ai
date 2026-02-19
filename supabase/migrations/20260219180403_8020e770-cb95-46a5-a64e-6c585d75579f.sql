
-- Add payment_methods_config for structured payment buttons per creator
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS payment_methods_config jsonb DEFAULT '[]'::jsonb;

-- Add channel_auto_publish to enable auto-publishing per creator
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS channel_auto_publish boolean DEFAULT false;

-- Add channel_post_interval_hours for scheduling
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS channel_post_interval_hours integer DEFAULT 4;
