# NFC入退室管理ツール 管理者向けマニュアル（利用者向け）

## 1. このマニュアルの対象
このマニュアルは、開発作業をしない管理者の方向けです。  
日々の運用で必要な操作だけをまとめています。

## 2. 最初に確認すること
- ログインURL: `https://nfctoukalab.vercel.app/admin/login`
- 管理者アカウント（メールアドレス / パスワード）があること
- 入口用・出口用のAndroid端末（Chrome）があること
- 生徒に配るNFCカードがあること

アカウントがない場合は、導入担当者に作成を依頼してください。

## 3. ログイン手順
1. `https://nfctoukalab.vercel.app/admin/login` を開く
2. メールアドレスとパスワードを入力
3. 「ログイン」を押す
4. ログイン後、管理画面（クイックリンク）を開く

## 画面イメージ（参考）

### 管理者ログイン画面
![管理者ログイン画面](assets/manual-screens/01-admin-login.png)

### 入口キオスク画面
![入口キオスク画面](assets/manual-screens/02-kiosk-entry.png)

### 出口キオスク画面
![出口キオスク画面](assets/manual-screens/03-kiosk-exit.png)

補足: 管理画面（ユーザー一覧・ポイント管理など）はログイン後に表示されるため、必要に応じて同フォルダへ追加撮影した画像を追記してください。
## 4. どの画面で何をするか（全体像）
| 目的 | 使う画面 | URL |
|---|---|---|
| 生徒・職員の登録/編集 | ユーザー一覧 | `https://nfctoukalab.vercel.app/admin/students` |
| 親御さん情報とLINE連携 | 親御さん管理 | `https://nfctoukalab.vercel.app/admin/parents` |
| 入退室履歴の確認 | 入退室ログ | `https://nfctoukalab.vercel.app/admin/access-logs` |
| ポイント設定と付与 | ポイント管理 | `https://nfctoukalab.vercel.app/admin/points` |
| 開放時間や通知文の設定 | 設定 | `https://nfctoukalab.vercel.app/admin/settings` |
| 管理者の追加/編集 | 管理ユーザー管理 | `https://nfctoukalab.vercel.app/admin/admins` |
| 主要ページをまとめて開く | クイックリンク | `https://nfctoukalab.vercel.app/admin/links` |

## 5. 初回運用で最初にやること

### 5-1. 利用可能時間を設定する
1. `https://nfctoukalab.vercel.app/admin/settings` を開く
2. 「利用可能時間設定」で以下を設定
   - 生徒
   - アルバイト
   - 正社員
3. 必要なユーザーのみ「個別設定」で時間を上書き
4. 変更後は各ダイアログで「保存」

### 5-2. ポイントの基本設定をする（必要な場合）
1. `https://nfctoukalab.vercel.app/admin/points` を開く
2. 「ポイント設定」で以下を設定
   - 入室ポイント付与量
   - 1日1回制限（ON/OFF）
3. 「設定を保存」を押す

### 5-3. クラス別ボーナスを設定する（必要な場合）
1. 同じく `https://nfctoukalab.vercel.app/admin/points` を開く
2. 「ポイントボーナス設定」でクラスごとに「設定」を押す
3. 回数・ボーナスポイントを入力して保存
4. 最後にセクション下の「設定を保存」を押す

## 6. ユーザー登録とカード登録

### 6-1. ユーザーを追加する
1. `https://nfctoukalab.vercel.app/admin/students` を開く
2. 「ユーザー追加」を押す
3. 最低限入力する項目
   - ユーザー名
   - 属性（生徒 / アルバイト / 正社員）
   - ステータス（通常は在籍）
4. 「追加」を押す

### 6-2. カードを登録する
1. 対象ユーザーの行でカードアイコンを押す
2. カード登録ダイアログで方法を選ぶ
   - NFCで読み取り
   - 手動で入力
3. 完了後、「カード登録」が「登録済み」になっていることを確認

補足: Suicaなどは手動入力が必要になる場合があります。

### 6-3. CSVでまとめて登録する
1. `https://nfctoukalab.vercel.app/admin/students`
2. 「CSVで一括登録」を押す
3. 「テンプレートCSVをダウンロード」
4. 必須列を埋めてアップロード
5. 結果（成功件数/失敗件数）を確認

## 7. 親御さん管理とLINE通知設定

### 7-1. 親御さんを登録する
1. `https://nfctoukalab.vercel.app/admin/parents` を開く
2. 「親御さんを追加」を押す
3. 名前、連絡先、続柄を入力
4. 該当する生徒にチェックを付けて「追加」

### 7-2. LINEアカウントを紐付ける
1. 親御さん一覧の対象行で吹き出しアイコンを押す
2. LINE User IDを入力
3. 「紐付け」を押す
4. 一覧で「連携済み」と表示されることを確認

## 8. キオスク端末（入口/出口）の設置

### 8-1. 開くURL
- 入口: `https://nfctoukalab.vercel.app/kiosk/entry`
- 出口: `https://nfctoukalab.vercel.app/kiosk/exit`

### 8-2. 設置手順
1. Android端末でChromeを開く
2. 上記URLにアクセス
3. ホーム画面に追加（ショートカット作成）
4. NFCをONにする
5. テストカードで「カードをタッチ」を実行
6. 管理画面ログで反映を確認

## 9. 毎日の運用手順（おすすめ）
1. 開始前に入口・出口キオスクで1回ずつテスト
2. `入退室ログ` で記録されているか確認
3. 必要に応じてログ訂正
4. 週1回、ポイントバックアップを作成
   - `https://nfctoukalab.vercel.app/admin/points/backup`

## 10. よくある質問（利用者向け）

### Q1. カードをタッチしても入室できない
- ユーザーが「在籍」か確認
- カード登録が「登録済み」か確認
- 端末のNFCがONか確認

### Q2. 親御さんにLINE通知が届かない
- 親御さんと生徒の紐付けがあるか確認
- LINE連携が「連携済み」か確認

### Q3. 間違えてユーザー情報を消しそう
- 原則、削除よりも「ステータス変更」を優先
- 卒業/退会は削除ではなくステータスで管理

## 11. 主要URLまとめ
- ログイン: `https://nfctoukalab.vercel.app/admin/login`
- クイックリンク: `https://nfctoukalab.vercel.app/admin/links`
- ユーザー一覧: `https://nfctoukalab.vercel.app/admin/students`
- 親御さん管理: `https://nfctoukalab.vercel.app/admin/parents`
- 入退室ログ: `https://nfctoukalab.vercel.app/admin/access-logs`
- ポイント管理: `https://nfctoukalab.vercel.app/admin/points`
- 設定: `https://nfctoukalab.vercel.app/admin/settings`
- 入口キオスク: `https://nfctoukalab.vercel.app/kiosk/entry`
- 出口キオスク: `https://nfctoukalab.vercel.app/kiosk/exit`

## 12. 更新履歴
- 2026-02-15: 利用者（非開発者）向けに全面改訂、固定URLを反映

