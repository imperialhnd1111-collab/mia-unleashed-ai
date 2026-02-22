
-- Payment settings table (global, not per-creator)
CREATE TABLE public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL, -- 'wompi', 'binance', 'ton', 'telegram_stars'
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider)
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage payment_settings"
ON public.payment_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default providers
INSERT INTO public.payment_settings (provider, is_enabled, config) VALUES
  ('wompi', false, '{"currency": "COP", "description": "Pago Wompi"}'::jsonb),
  ('binance', false, '{"currency": "USDT"}'::jsonb),
  ('ton', false, '{"wallet_address": ""}'::jsonb),
  ('telegram_stars', true, '{"enabled": true}'::jsonb);

-- AI agent suggestions table
CREATE TABLE public.agent_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL, -- 'content', 'campaign', 'payment', 'platform', 'agent'
  title text NOT NULL,
  description text NOT NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'implemented'
  implemented_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage agent_suggestions"
ON public.agent_suggestions FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for payment_settings updated_at
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
