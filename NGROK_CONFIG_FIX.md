# 🔧 ngrok設定ファイルの修正方法

## 問題

ngrokの設定ファイルで `update_channel` の値が不正です。

```
ERROR: Invalid configuration property value for 'update_channel', '': Unrecognized channel. Acceptable values are 'stable', 'beta', or 'unstable'
```

## ✅ 解決方法

### 方法1: 設定ファイルを直接編集（推奨）

1. **設定ファイルの場所を確認**
   - Windows: `%USERPROFILE%\.ngrok2\ngrok.yml`
   - または: `C:\Users\<ユーザー名>\.ngrok2\ngrok.yml`

2. **設定ファイルを開く**
   - メモ帳やエディタで開く

3. **`update_channel` の値を修正**
   - 空文字列 `''` を `stable` に変更
   - または、該当行を削除

**修正前:**
```yaml
update_channel: ''
```

**修正後:**
```yaml
update_channel: stable
```

または、該当行を削除（デフォルト値が使用されます）

4. **設定ファイルを保存**

5. **設定を確認**
   ```powershell
   ngrok config check
   ```

### 方法2: PowerShellで設定ファイルを修正

```powershell
# 設定ファイルのパスを確認
$configPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"

# 設定ファイルの内容を確認
Get-Content $configPath

# 空のupdate_channelをstableに置き換え
(Get-Content $configPath) -replace "update_channel: ''", "update_channel: stable" | Set-Content $configPath

# または、該当行を削除
(Get-Content $configPath) | Where-Object { $_ -notmatch "update_channel: ''" } | Set-Content $configPath
```

### 方法3: 設定ファイルを再作成

1. **既存の設定ファイルをバックアップ**
   ```powershell
   Copy-Item "$env:USERPROFILE\.ngrok2\ngrok.yml" "$env:USERPROFILE\.ngrok2\ngrok.yml.backup"
   ```

2. **設定ファイルを削除**
   ```powershell
   Remove-Item "$env:USERPROFILE\.ngrok2\ngrok.yml"
   ```

3. **authtokenを再設定**
   ```powershell
   ngrok config add-authtoken <YOUR_AUTHTOKEN>
   ```

## 📝 正しい設定ファイルの例

```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE
update_channel: stable
```

または、`update_channel` 行を省略（デフォルトで `stable` が使用されます）:

```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE
```

## 🔍 トラブルシューティング

### 設定ファイルが見つからない

```powershell
# 設定ファイルの場所を確認
$configPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"
Test-Path $configPath

# ディレクトリが存在しない場合は作成
if (-not (Test-Path "$env:USERPROFILE\.ngrok2")) {
    New-Item -ItemType Directory -Path "$env:USERPROFILE\.ngrok2"
}
```

### 設定ファイルの権限エラー

- 管理者権限でPowerShellを実行
- または、ファイルのプロパティで読み取り専用を解除

### それでも解決しない場合

1. **ngrokを再インストール**
2. **authtokenを再設定**
3. **設定ファイルを再作成**

## 🎯 修正後の確認

設定ファイルを修正したら、以下を実行して確認:

```powershell
# 設定を確認
ngrok config check

# 正常な場合、エラーは表示されません
# その後、トンネルを作成
ngrok http 3001
```




