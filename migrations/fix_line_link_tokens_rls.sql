-- line_link_tokensテーブルのRLS漏れを修正
-- Security Advisor の "RLS Disabled in Public" と
-- "Sensitive Columns Exposed" を解消するための追加マイグレーション

ALTER TABLE IF EXISTS public.line_link_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'line_link_tokens'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'line_link_tokens'
      AND column_name = 'site_id'
    ) THEN
      DROP POLICY IF EXISTS "Admins can manage line_link_tokens" ON public.line_link_tokens;
      CREATE POLICY "Admins can manage line_link_tokens" ON public.line_link_tokens
        FOR ALL
        USING (
          public.is_admin()
          AND site_id = public.get_admin_site_id()
        )
        WITH CHECK (
          public.is_admin()
          AND site_id = public.get_admin_site_id()
        );
    ELSE
      DROP POLICY IF EXISTS "Admins can manage line_link_tokens" ON public.line_link_tokens;
      CREATE POLICY "Admins can manage line_link_tokens" ON public.line_link_tokens
        FOR ALL
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END IF;
END $$;
