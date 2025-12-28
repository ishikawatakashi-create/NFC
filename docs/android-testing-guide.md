# Android端末での動作確認ガイド

## 📱 概要

Vercelでのデプロイがうまくいかない場合、ローカル環境からAndroid端末で動作確認する方法を説明します。

**重要**: Web NFC APIはHTTPS環境でのみ動作します。HTTPでは動作しません。

---

## 🚀 方法1: ngrokを使用（推奨・最も簡単）

### メリット
- ✅ 無料で使用可能
- ✅ セットアップが簡単（数分で完了）
- ✅ HTTPS自動対応
- ✅ 外部からアクセス可能（同じWi-Fiネットワーク内でなくてもOK）

### デメリット
- ⚠️ 無料版はURLが毎回変わる
- ⚠️ セッション時間制限あり（無料版は2時間）

### 手順

#### 1. ngrokをインストール

**Windows (PowerShell):**
```powershell
# Chocolateyを使用する場合
choco install ngrok

# または、直接ダウンロード
# https://ngrok.com/download からダウンロード
```

**または、npxで直接実行（インストール不要）:**
```bash
npx ngrok http 3001
```

#### 2. 開発サーバーを起動

```bash
npm run dev
```

開発サーバーが `http://localhost:3001` で起動します。

#### 3. ngrokでトンネルを作成

**別のターミナル/PowerShellを開いて:**
```bash
npx ngrok http 3001
```

または、ngrokをインストール済みの場合:
```bash
ngrok http 3001
```

#### 4. ngrokのURLを確認

ngrokを起動すると、以下のような出力が表示されます:

```
Forwarding    https://xxxx-xxx-xxx-xxx.ngrok-free.app -> http://localhost:3001
```

この `https://xxxx-xxx-xxx-xxx.ngrok-free.app` がAndroid端末でアクセスするURLです。

#### 5. Android端末でアクセス

1. Android端末でChromeブラウザを開く
2. 上記のngrok URLにアクセス
   - 例: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/kiosk/entry`
   - 例: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/admin/students`
3. NFC機能をテスト

---

## 🌐 方法2: ローカルIPアドレス + mkcert（HTTPS証明書）

### メリット
- ✅ URLが固定（ローカルIPアドレス）
- ✅ 無料
- ✅ セッション時間制限なし

### デメリット
- ⚠️ セットアップがやや複雑
- ⚠️ 同じWi-Fiネットワーク内の端末のみアクセス可能
- ⚠️ 証明書のインストールが必要

### 手順

#### 1. mkcertをインストール

**Windows:**
```powershell
# Chocolateyを使用
choco install mkcert

# または、直接ダウンロード
# https://github.com/FiloSottile/mkcert/releases
```

#### 2. ローカルCAをインストール

```bash
mkcert -install
```

#### 3. 証明書を生成

```bash
# ローカルIPアドレスを確認
ipconfig

# 例: 192.168.1.100 の場合
mkcert 192.168.1.100 localhost 127.0.0.1
```

#### 4. Next.jsをHTTPSで起動

`package.json` にスクリプトを追加するか、以下のコマンドで起動:

```bash
# 証明書ファイル名を指定して起動
# (証明書ファイル名はmkcertの出力に従う)
```

**注意**: Next.jsのデフォルトではHTTPS対応していないため、カスタムサーバーが必要です。

---

## 🔧 方法3: 他の無料ホスティングサービス

### Netlify

**メリット:**
- ✅ 無料プランあり
- ✅ HTTPS自動対応
- ✅ デプロイが簡単

**手順:**
1. Netlifyアカウントを作成
2. GitHubリポジトリを連携
3. 自動デプロイ設定
4. デプロイされたURLでアクセス

### Railway

**メリット:**
- ✅ 無料トライアルあり
- ✅ HTTPS自動対応
- ✅ 環境変数の設定が簡単

**手順:**
1. Railwayアカウントを作成
2. GitHubリポジトリを連携
3. 環境変数を設定
4. デプロイ

### Render

**メリット:**
- ✅ 無料プランあり
- ✅ HTTPS自動対応

---

## 📋 方法4: ローカルネットワーク経由（HTTP、NFC非対応）

**注意**: この方法ではNFC機能は動作しません（HTTPS必須のため）

### 手順

1. 開発サーバーを起動:
```bash
npm run dev
```

2. ローカルIPアドレスを確認:
```powershell
ipconfig
# IPv4アドレスを確認（例: 192.168.1.100）
```

3. Next.jsを0.0.0.0でバインド（`package.json`を修正）:
```json
{
  "scripts": {
    "dev": "next dev -p 3001 -H 0.0.0.0"
  }
}
```

4. Android端末でアクセス:
```
http://192.168.1.100:3001/kiosk/entry
```

**制限**: NFC機能は動作しませんが、UIの確認などは可能です。

---

## 🎯 推奨方法

**最も簡単で確実な方法**: **ngrokを使用**

理由:
1. セットアップが最も簡単
2. HTTPS自動対応
3. 外部からアクセス可能
4. 無料で使用可能

---

## ⚠️ 注意事項

### Web NFCの要件

1. **HTTPS必須**: HTTP環境ではNFC機能は動作しません
2. **Android Chrome必須**: iOSや他のブラウザでは動作しません
3. **NFC有効化**: Android端末でNFCを有効にする必要があります

### セキュリティ

- ngrokの無料版は、初回アクセス時に警告ページが表示されます
- 本番環境では適切な認証を設定してください

---

## 🔍 トラブルシューティング

### ngrokが起動しない

**エラー**: `port 3001 is already in use`

**解決策**:
```bash
# ポート3001を使用しているプロセスを確認
netstat -ano | findstr :3001

# プロセスを終了するか、別のポートを使用
npm run dev -- -p 3002
ngrok http 3002
```

### Android端末でアクセスできない

1. **同じネットワークに接続されているか確認**
   - ngrokを使用している場合は不要
   - ローカルIPを使用している場合は必要

2. **ファイアウォールの設定を確認**
   - Windowsファイアウォールでポート3001を許可

3. **URLが正しいか確認**
   - `http://` ではなく `https://` を使用（ngrokの場合）
   - ポート番号が正しいか確認

### NFCが動作しない

1. **HTTPS環境か確認**
   - ブラウザのアドレスバーに鍵マークが表示されているか

2. **Android Chromeを使用しているか確認**
   - Chrome以外のブラウザでは動作しません

3. **NFCが有効になっているか確認**
   - 設定 → 接続済みのデバイス → NFC → オン

---

## 📝 クイックスタート（ngrok）

```bash
# ターミナル1: 開発サーバー起動
npm run dev

# ターミナル2: ngrok起動
npx ngrok http 3001

# Android端末で表示されたURLにアクセス
# 例: https://xxxx-xxx-xxx-xxx.ngrok-free.app/kiosk/entry
```

