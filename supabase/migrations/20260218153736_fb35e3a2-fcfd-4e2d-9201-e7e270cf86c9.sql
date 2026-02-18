
-- Enum for creator status
CREATE TYPE public.creator_status AS ENUM ('active', 'inactive', 'paused');
CREATE TYPE public.content_type AS ENUM ('photo', 'video', 'audio', 'text');
CREATE TYPE public.content_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE public.message_role AS ENUM ('user', 'assistant');
CREATE TYPE public.emotion_state AS ENUM ('happy', 'sad', 'excited', 'bored', 'angry', 'flirty', 'tired', 'hungry', 'normal');

-- Creators / AI Models
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  backstory TEXT,
  personality_traits JSONB DEFAULT '[]',
  daily_routines JSONB DEFAULT '[]',
  telegram_bot_token TEXT,
  telegram_bot_username TEXT,
  telegram_channel_id TEXT,
  whatsapp_number TEXT,
  is_ai BOOLEAN DEFAULT true,
  ai_enabled BOOLEAN DEFAULT true,
  current_emotion emotion_state DEFAULT 'normal',
  timezone TEXT DEFAULT 'America/Bogota',
  language TEXT DEFAULT 'es',
  status creator_status DEFAULT 'active',
  subscription_price DECIMAL(10,2) DEFAULT 0,
  vip_channel_link TEXT,
  payment_methods JSONB DEFAULT '[]',
  social_links JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{"total_fans": 0, "total_revenue": 0, "messages_sent": 0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content library
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  description TEXT,
  content_type content_type NOT NULL,
  file_url TEXT,
  thumbnail_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  status content_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  telegram_message_id TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fans / subscribers
CREATE TABLE public.fans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'es',
  detected_style JSONB DEFAULT '{}',
  relationship_level INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  is_subscriber BOOLEAN DEFAULT false,
  subscription_expires_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id, telegram_user_id)
);

-- Conversation memory / context
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES public.fans(id) ON DELETE CASCADE NOT NULL,
  context_summary TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  current_topic TEXT,
  tip_requested_at TIMESTAMPTZ,
  content_pitched_at TIMESTAMPTZ,
  mood_score DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id, fan_id)
);

-- Individual messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  telegram_message_id TEXT,
  media_url TEXT,
  has_payment_button BOOLEAN DEFAULT false,
  payment_data JSONB,
  typing_delay_ms INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns (mass messages / broadcasts)
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL,
  media_url TEXT,
  has_payment_button BOOLEAN DEFAULT false,
  payment_data JSONB,
  target_audience JSONB DEFAULT '{"all": true}',
  status campaign_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Channel posts (automated posting to Telegram channel)
CREATE TABLE public.channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  caption TEXT,
  media_url TEXT,
  post_type content_type DEFAULT 'text',
  status content_status DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  telegram_message_id TEXT,
  engagement JSONB DEFAULT '{"views": 0, "reactions": 0, "shares": 0}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics / metrics
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES public.fans(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI activity log (for debugging and training)
CREATE TABLE public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES public.fans(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  model_used TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: admin authenticated users can manage everything
CREATE POLICY "Authenticated users can manage creators" ON public.creators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage content" ON public.content_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage fans" ON public.fans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage conversations" ON public.conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage messages" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage campaigns" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage channel posts" ON public.channel_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage analytics" ON public.analytics_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ai logs" ON public.ai_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role creators" ON public.creators FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role content" ON public.content_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role fans" ON public.fans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role conversations" ON public.conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role messages" ON public.messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role campaigns" ON public.campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role channel posts" ON public.channel_posts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role analytics" ON public.analytics_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role ai logs" ON public.ai_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fans;
