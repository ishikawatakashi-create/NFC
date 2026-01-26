/**
 * 統一的なロギング機能
 * 開発環境と本番環境で適切なログレベルを使い分ける
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** ログのカテゴリ（例: "Points", "Auth", "LineNotification"） */
  category?: string;
  /** ログに追加するメタデータ */
  meta?: Record<string, any>;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * ログメッセージをフォーマット
   */
  private format(category: string | undefined, message: string): string {
    if (category) {
      return `[${category}] ${message}`;
    }
    return message;
  }

  /**
   * デバッグログ（開発環境のみ出力）
   */
  debug(message: string, options?: LogOptions): void {
    if (this.isDevelopment) {
      const formatted = this.format(options?.category, message);
      if (options?.meta) {
        console.log(formatted, options.meta);
      } else {
        console.log(formatted);
      }
    }
  }

  /**
   * 情報ログ（開発環境のみ出力）
   */
  info(message: string, options?: LogOptions): void {
    if (this.isDevelopment) {
      const formatted = this.format(options?.category, message);
      if (options?.meta) {
        console.log(formatted, options.meta);
      } else {
        console.log(formatted);
      }
    }
  }

  /**
   * 警告ログ（常に出力）
   */
  warn(message: string, options?: LogOptions): void {
    const formatted = this.format(options?.category, message);
    if (options?.meta) {
      console.warn(formatted, options.meta);
    } else {
      console.warn(formatted);
    }
  }

  /**
   * エラーログ（常に出力）
   */
  error(message: string, error?: any, options?: LogOptions): void {
    const formatted = this.format(options?.category, message);
    if (error || options?.meta) {
      console.error(formatted, error || options?.meta);
    } else {
      console.error(formatted);
    }
  }

  /**
   * 特定のカテゴリ用のロガーインスタンスを作成
   * 
   * @example
   * const pointsLogger = logger.category('Points');
   * pointsLogger.debug('Student points updated');
   * // Output: [Points] Student points updated
   */
  category(categoryName: string) {
    return {
      debug: (message: string, meta?: Record<string, any>) =>
        this.debug(message, { category: categoryName, meta }),
      info: (message: string, meta?: Record<string, any>) =>
        this.info(message, { category: categoryName, meta }),
      warn: (message: string, meta?: Record<string, any>) =>
        this.warn(message, { category: categoryName, meta }),
      error: (message: string, error?: any) =>
        this.error(message, error, { category: categoryName }),
    };
  }
}

/**
 * グローバルロガーインスタンス
 * 
 * @example
 * import { logger } from '@/lib/logger';
 * 
 * // 基本的な使用
 * logger.debug('Debug message');
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message', error);
 * 
 * // カテゴリ付きロガー
 * const pointsLogger = logger.category('Points');
 * pointsLogger.debug('Points calculation started');
 * pointsLogger.error('Points calculation failed', error);
 */
export const logger = new Logger();

/**
 * 事前定義されたカテゴリロガー
 */
export const loggers = {
  points: logger.category('Points'),
  auth: logger.category('Auth'),
  line: logger.category('LineNotification'),
  autoExit: logger.category('AutoExit'),
  kiosk: logger.category('Kiosk'),
  api: logger.category('API'),
};
