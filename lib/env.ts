/**
 * 環境変数の型安全な管理
 * 
 * このファイルはアプリケーション全体で使用される環境変数を集中管理します。
 * 環境変数が未設定の場合は、起動時にエラーを発生させます。
 */

/**
 * 必須の環境変数
 */
const requiredEnvVars = {
  // Supabase設定（必須）
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // サイト識別子（必須）
  SITE_ID: process.env.SITE_ID,
} as const;

/**
 * オプションの環境変数（セキュリティ・機能拡張用）
 */
const optionalEnvVars = {
  // Kiosk API認証（推奨：本番環境では必須）
  KIOSK_API_SECRET: process.env.KIOSK_API_SECRET,
  
  // CRON API認証（オプション）
  CRON_API_SECRET: process.env.CRON_API_SECRET,
  
  // LINE連携（オプション）
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  
  // デプロイメント設定
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  
  // 環境識別
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

/**
 * 環境変数の検証
 * アプリケーション起動時に呼び出して、必須の環境変数が設定されているか確認します
 */
export function validateEnv(): void {
  const missingVars: string[] = [];
  
  // 必須環境変数のチェック
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      missingVars.push(key);
    }
  });
  
  if (missingVars.length > 0) {
    const errorMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ 環境変数エラー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

以下の必須環境変数が設定されていません：
${missingVars.map(v => `  - ${v}`).join('\n')}

.env.local ファイルを確認してください。
サンプルファイル: .env.local.example

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    throw new Error(errorMessage);
  }
  
  // 本番環境での推奨設定チェック（警告のみ）
  if (process.env.NODE_ENV === 'production') {
    const warnings: string[] = [];
    
    if (!optionalEnvVars.KIOSK_API_SECRET) {
      warnings.push('KIOSK_API_SECRET が設定されていません（セキュリティリスク）');
    }
    
    if (!optionalEnvVars.LINE_CHANNEL_SECRET && !optionalEnvVars.LINE_CHANNEL_ACCESS_TOKEN) {
      warnings.push('LINE連携の環境変数が設定されていません（LINE通知機能が無効）');
    }
    
    if (warnings.length > 0) {
      console.warn('\n⚠️  本番環境での推奨設定:\n' + warnings.map(w => `  - ${w}`).join('\n') + '\n');
    }
  }
}

/**
 * 型安全な環境変数アクセス
 */
export const env = {
  // Supabase設定
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!;
  },
  
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  },
  
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!;
  },
  
  // サイト識別子
  get SITE_ID(): string {
    return requiredEnvVars.SITE_ID!;
  },
  
  // オプション設定（undefinedを許容）
  get KIOSK_API_SECRET(): string | undefined {
    return optionalEnvVars.KIOSK_API_SECRET;
  },
  
  get CRON_API_SECRET(): string | undefined {
    return optionalEnvVars.CRON_API_SECRET;
  },
  
  get LINE_CHANNEL_SECRET(): string | undefined {
    return optionalEnvVars.LINE_CHANNEL_SECRET;
  },
  
  get LINE_CHANNEL_ACCESS_TOKEN(): string | undefined {
    return optionalEnvVars.LINE_CHANNEL_ACCESS_TOKEN;
  },
  
  get NEXT_PUBLIC_BASE_URL(): string | undefined {
    return optionalEnvVars.NEXT_PUBLIC_BASE_URL;
  },
  
  get VERCEL_URL(): string | undefined {
    return optionalEnvVars.VERCEL_URL;
  },
  
  get NODE_ENV(): string {
    return optionalEnvVars.NODE_ENV;
  },
  
  get IS_PRODUCTION(): boolean {
    return this.NODE_ENV === 'production';
  },
  
  get IS_DEVELOPMENT(): boolean {
    return this.NODE_ENV === 'development';
  },
} as const;

// クライアントサイドでもアクセス可能な環境変数（公開情報のみ）
export const publicEnv = {
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return env.NEXT_PUBLIC_SUPABASE_URL;
  },
  
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
  
  get NEXT_PUBLIC_BASE_URL(): string | undefined {
    return env.NEXT_PUBLIC_BASE_URL;
  },
} as const;
