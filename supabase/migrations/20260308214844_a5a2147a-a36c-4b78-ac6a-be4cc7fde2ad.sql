
-- 1. Fix payment_settings: only admins can manage, authenticated can read enabled ones
DROP POLICY IF EXISTS "Authenticated users can manage payment_settings" ON public.payment_settings;

CREATE POLICY "Admins can manage payment_settings"
ON public.payment_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read enabled payment_settings"
ON public.payment_settings FOR SELECT TO authenticated
USING (is_enabled = true);

-- 2. Fix fans: restrict to creator's own fans or admin
DROP POLICY IF EXISTS "Authenticated users can manage fans" ON public.fans;
DROP POLICY IF EXISTS "Service role fans" ON public.fans;

CREATE POLICY "Service role fans"
ON public.fans FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage all fans"
ON public.fans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can read own fans"
ON public.fans FOR SELECT TO authenticated
USING (
  creator_id IN (SELECT id FROM public.creators WHERE id IN (SELECT creator_id FROM public.profiles WHERE id = auth.uid()))
);

-- 3. Fix analytics_events: restrict to creator's own events or admin
DROP POLICY IF EXISTS "Authenticated users can manage analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Service role analytics" ON public.analytics_events;

CREATE POLICY "Service role analytics"
ON public.analytics_events FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage all analytics"
ON public.analytics_events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can read own analytics"
ON public.analytics_events FOR SELECT TO authenticated
USING (
  creator_id IN (SELECT id FROM public.creators WHERE id IN (SELECT creator_id FROM public.profiles WHERE id = auth.uid()))
);
