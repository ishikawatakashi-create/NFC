/**
 * 共通型定義
 */

/**
 * 生徒のステータス
 */
export type StudentStatus = "active" | "suspended" | "withdrawn" | "graduated" | "disabled";

/**
 * 生徒のクラス
 */
export type StudentClass = "kindergarten" | "beginner" | "challenger" | "creator" | "innovator";

/**
 * ユーザーの役割
 */
export type UserRole = "student" | "part_time" | "full_time";

/**
 * イベントタイプ
 */
export type EventType = "entry" | "exit" | "no_log" | "forced_exit";

/**
 * トランザクションタイプ
 */
export type TransactionType = "entry" | "bonus" | "admin_add" | "consumption" | "admin_subtract";

/**
 * 生徒情報（API Response用）
 * 
 * 注意: idは必ずstringとして扱うこと
 * データベースのUUIDはstringとしてシリアライズされる
 */
export interface Student {
  id: string; // UUID (string)
  name: string;
  grade?: string | null;
  status: StudentStatus;
  class?: StudentClass | null;
  role?: UserRole;
  cardId?: string | null;
  lastEventType?: EventType | null;
  lastEventTimestamp?: string | null;
  currentPoints?: number;
  createdAt?: string;
}

/**
 * アクセスログ（API Response用）
 */
export interface AccessLog {
  id: string; // UUID (string)
  timestamp: string;
  studentId: string; // UUID (string)
  studentName: string;
  eventType: EventType;
  cardId?: string | null;
  device?: string;
  notification?: string;
  pointsAwarded?: boolean;
}

/**
 * ポイント履歴（API Response用）
 */
export interface PointTransaction {
  id: string; // UUID (string)
  studentId: string; // UUID (string)
  transactionType: TransactionType;
  points: number;
  description?: string | null;
  referenceId?: string | null;
  adminId?: string | null;
  createdAt: string;
}
