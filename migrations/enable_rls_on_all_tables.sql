-- すべてのpublicスキーマのテーブルに対してRLS（Row Level Security）を有効化
-- セキュリティ上の重要な修正：PostgRESTで公開されているテーブルはRLSを有効にする必要がある

-- ============================================
-- 1. すべてのテーブルでRLSを有効化
-- ============================================

-- 基本テーブル
ALTER TABLE IF EXISTS public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guardian_line_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;

-- 管理者テーブル
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;

-- アクセス時間設定テーブル
ALTER TABLE IF EXISTS public.role_based_access_times ENABLE ROW LEVEL SECURITY;

-- カード関連テーブル
ALTER TABLE IF EXISTS public.card_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_cards ENABLE ROW LEVEL SECURITY;

-- ボーナス閾値設定テーブル
ALTER TABLE IF EXISTS public.role_based_bonus_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_based_bonus_thresholds ENABLE ROW LEVEL SECURITY;

-- 親御さん関連テーブル
ALTER TABLE IF EXISTS public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_students ENABLE ROW LEVEL SECURITY;

-- ポイント関連テーブル
ALTER TABLE IF EXISTS public.point_transactions ENABLE ROW LEVEL SECURITY;

-- ログ関連テーブル
ALTER TABLE IF EXISTS public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_line_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.line_notification_logs ENABLE ROW LEVEL SECURITY;

-- ポイント設定テーブル
ALTER TABLE IF EXISTS public.point_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 管理者用の基本ポリシー（全アクセス許可）
-- ============================================
-- 注意: 管理者はadminsテーブルに存在するユーザーのみ
-- site_idによるマルチテナント対応も考慮

-- 管理者チェック用の関数を作成（再利用可能）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE auth_user_id = auth.uid()
  );
END;
$$;

-- 管理者のsite_idを取得する関数（site_idカラムを持つテーブル用）
CREATE OR REPLACE FUNCTION public.get_admin_site_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT site_id
    FROM public.admins
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- ============================================
-- 3. 各テーブルに対する基本ポリシー
-- ============================================

-- sitesテーブル: 管理者のみアクセス可能
-- 注意: sitesテーブルはidカラムがsite_idとして機能する可能性があるため、idでフィルタリング
DROP POLICY IF EXISTS "Admins can manage sites" ON public.sites;
CREATE POLICY "Admins can manage sites" ON public.sites
  FOR ALL
  USING (
    public.is_admin()
    AND id::TEXT = public.get_admin_site_id()
  )
  WITH CHECK (
    public.is_admin()
    AND id::TEXT = public.get_admin_site_id()
  );

-- devicesテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage devices" ON public.devices;
CREATE POLICY "Admins can manage devices" ON public.devices
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- studentsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
-- site_idカラムが存在する場合のみフィルタリングを適用
-- site_idがUUID型の場合は型変換が必要
DO $$
DECLARE
  site_id_type TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'site_id'
  ) THEN
    -- site_idカラムの型を取得
    SELECT data_type INTO site_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'students'
    AND column_name = 'site_id';
    
    DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
    
    -- UUID型の場合は型変換、TEXT型の場合はそのまま
    IF site_id_type = 'uuid' THEN
      EXECUTE format('CREATE POLICY "Admins can manage students" ON public.students
        FOR ALL
        USING (
          public.is_admin()
          AND site_id::TEXT = public.get_admin_site_id()
        )
        WITH CHECK (
          public.is_admin()
          AND site_id::TEXT = public.get_admin_site_id()
        )');
    ELSE
      EXECUTE format('CREATE POLICY "Admins can manage students" ON public.students
        FOR ALL
        USING (
          public.is_admin()
          AND site_id = public.get_admin_site_id()
        )
        WITH CHECK (
          public.is_admin()
          AND site_id = public.get_admin_site_id()
        )');
    END IF;
  ELSE
    DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
    CREATE POLICY "Admins can manage students" ON public.students
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- cardsテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage cards" ON public.cards;
CREATE POLICY "Admins can manage cards" ON public.cards
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- guardiansテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage guardians" ON public.guardians;
CREATE POLICY "Admins can manage guardians" ON public.guardians
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- guardian_line_linksテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage guardian_line_links" ON public.guardian_line_links;
CREATE POLICY "Admins can manage guardian_line_links" ON public.guardian_line_links
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- student_guardiansテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage student_guardians" ON public.student_guardians;
CREATE POLICY "Admins can manage student_guardians" ON public.student_guardians
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- link_codesテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage link_codes" ON public.link_codes;
CREATE POLICY "Admins can manage link_codes" ON public.link_codes
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- access_eventsテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage access_events" ON public.access_events;
CREATE POLICY "Admins can manage access_events" ON public.access_events
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- event_correctionsテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage event_corrections" ON public.event_corrections;
CREATE POLICY "Admins can manage event_corrections" ON public.event_corrections
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- points_ledgerテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage points_ledger" ON public.points_ledger;
CREATE POLICY "Admins can manage points_ledger" ON public.points_ledger
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- settingsテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- adminsテーブル: 管理者は自分の情報のみ閲覧可能、管理者の作成は別途制御
DROP POLICY IF EXISTS "Admins can view own admin info" ON public.admins;
CREATE POLICY "Admins can view own admin info" ON public.admins
  FOR SELECT
  USING (auth_user_id = (select auth.uid()));

-- role_based_access_timesテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'role_based_access_times' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage role_based_access_times" ON public.role_based_access_times;
    CREATE POLICY "Admins can manage role_based_access_times" ON public.role_based_access_times
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
    DROP POLICY IF EXISTS "Admins can manage role_based_access_times" ON public.role_based_access_times;
    CREATE POLICY "Admins can manage role_based_access_times" ON public.role_based_access_times
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- card_tokensテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
-- 注意: card_tokens.site_idはUUID型、admins.site_idはTEXT型のため型変換が必要
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'card_tokens' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage card_tokens" ON public.card_tokens;
    CREATE POLICY "Admins can manage card_tokens" ON public.card_tokens
      FOR ALL
      USING (
        public.is_admin()
        AND site_id::TEXT = public.get_admin_site_id()
      )
      WITH CHECK (
        public.is_admin()
        AND site_id::TEXT = public.get_admin_site_id()
      );
  ELSE
    DROP POLICY IF EXISTS "Admins can manage card_tokens" ON public.card_tokens;
    CREATE POLICY "Admins can manage card_tokens" ON public.card_tokens
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- student_cardsテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage student_cards" ON public.student_cards;
CREATE POLICY "Admins can manage student_cards" ON public.student_cards
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- role_based_bonus_thresholdsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'role_based_bonus_thresholds' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage role_based_bonus_thresholds" ON public.role_based_bonus_thresholds;
    CREATE POLICY "Admins can manage role_based_bonus_thresholds" ON public.role_based_bonus_thresholds
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
    DROP POLICY IF EXISTS "Admins can manage role_based_bonus_thresholds" ON public.role_based_bonus_thresholds;
    CREATE POLICY "Admins can manage role_based_bonus_thresholds" ON public.role_based_bonus_thresholds
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- class_based_bonus_thresholdsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class_based_bonus_thresholds' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage class_based_bonus_thresholds" ON public.class_based_bonus_thresholds;
    CREATE POLICY "Admins can manage class_based_bonus_thresholds" ON public.class_based_bonus_thresholds
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
    DROP POLICY IF EXISTS "Admins can manage class_based_bonus_thresholds" ON public.class_based_bonus_thresholds;
    CREATE POLICY "Admins can manage class_based_bonus_thresholds" ON public.class_based_bonus_thresholds
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- parentsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'parents' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage parents" ON public.parents;
    CREATE POLICY "Admins can manage parents" ON public.parents
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
    DROP POLICY IF EXISTS "Admins can manage parents" ON public.parents;
    CREATE POLICY "Admins can manage parents" ON public.parents
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- parent_studentsテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage parent_students" ON public.parent_students;
CREATE POLICY "Admins can manage parent_students" ON public.parent_students
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- point_transactionsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'point_transactions' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage point_transactions" ON public.point_transactions;
    CREATE POLICY "Admins can manage point_transactions" ON public.point_transactions
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
    DROP POLICY IF EXISTS "Admins can manage point_transactions" ON public.point_transactions;
    CREATE POLICY "Admins can manage point_transactions" ON public.point_transactions
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- access_logsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'access_logs' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage access_logs" ON public.access_logs;
    CREATE POLICY "Admins can manage access_logs" ON public.access_logs
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
    DROP POLICY IF EXISTS "Admins can manage access_logs" ON public.access_logs;
    CREATE POLICY "Admins can manage access_logs" ON public.access_logs
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- parent_line_accountsテーブル: 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admins can manage parent_line_accounts" ON public.parent_line_accounts;
CREATE POLICY "Admins can manage parent_line_accounts" ON public.parent_line_accounts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- line_notification_logsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'line_notification_logs' 
    AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage line_notification_logs" ON public.line_notification_logs;
    CREATE POLICY "Admins can manage line_notification_logs" ON public.line_notification_logs
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
    DROP POLICY IF EXISTS "Admins can manage line_notification_logs" ON public.line_notification_logs;
    CREATE POLICY "Admins can manage line_notification_logs" ON public.line_notification_logs
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- point_settingsテーブル: 管理者のみアクセス可能（site_idでフィルタリング）
DO $$
BEGIN
  -- テーブルが存在するか確認
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'point_settings'
  ) THEN
    -- site_idカラムが存在するか確認
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'point_settings' 
      AND column_name = 'site_id'
    ) THEN
      DROP POLICY IF EXISTS "Admins can manage point_settings" ON public.point_settings;
      CREATE POLICY "Admins can manage point_settings" ON public.point_settings
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
      DROP POLICY IF EXISTS "Admins can manage point_settings" ON public.point_settings;
      CREATE POLICY "Admins can manage point_settings" ON public.point_settings
        FOR ALL
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. コメント追加
-- ============================================
COMMENT ON FUNCTION public.is_admin() IS '現在のユーザーが管理者かどうかを判定する関数';
COMMENT ON FUNCTION public.get_admin_site_id() IS '現在の管理者のsite_idを取得する関数（マルチテナント対応）';

