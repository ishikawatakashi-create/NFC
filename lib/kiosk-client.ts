/**
 * Kioskクライアント用ユーティリティ関数
 */

/**
 * Kiosk APIリクエスト用のヘッダーを生成
 * NEXT_PUBLIC_KIOSK_API_SECRETが設定されている場合は認証ヘッダーを追加
 */
export function createKioskHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const kioskSecret = process.env.NEXT_PUBLIC_KIOSK_API_SECRET;
  
  if (kioskSecret) {
    headers["x-kiosk-secret"] = kioskSecret;
  }
  
  return headers;
}
