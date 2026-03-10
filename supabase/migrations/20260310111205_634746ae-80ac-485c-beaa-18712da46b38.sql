
CREATE TABLE public.bot_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  fan_id uuid REFERENCES public.fans(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_context jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'error',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot_errors"
ON public.bot_errors FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role bot_errors"
ON public.bot_errors FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Creators can read own bot_errors"
ON public.bot_errors FOR SELECT TO authenticated
USING (
  creator_id IN (SELECT id FROM public.creators WHERE id IN (SELECT creator_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE INDEX idx_bot_errors_creator_created ON public.bot_errors (creator_id, created_at DESC);
CREATE INDEX idx_bot_errors_unresolved ON public.bot_errors (resolved, created_at DESC) WHERE resolved = false;
