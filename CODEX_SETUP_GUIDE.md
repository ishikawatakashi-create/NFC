# Codex CLI リポジトリ紐づけ問題の解決方法

## 現在の状況

- 現在のGitリポジトリ: `https://github.com/ishikawatakashi-create/NFC.git`（会社のリポジトリ）
- Codex CLIは、現在のGitリポジトリの情報を自動的に読み取るため、会社のリポジトリに紐づいているのは正常な動作です

## 問題の原因

Codex CLIは、現在のディレクトリのGitリポジトリ情報を基にプロジェクトを識別します。そのため、会社のリポジトリで作業している場合、自動的に会社のリポジトリに紐づきます。

## 解決方法

### 方法1: 認証情報をリセットして再ログイン（推奨）

1. **現在の認証情報をクリア**
   ```powershell
   codex logout
   ```

2. **ご自身のアカウントで再ログイン**
   ```powershell
   codex login
   ```
   - ブラウザが開き、OpenAIの認証ページが表示されます
   - **ご自身の個人アカウント**でログインしてください

3. **認証状態を確認**
   ```powershell
   codex login status
   ```

### 方法2: 設定ファイルでワークスペースを明示的に指定

1. **設定ファイルを作成**
   ```powershell
   # 設定ディレクトリが存在しない場合は作成
   New-Item -ItemType Directory -Path "$env:USERPROFILE\.codex" -Force
   ```

2. **設定ファイルを編集**
   `%USERPROFILE%\.codex\config.toml` を作成し、以下の内容を記述：

   ```toml
   # 承認ポリシー（安全設定）
   approval_policy = "on-request"
   
   # サンドボックスモード（ワークスペース内のみ書き込み可能）
   sandbox_mode = "workspace-write"
   
   # シェル環境変数の制限
   [shell_environment_policy]
   include_only = ["PATH", "HOME"]
   ```

   **注意**: Codex CLIの設定ファイルには、リポジトリURLを直接指定するオプションはありません。Codex CLIは常に現在のGitリポジトリを自動検出します。

### 方法3: 個人プロジェクトで作業する場合

個人のリポジトリで作業する場合は、そのディレクトリに移動してからCodex CLIを実行してください：

```powershell
# 個人プロジェクトのディレクトリに移動
cd C:\path\to\your\personal\project

# Codex CLIを実行
codex "explain this codebase"
```

## 重要なポイント

- **Codex CLIは現在のGitリポジトリを自動検出します**
- 会社のリポジトリで作業している場合、自動的に会社のリポジトリに紐づくのは正常です
- 問題は「どのアカウントで認証しているか」です
- 個人アカウントで認証していれば、会社のリポジトリでも個人アカウントとして動作します

## 確認方法

認証が正しく行われているか確認するには：

```powershell
# 認証状態を確認
codex login status

# Codex CLIを実行して、どのアカウントで動作しているか確認
codex "who am I?"
```

## トラブルシューティング

### 認証がうまくいかない場合

1. **設定ディレクトリを完全に削除**
   ```powershell
   Remove-Item -Recurse -Force "$env:USERPROFILE\.codex"
   ```

2. **再ログイン**
   ```powershell
   codex login
   ```

### 会社のリポジトリに紐づいているのが問題の場合

Codex CLIは、現在のGitリポジトリを自動検出するため、これを変更することはできません。ただし、認証は個人アカウントで行うことで、個人アカウントとして動作させることができます。



