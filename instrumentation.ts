/**
 * Next.js Instrumentation
 * アプリケーション起動時に一度だけ実行されます
 * 
 * 参考: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // サーバーサイドでのみ実行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    
    try {
      // 環境変数の検証を実行
      validateEnv();
      console.log('✅ 環境変数の検証が完了しました');
    } catch (error) {
      // 環境変数が不足している場合はエラーを表示して終了
      console.error(error);
      process.exit(1);
    }
  }
}
