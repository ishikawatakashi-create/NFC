/**
 * アプリケーション全体で使用される定数
 */

/**
 * ポイントシステム関連の定数
 */
export const POINT_CONSTANTS = {
  /** ボーナス閾値のデフォルト値（月間入室回数） */
  DEFAULT_BONUS_THRESHOLD: 10,
  
  /** ボーナスポイントのデフォルト値 */
  DEFAULT_BONUS_POINTS: 3,
  
  /** 入室ポイントのデフォルト値 */
  DEFAULT_ENTRY_POINTS: 1,
} as const;

/**
 * 自動退室チェックの設定
 */
export const AUTO_EXIT_CONSTANTS = {
  /** 自動退室チェックの実行間隔（ミリ秒） */
  CHECK_INTERVAL: 5 * 60 * 1000, // 5分
} as const;

/**
 * NFC関連の定数
 */
export const NFC_CONSTANTS = {
  /** NFCスキャンのタイムアウト時間（ミリ秒） */
  SCAN_TIMEOUT: 10000, // 10秒
  
  /** NFCカード登録のタイムアウト時間（ミリ秒） */
  REGISTER_TIMEOUT: 20000, // 20秒
} as const;

/**
 * LINE連携関連の定数
 */
export const LINE_CONSTANTS = {
  /** LINEリンクトークンの有効期限（時間） */
  LINK_TOKEN_EXPIRY_HOURS: 1,
} as const;
