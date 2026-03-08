import crypto from "crypto";
import type { UserRole } from "@/types";

const SWITCHBOT_API_BASE = "https://api.switch-bot.com/v1.1";

interface SwitchBotConfig {
  token: string;
  secret: string;
  lockDeviceId: string;
}

interface SwitchBotCommandResult {
  success: boolean;
  statusCode?: number;
  message?: string;
  error?: string;
}

function getSwitchBotConfig(): SwitchBotConfig | null {
  const token = process.env.SWITCHBOT_TOKEN;
  const secret = process.env.SWITCHBOT_SECRET;
  const lockDeviceId = process.env.SWITCHBOT_LOCK_DEVICE_ID;

  if (!token || !secret || !lockDeviceId) {
    return null;
  }

  return { token, secret, lockDeviceId };
}

/**
 * SwitchBot API v1.1の認証ヘッダーを生成する
 * HMAC-SHA256署名方式（token + timestamp + nonce）
 */
function buildAuthHeaders(token: string, secret: string): Record<string, string> {
  const t = String(Date.now());
  const nonce = crypto.randomUUID();
  const data = token + t + nonce;
  const sign = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  return {
    Authorization: token,
    sign,
    nonce,
    t,
    "Content-Type": "application/json",
  };
}

/**
 * SwitchBot Lockデバイスにコマンドを送信する
 */
async function sendLockCommand(
  config: SwitchBotConfig,
  command: "lock" | "unlock"
): Promise<SwitchBotCommandResult> {
  const url = `${SWITCHBOT_API_BASE}/devices/${config.lockDeviceId}/commands`;
  const headers = buildAuthHeaders(config.token, config.secret);
  const body = JSON.stringify({
    command,
    parameter: "default",
    commandType: "command",
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.statusCode !== 100) {
    const errorMsg =
      json.message || `SwitchBot API error: ${response.status} ${response.statusText}`;
    return {
      success: false,
      statusCode: json.statusCode ?? response.status,
      message: json.message,
      error: errorMsg,
    };
  }

  return {
    success: true,
    statusCode: json.statusCode,
    message: json.message,
  };
}

/**
 * 解錠対象のロールかどうかを判定する
 * SWITCHBOT_UNLOCK_ROLES 環境変数で設定（カンマ区切り）
 * 未設定の場合、すべてのロールが解錠対象
 */
export function isUnlockTargetRole(role: UserRole): boolean {
  const rolesEnv = process.env.SWITCHBOT_UNLOCK_ROLES;

  if (!rolesEnv || rolesEnv.trim() === "") {
    return true;
  }

  const targetRoles = rolesEnv.split(",").map((r) => r.trim());
  return targetRoles.includes(role);
}

/**
 * SwitchBot Lockを解錠する
 * 環境変数が未設定の場合は何もせず成功として返す
 */
export async function unlockDoor(): Promise<SwitchBotCommandResult> {
  const config = getSwitchBotConfig();

  if (!config) {
    console.log("[SwitchBot] 環境変数が未設定のため、解錠処理をスキップします");
    return { success: true, message: "SwitchBot not configured, skipped" };
  }

  console.log(`[SwitchBot] 解錠コマンドを送信中... (deviceId: ${config.lockDeviceId})`);
  const result = await sendLockCommand(config, "unlock");

  if (result.success) {
    console.log(`[SwitchBot] 解錠成功`);
  } else {
    console.error(`[SwitchBot] 解錠失敗: ${result.error}`);
  }

  return result;
}

/**
 * SwitchBot Lockを施錠する
 * 環境変数が未設定の場合は何もせず成功として返す
 */
export async function lockDoor(): Promise<SwitchBotCommandResult> {
  const config = getSwitchBotConfig();

  if (!config) {
    console.log("[SwitchBot] 環境変数が未設定のため、施錠処理をスキップします");
    return { success: true, message: "SwitchBot not configured, skipped" };
  }

  console.log(`[SwitchBot] 施錠コマンドを送信中... (deviceId: ${config.lockDeviceId})`);
  const result = await sendLockCommand(config, "lock");

  if (result.success) {
    console.log(`[SwitchBot] 施錠成功`);
  } else {
    console.error(`[SwitchBot] 施錠失敗: ${result.error}`);
  }

  return result;
}

/**
 * SwitchBot Lockのステータスを取得する（デバッグ用）
 */
export async function getLockStatus(): Promise<{
  success: boolean;
  lockState?: string;
  error?: string;
}> {
  const config = getSwitchBotConfig();

  if (!config) {
    return { success: false, error: "SwitchBot not configured" };
  }

  const url = `${SWITCHBOT_API_BASE}/devices/${config.lockDeviceId}/status`;
  const headers = buildAuthHeaders(config.token, config.secret);

  try {
    const response = await fetch(url, { method: "GET", headers });
    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.statusCode !== 100) {
      return {
        success: false,
        error: json.message || `SwitchBot API error: ${response.status}`,
      };
    }

    return {
      success: true,
      lockState: json.body?.lockState,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}
