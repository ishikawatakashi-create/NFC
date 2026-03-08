/**
 * SwitchBot デバイス一覧取得スクリプト
 *
 * 使用方法:
 *   npm run switchbot:devices
 *
 * または:
 *   node scripts/list-switchbot-devices.mjs
 *
 * 前提:
 *   .env.local に SWITCHBOT_TOKEN と SWITCHBOT_SECRET が設定されていること
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SWITCHBOT_API_BASE = "https://api.switch-bot.com/v1.1";
const isDebug = process.argv.includes("--debug");

function loadEnvFile(fileName) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) {
      continue;
    }

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function buildAuthHeaders(token, secret) {
  const t = String(Date.now());
  const nonce = crypto.randomUUID();
  const sign = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(token + t + nonce, "utf8"))
    .digest("base64");

  return {
    Authorization: token,
    sign,
    nonce,
    t,
    "Content-Type": "application/json",
  };
}

function isLockDevice(device) {
  const deviceType = String(device.deviceType || "").toLowerCase();
  return deviceType.includes("lock");
}

function printDevice(device, index) {
  console.log(`\n[${index}] ${device.deviceName || "名前なし"}`);
  console.log(`  type: ${device.deviceType || "unknown"}`);
  console.log(`  id:   ${device.deviceId || "unknown"}`);
  if (device.hubDeviceId) {
    console.log(`  hub:  ${device.hubDeviceId}`);
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const token = process.env.SWITCHBOT_TOKEN;
  const secret = process.env.SWITCHBOT_SECRET;

  if (!token || !secret) {
    console.error("❌ SWITCHBOT_TOKEN または SWITCHBOT_SECRET が設定されていません。");
    console.error("   .env.local に設定してから再実行してください。");
    process.exit(1);
  }

  console.log("🔍 SwitchBot デバイス一覧を取得中...\n");

  const response = await fetch(`${SWITCHBOT_API_BASE}/devices`, {
    method: "GET",
    headers: buildAuthHeaders(token, secret),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.statusCode !== 100) {
    console.error("❌ SwitchBot API の呼び出しに失敗しました。");
    console.error(`   HTTP: ${response.status} ${response.statusText}`);
    if (result?.statusCode) {
      console.error(`   statusCode: ${result.statusCode}`);
    }
    if (result?.message) {
      console.error(`   message: ${result.message}`);
    }
    process.exit(1);
  }

  const devices = Array.isArray(result.body?.deviceList) ? result.body.deviceList : [];
  const remoteDevices = Array.isArray(result.body?.infraredRemoteList)
    ? result.body.infraredRemoteList
    : [];
  const lockDevices = devices.filter(isLockDevice);

  if (isDebug) {
    console.log("🧪 Debug response");
    console.log(JSON.stringify(result, null, 2));
    console.log("");
  }

  if (devices.length === 0 && remoteDevices.length === 0) {
    console.log("⚠️ デバイスが見つかりませんでした。");
    console.log("");
    console.log("確認ポイント:");
    console.log("  1. SwitchBot アプリで Lock が現在のアカウントに登録されているか");
    console.log("  2. Lock が Hub Mini / Hub 2 などと連携済みか");
    console.log("  3. SwitchBot アプリでクラウドサービスが有効か");
    console.log("  4. Hub がオンライン表示になっているか");
    console.log("  5. API トークンを発行したアカウントと、Lock を登録しているアカウントが同じか");
    console.log("");
    console.log("詳細確認:");
    console.log("  npm run switchbot:devices -- --debug");
    return;
  }

  console.log(`✅ ${devices.length} 件のデバイスを取得しました。`);
  if (remoteDevices.length > 0) {
    console.log(`ℹ️ 赤外線リモコンは ${remoteDevices.length} 件あります。`);
  }

  if (lockDevices.length > 0) {
    console.log(`\n🔐 Lock 候補 (${lockDevices.length} 件)`);
    lockDevices.forEach((device, index) => {
      printDevice(device, index + 1);
      if (device.deviceId) {
        console.log(`  env:  SWITCHBOT_LOCK_DEVICE_ID=${device.deviceId}`);
      }
    });
  } else {
    console.log("\n⚠️ Lock 系デバイスは見つかりませんでした。");
    console.log("   Hub 接続、クラウドサービス、deviceType を確認してください。");
  }

  console.log("\n📋 全デバイス一覧");
  devices.forEach((device, index) => {
    printDevice(device, index + 1);
  });
}

main().catch((error) => {
  console.error("❌ 予期しないエラーが発生しました。");
  console.error(`   ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
