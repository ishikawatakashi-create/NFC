# ngrok セットアップガイド（Windows）

## 問題

`npx ngrok` が動作しない場合、ngrokを直接インストールする必要があります。

## 方法1: ngrokを直接ダウンロード（推奨）

### 手順

1. **ngrokをダウンロード**
   - https://ngrok.com/download にアクセス
   - 「Windows」を選択してダウンロード
   - ZIPファイルを解凍

2. **ngrokを配置**
   - 解凍した `ngrok.exe` を任意の場所に配置
   - 例: `C:\tools\ngrok\ngrok.exe`
   - または、プロジェクトフォルダに配置: `C:\Users\snksg\Desktop\NFCカード開発\NFC\ngrok.exe`

3. **パスを通す（オプション）**
   - システム環境変数のPATHにngrokのフォルダを追加
   - または、フルパスで実行

4. **実行**
   ```powershell
   # フルパスで実行する場合
   C:\tools\ngrok\ngrok.exe http 3001
   
   # または、プロジェクトフォルダに配置した場合
   .\ngrok.exe http 3001
   ```

## 方法2: Scoopを使用（Scoopがインストールされている場合）

```powershell
scoop install ngrok
```

## 方法3: 代替ツールを使用

### Cloudflare Tunnel（無料、URL固定可能）

```powershell
# Cloudflare Tunnelをインストール
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

### localtunnel（npm経由で簡単）

```powershell
# プロジェクトディレクトリで実行
npm install -g localtunnel

# 使用
lt --port 3001
```

### serveo（SSH経由、インストール不要）

```powershell
# SSHがインストールされている場合
ssh -R 80:localhost:3001 serveo.net
```

## 方法4: プロジェクトディレクトリでnpxを再試行

プロジェクトディレクトリに移動してから実行：

```powershell
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
npx ngrok http 3001
```

もしこれでも動作しない場合は、ngrokを直接ダウンロードしてください。


