
-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_months integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage subscription_plans" ON public.subscription_plans FOR ALL USING (true) WITH CHECK (true);

-- Gift items table
CREATE TABLE public.gift_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎁',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage gift_items" ON public.gift_items FOR ALL USING (true) WITH CHECK (true);

-- Insert default subscription plans for existing creators
INSERT INTO public.subscription_plans (creator_id, name, duration_months, price, currency)
SELECT id, '1 Mes', 1, 11, 'USD' FROM public.creators
UNION ALL
SELECT id, '3 Meses', 3, 19, 'USD' FROM public.creators
UNION ALL
SELECT id, '6 Meses', 6, 35, 'USD' FROM public.creators;

-- Insert default gift items
INSERT INTO public.gift_items (name, emoji, price, currency, sort_order) VALUES
  ('Café', '☕', 5, 'USD', 1),
  ('Rosa', '🌹', 7, 'USD', 2),
  ('Hamburguesa', '🍔', 10, 'USD', 3),
  ('Anillo', '💍', 35, 'USD', 4),
  ('Vehículo', '🚗', 50, 'USD', 5),
  ('Mansión', '🏰', 150, 'USD', 6);

-- Trigger for updated_at on subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
