# ngrok設定ファイルの修正スクリプト

# 設定ファイルのパス
$configPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"

# ディレクトリが存在しない場合は作成
$configDir = Split-Path $configPath
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "設定ディレクトリを作成しました: $configDir"
}

# 設定ファイルが存在する場合
if (Test-Path $configPath) {
    Write-Host "設定ファイルを確認中: $configPath"
    
    # バックアップを作成
    $backupPath = "$configPath.backup"
    Copy-Item $configPath $backupPath -Force
    Write-Host "バックアップを作成しました: $backupPath"
    
    # 設定ファイルの内容を読み込む
    $content = Get-Content $configPath
    
    # update_channelの不正な値を修正
    $fixedContent = $content | ForEach-Object {
        if ($_ -match "update_channel:\s*''") {
            "update_channel: stable"
        } elseif ($_ -match "update_channel:\s*$") {
            "update_channel: stable"
        } else {
            $_
        }
    }
    
    # 修正した内容を保存
    $fixedContent | Set-Content $configPath -Encoding UTF8
    Write-Host "設定ファイルを修正しました"
    
    # 内容を表示
    Write-Host "`n修正後の設定ファイル:"
    Get-Content $configPath
} else {
    Write-Host "設定ファイルが存在しません。新規作成します。"
    Write-Host "authtokenを設定してください:"
    Write-Host "  ngrok config add-authtoken <YOUR_AUTHTOKEN>"
}

Write-Host "`n設定を確認中..."
ngrok config check

