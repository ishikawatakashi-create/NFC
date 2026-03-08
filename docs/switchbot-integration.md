# SwitchBot Lock 連携ガイド

NFC入退室システムとSwitchBot Lockを連携し、特定のロール（正社員など）が入室した際に自動で鍵を解錠する機能のセットアップガイドです。

## 概要

```
[NFCカードタップ] → [入室処理] → [ロール判定] → [SwitchBot API] → [鍵が解錠]
```

- **トリガー**: NFCカードによる入室（entry）イベント
- **条件**: 環境変数 `SWITCHBOT_UNLOCK_ROLES` で指定されたロールの人が入室した場合
- **動作**: SwitchBot Cloud API v1.1 経由で Lock デバイスに解錠コマンドを送信
- **非同期**: 解錠処理はレスポンスをブロックしません（入退室記録の成功には影響しない）

## 前提条件

1. **SwitchBot Lock** を所有していること
2. **SwitchBot Hub**（Hub Mini / Hub 2 など）と Lock が連携済みであること
3. SwitchBot アプリで**クラウドサービスが有効化**されていること
4. SwitchBot アプリの**開発者向けオプション**からAPIトークンを取得済みであること

## セットアップ手順

### 1. SwitchBot API認証情報を取得

1. SwitchBot アプリを開く
2. **プロフィール** > **設定** に移動
3. **開発者向けオプション** をタップ（表示されない場合はアプリバージョンを確認）
4. 以下の2つをコピー：
   - **トークン** → `SWITCHBOT_TOKEN`
   - **クライアントシークレット** → `SWITCHBOT_SECRET`

### 2. Lock デバイスIDを確認

このリポジトリには、`.env.local` の `SWITCHBOT_TOKEN` / `SWITCHBOT_SECRET` を使って
デバイス一覧を取得するスクリプトが入っています。

```bash
npm run switchbot:devices
```

または:

```bash
node scripts/list-switchbot-devices.mjs
```

`Lock 候補` に表示された `env:` 行の値を、そのまま `SWITCHBOT_LOCK_DEVICE_ID` に設定してください。

出力例:

```text
🔐 Lock 候補 (1 件)

[1] オフィス入口
  type: Smart Lock
  id:   ABCDEF123456
  env:  SWITCHBOT_LOCK_DEVICE_ID=ABCDEF123456
```

補足として、手元で直接 API を叩く場合は以下でも確認できます。

以下のワンライナーでも確認できます（Node.js 18+）：

```bash
node -e "
const crypto = require('crypto');
const token = 'YOUR_TOKEN_HERE';
const secret = 'YOUR_SECRET_HERE';
const t = String(Date.now());
const nonce = crypto.randomUUID();
const sign = crypto.createHmac('sha256', secret)
  .update(Buffer.from(token + t + nonce, 'utf-8'))
  .digest('base64');
fetch('https://api.switch-bot.com/v1.1/devices', {
  headers: { Authorization: token, sign, nonce, t, 'Content-Type': 'application/json' }
}).then(r => r.json()).then(d => {
  const locks = (d.body?.deviceList || []).filter(d => d.deviceType === 'Smart Lock');
  console.log('Lock devices:', JSON.stringify(locks, null, 2));
});
"
```

出力例：
```json
[
  {
    "deviceId": "ABCDEF123456",
    "deviceName": "オフィス入口",
    "deviceType": "Smart Lock",
    "hubDeviceId": "..."
  }
]
```

`deviceId` の値を `SWITCHBOT_LOCK_DEVICE_ID` に設定します。

### 3. 環境変数を設定

`.env.local` に以下を追加：

```env
# SwitchBot連携
SWITCHBOT_TOKEN=your-switchbot-token
SWITCHBOT_SECRET=your-switchbot-secret
SWITCHBOT_LOCK_DEVICE_ID=your-lock-device-id

# 解錠対象ロール（カンマ区切り）
# 正社員のみの場合:
SWITCHBOT_UNLOCK_ROLES=full_time

# 正社員とアルバイトの場合:
# SWITCHBOT_UNLOCK_ROLES=full_time,part_time

# 全員の場合（未設定 or 空文字にする）:
# SWITCHBOT_UNLOCK_ROLES=
```

### 4. Vercelにデプロイする場合

Vercelのダッシュボードで同じ環境変数を設定してください：

1. Vercelプロジェクト > **Settings** > **Environment Variables**
2. 上記4つの環境変数を追加
3. **Redeploy** を実行

## ロール設定

| ロール値 | 表示名 | 説明 |
|----------|--------|------|
| `student` | 生徒 | 教室の生徒 |
| `part_time` | アルバイト | アルバイトスタッフ |
| `full_time` | 正社員 | 正社員スタッフ |

### 設定例

| ユースケース | `SWITCHBOT_UNLOCK_ROLES` の値 |
|-------------|-------------------------------|
| 正社員のみ解錠 | `full_time` |
| スタッフ全員（正社員+アルバイト）で解錠 | `full_time,part_time` |
| 全員で解錠 | 未設定（空文字） |
| 生徒以外で解錠 | `full_time,part_time` |

## 動作フロー

1. ユーザーがキオスクでNFCカードをタップ
2. `/api/cards/verify` でカードを検証、ユーザー情報を取得
3. `/api/access-logs` で入室ログを作成
4. ユーザーのロールが `SWITCHBOT_UNLOCK_ROLES` に含まれるか判定
5. 含まれる場合、SwitchBot Cloud API v1.1 に解錠コマンドを送信
6. 解錠結果をサーバーログに記録（成功/失敗ともに）

> **注意**: 解錠処理は非同期で実行されるため、入退室ログの作成やレスポンスには影響しません。解錠に失敗しても入室記録は正常に保存されます。

## トラブルシューティング

### 解錠されない

1. **環境変数の確認**: `SWITCHBOT_TOKEN`, `SWITCHBOT_SECRET`, `SWITCHBOT_LOCK_DEVICE_ID` がすべて設定されているか確認
2. **クラウドサービス**: SwitchBotアプリで Lock のクラウドサービスが有効か確認
3. **Hub接続**: SwitchBot Hub が正常にオンラインか確認
4. **ロール設定**: `SWITCHBOT_UNLOCK_ROLES` に対象ロールが含まれているか確認
5. **サーバーログ**: `[SwitchBot]` プレフィックスのログを確認

### APIエラーが出る

- `statusCode: 151` → 認証エラー。トークンまたはシークレットが不正
- `statusCode: 152` → デバイスIDが不正
- `statusCode: 160` → コマンド実行失敗。Hub との接続を確認
- `statusCode: 190` → デバイスの状態異常

### サーバーログの確認

Vercel の場合、Functions ログで `[SwitchBot]` を検索してください：

```
[SwitchBot] 解錠対象ロール "full_time" の入室を検知。解錠処理を開始します (山田太郎)
[SwitchBot] 解錠コマンドを送信中... (deviceId: ABCDEF123456)
[SwitchBot] 解錠成功
```

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `lib/switchbot.ts` | SwitchBot APIクライアント（認証、解錠/施錠コマンド） |
| `lib/env.ts` | 環境変数の管理（SwitchBot設定を含む） |
| `app/api/access-logs/route.ts` | 入退室API（SwitchBot解錠トリガー） |
