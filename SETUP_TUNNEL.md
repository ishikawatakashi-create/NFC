# 🚀 トンネル設定ガイド（Windows）

## 問題の原因

1. **プロジェクトディレクトリにいない**: `C:\Users\snksg` にいますが、プロジェクトは `C:\Users\snksg\Desktop\NFCカード開発\NFC` にあります
2. **ngrokがインストールされていない**: `npx ngrok` が動作しない

## ✅ 解決方法

### 方法1: localtunnelを使用（最も簡単・推奨）

localtunnelはnpm経由で簡単に使用できます。

#### 手順

1. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   ```

2. **localtunnelでトンネルを作成**
   ```powershell
   npm run tunnel:lt
   ```
   
   または直接実行:
   ```powershell
   npx localtunnel --port 3001
   ```

3. **表示されたURLを確認**
   ```
   your url is: https://xxxx-xxx-xxx-xxx.loca.lt
   ```

4. **Android端末でアクセス**
   - `https://xxxx-xxx-xxx-xxx.loca.lt/kiosk/entry`
   - `https://xxxx-xxx-xxx-xxx.loca.lt/admin/students`

### 方法2: ngrokを直接ダウンロード

#### 手順

1. **ngrokをダウンロード**
   - https://ngrok.com/download にアクセス
   - 「Windows」を選択してダウンロード
   - ZIPファイルを解凍

2. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   ```

3. **ngrok.exeをプロジェクトフォルダに配置**
   - 解凍した `ngrok.exe` をプロジェクトフォルダにコピー
   - または、任意の場所に配置してフルパスで実行

4. **ngrokを起動**
   ```powershell
   # プロジェクトフォルダに配置した場合
   .\ngrok.exe http 3001
   
   # または、フルパスで実行
   C:\path\to\ngrok.exe http 3001
   ```

### 方法3: Chocolateyでngrokをインストール

#### 手順

1. **管理者権限でPowerShellを起動**
   - スタートメニューで「PowerShell」を検索
   - 右クリック → 「管理者として実行」

2. **Chocolateyをインストール**
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
   ```

3. **ngrokをインストール**
   ```powershell
   choco install ngrok
   ```

4. **プロジェクトディレクトリに移動して実行**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   ngrok http 3001
   ```

## 🎯 推奨: localtunnelを使用

**理由:**
- ✅ インストール不要（npxで実行可能）
- ✅ セットアップが簡単
- ✅ HTTPS自動対応
- ✅ 無料

**使い方:**
```powershell
# 1. プロジェクトディレクトリに移動
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"

# 2. localtunnelでトンネルを作成
npm run tunnel:lt
```

## 📝 注意事項

### Web NFCの要件

- ✅ **HTTPS必須**: HTTPでは動作しません
- ✅ **Android Chrome必須**: iOSや他のブラウザでは動作しません
- ✅ **NFC有効化**: Android端末でNFCを有効にする必要があります

### 初回アクセス時の警告（localtunnel）

localtunnelの無料版では、初回アクセス時に警告ページが表示され、パスワードを要求される場合があります。

#### 解決方法

1. **警告ページで「Continue」ボタンをクリック**
   - 画面に表示される「Continue」や「Visit Site」ボタンをクリック

2. **パスワードを入力（必要な場合）**
   - パスワードは**パブリックIPアドレス**です
   - パブリックIPアドレスを確認する方法:
     ```powershell
     # PowerShellで実行
     (Invoke-WebRequest -Uri "https://api.ipify.org").Content
     ```
   - または、ブラウザで https://api.ipify.org にアクセス
   - 表示されたIPアドレスをパスワードとして入力

3. **一度パスワードを入力すると、しばらくは再入力不要**
   - 同じセッション内では、パスワードを再入力する必要はありません

#### 警告ページを回避する方法

localtunnelの警告ページを回避したい場合は、ngrokなどの別のツールを使用してください。

## 🔍 トラブルシューティング

### プロジェクトディレクトリが見つからない

```powershell
# 現在のディレクトリを確認
pwd

# プロジェクトディレクトリに移動
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"

# 確認
ls
```

### 開発サーバーが起動していない

```powershell
# プロジェクトディレクトリで実行
npm run dev
```

### ポート3001が使用中

```powershell
# ポート3001を使用しているプロセスを確認
netstat -ano | findstr :3001

# プロセスを終了するか、別のポートを使用
```

