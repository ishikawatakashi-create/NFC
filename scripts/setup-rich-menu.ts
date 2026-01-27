/**
 * LINEリッチメニュー設定スクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/setup-rich-menu.ts
 * 
 * または、開発サーバーが起動している場合:
 *   node scripts/setup-rich-menu.js (コンパイル後)
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

const IMAGE_URL = `${BASE_URL}/images/rich-menu.png`;

async function setupRichMenu() {
  console.log('🚀 LINEリッチメニューを設定します...\n');
  console.log(`📸 画像URL: ${IMAGE_URL}\n`);

  try {
    const response = await fetch(`${BASE_URL}/api/line/rich-menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: IMAGE_URL,
      }),
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ リッチメニューの設定が完了しました！');
      console.log(`📋 Rich Menu ID: ${result.richMenuId}\n`);
      console.log('📱 LINEアプリで確認してください:');
      console.log('   1. LINE公式アカウントを開く');
      console.log('   2. トーク画面下部にリッチメニューが表示される');
      console.log('   3. 「カード紐づけ」ボタンをタップして動作確認\n');
    } else {
      console.error('❌ エラーが発生しました:');
      console.error(result.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ リクエストエラー:');
    console.error(error.message);
    process.exit(1);
  }
}

setupRichMenu();
