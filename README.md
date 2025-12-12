# My AI Coach - AI搭載タスク管理アプリ

Next.jsベースのタスク管理アプリケーション。AIを活用したスケジューリングとコーチング機能、LINE通知機能を備えた統合的なタスク管理システムです。

## 主な機能

### 1. タスク管理機能
- **タスクの登録**: タスク名、カテゴリ、説明、締切日、想定作業時間、優先度、進捗率などを登録
- **タスクの更新**: 登録済みタスクの情報を編集
- **タスクの削除**: 不要になったタスクを削除
- **タスク一覧表示**: 登録済みの全タスクを一覧表示
- **タスクの完了管理**: タスクを完了状態に変更

### 2. AIスケジューリング機能
- **自動スケジューリング**: タスクの優先度、締切、カテゴリ設定を考慮した最適なスケジュールを自動生成
- **カテゴリ別設定**: カテゴリごとに1日の上限時間を設定可能
- **進捗率を考慮**: タスクの進捗率に基づいて残り作業時間を自動計算
- **週末・祝日対応**: 平日と週末・祝日の作業時間を別途設定可能（日本の祝日を自動判定）

### 3. AIコーチング機能
- **日次タスク通知文生成**: 当日のスケジュールに基づいて、AIが励ましのメッセージを生成
- **LINE通知**: 生成したメッセージをLINEに自動送信

### 4. 認証機能
- **メールアドレス・パスワード認証**: Supabase Authを使用した安全な認証システム
- **セッション管理**: ログイン状態を自動的に管理

## プロジェクト構成

```
myaicoach-next/
├── app/                          # Next.jsアプリケーションのメインディレクトリ
│   ├── api/                      # APIルート（サーバー側の処理）
│   │   ├── auth/                 # 認証関連のAPI
│   │   │   └── [...nextauth]/    # NextAuth設定
│   │   ├── categories/            # カテゴリ管理API
│   │   ├── coach/                 # コーチングメッセージ生成API
│   │   ├── schedule/              # スケジューリングAPI
│   │   ├── tasks/                 # タスク管理API
│   │   └── user-settings/         # ユーザー設定API
│   ├── categories/                # カテゴリ設定ページ（内部実装）
│   ├── login/                     # ログインページ
│   ├── schedule/                  # スケジューリングページ
│   ├── setting/                   # 設定ページ（カテゴリ・全体設定）
│   ├── tasks/                     # タスク管理ページ
│   ├── layout.tsx                 # 全体レイアウト
│   ├── page.tsx                   # ホームページ
│   └── globals.css                # グローバルスタイル
├── components/                    # 再利用可能なコンポーネント
│   └── nav-bar.tsx                # ナビゲーションバー
├── lib/                           # ユーティリティ関数
│   ├── coach.ts                   # AIコーチングメッセージ生成
│   ├── holidays.ts                # 祝日判定
│   ├── line.ts                    # LINE通知送信
│   ├── prisma.ts                  # データベース接続
│   ├── scheduler.ts               # スケジューリングロジック
│   ├── supabase-client.ts         # Supabaseクライアント（ブラウザ用）
│   └── supabase-server.ts         # Supabaseサーバー（API用）
├── prisma/                        # データベーススキーマ
│   └── schema.prisma              # Prismaスキーマ定義
├── public/                        # 静的ファイル
├── .env                           # 環境変数ファイル（作成が必要）
├── .env.local                     # ローカル環境変数（作成が必要）
├── package.json                   # プロジェクトの依存関係とスクリプト
├── tsconfig.json                  # TypeScript設定
└── next.config.ts                 # Next.js設定
```

## セットアップ手順

### ステップ1: Node.jsのインストール確認

まず、Node.jsがインストールされているか確認します。

**macOS/Linuxの場合:**
ターミナルを開いて、以下のコマンドを実行してください：

```bash
node --version
npm --version
```

**Windowsの場合:**
コマンドプロンプトまたはPowerShellを開いて、以下のコマンドを実行してください：

```bash
node --version
npm --version
```

バージョン番号が表示されれば、Node.jsはインストールされています。

**Node.jsがインストールされていない場合:**
1. [Node.js公式サイト](https://nodejs.org/)にアクセス
2. 「LTS」と書かれたバージョンをダウンロード
3. ダウンロードしたファイルを実行してインストール
4. インストール後、ターミナル（コマンドプロンプト）を再起動
5. 再度 `node --version` を実行して確認

### ステップ2: プロジェクトディレクトリに移動

ターミナル（コマンドプロンプト）で、プロジェクトのディレクトリに移動します。

```bash
cd myaicoach-next
```

**注意**: `myaicoach-next` はプロジェクトのディレクトリ名です。実際のパスに合わせて変更してください。

### ステップ3: 依存パッケージのインストール

プロジェクトに必要なパッケージをインストールします。

```bash
npm install
```

このコマンドを実行すると、`package.json`に記載されているすべてのパッケージが自動的にインストールされます。完了まで数分かかる場合があります。

### ステップ4: Supabaseプロジェクトの作成と設定

このアプリケーションはSupabase（データベースサービス）を使用します。

#### 4.1 Supabaseアカウントの作成

1. [Supabase公式サイト](https://supabase.com/)にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ（またはメールアドレスで登録）

#### 4.2 新しいプロジェクトを作成

1. Supabaseダッシュボードで「New Project」をクリック
2. プロジェクト名を入力（例: `my-ai-coach`）
3. データベースのパスワードを設定（必ずメモしておいてください）
4. リージョンを選択（日本に近いリージョンを推奨）
5. 「Create new project」をクリック

プロジェクトの作成には数分かかります。

#### 4.3 データベース接続情報を取得

1. プロジェクトが作成されたら、左側のメニューから「Settings」→「API」をクリック
2. 以下の情報をコピーしてメモしておきます：
   - **Project URL**（例: `https://xxxxx.supabase.co`）
   - **anon public key**（`eyJ...`で始まる長い文字列）

#### 4.4 データベーススキーマの適用

ターミナルで以下のコマンドを実行して、データベースの構造を作成します：

```bash
npx prisma db push
```

このコマンドを実行すると、データベースに必要なテーブルが自動的に作成されます。

### ステップ5: 環境変数ファイルの作成

プロジェクトのルートディレクトリ（`myaicoach-next`）に、`.env.local`というファイルを作成します。

**macOS/Linuxの場合:**
```bash
touch .env.local
```

**Windowsの場合:**
```bash
type nul > .env.local
```

または、テキストエディタで新規ファイルを作成し、`.env.local`という名前で保存してください。

### ステップ6: 環境変数の設定

作成した`.env.local`ファイルをテキストエディタで開き、以下の内容を記入します：

```env
# Supabase設定
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"

# NextAuth設定
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[任意の長いランダムな文字列]"

# OpenAI API設定（AI機能を使用する場合）
OPENAI_API_KEY="sk-..."

# LINE Messaging API設定（LINE通知を使用する場合）
LINE_CHANNEL_ACCESS_TOKEN="[YOUR-LINE-CHANNEL-ACCESS-TOKEN]"
LINE_USER_ID="[YOUR-LINE-USER-ID]"
LINE_PUSH_ENDPOINT="https://api.line.me/v2/bot/message/push"
```

**各項目の説明:**

1. **DATABASE_URL**: 
   - `[YOUR-PASSWORD]`を、ステップ4.2で設定したデータベースのパスワードに置き換え
   - `[YOUR-PROJECT-REF]`を、Supabaseプロジェクトの参照IDに置き換え
   - Supabaseダッシュボードの「Settings」→「Database」→「Connection string」→「URI」から取得できます

2. **SUPABASE_URL**: 
   - `[YOUR-PROJECT-REF]`を、Supabaseプロジェクトの参照IDに置き換え
   - ステップ4.3でコピーしたProject URLを使用

3. **SUPABASE_ANON_KEY**: 
   - ステップ4.3でコピーしたanon public keyを使用

4. **SUPABASE_SERVICE_ROLE_KEY**: 
   - Supabaseダッシュボードの「Settings」→「API」→「service_role key」から取得（⚠️ 機密情報です）

5. **NEXTAUTH_SECRET**: 
   - 任意の長いランダムな文字列を設定
   - 以下のコマンドで生成できます：
   ```bash
   openssl rand -base64 32
   ```

6. **OPENAI_API_KEY**（オプション）: 
   - AI機能を使用する場合のみ必要
   - [OpenAI Platform](https://platform.openai.com/)でAPIキーを取得

7. **LINE_CHANNEL_ACCESS_TOKEN**（オプション）: 
   - LINE通知を使用する場合のみ必要
   - [LINE Developers](https://developers.line.biz/)でチャネルを作成して取得

8. **LINE_USER_ID**（オプション）: 
   - LINE通知を使用する場合のみ必要
   - LINE Developersで取得

**重要**: `.env.local`ファイルは機密情報を含むため、Gitにコミットしないでください。

### ステップ7: Prismaクライアントの生成

データベースにアクセスするためのコードを生成します：

```bash
npx prisma generate
```

このコマンドを実行すると、データベースにアクセスするためのコードが自動生成されます。

### ステップ8: 開発サーバーの起動

すべての設定が完了したら、開発サーバーを起動します：

```bash
npm run dev
```

このコマンドを実行すると、以下のようなメッセージが表示されます：

```
  ▲ Next.js 16.0.8
  - Local:        http://localhost:3000
  - ready started server on 0.0.0.0:3000
```

### ステップ9: ブラウザでアプリケーションを開く

ブラウザを開いて、以下のURLにアクセスします：

```
http://localhost:3000
```

アプリケーションが表示されれば、セットアップは完了です！

## 使用方法

### 初回ログイン

1. ブラウザで `http://localhost:3000` にアクセス
2. 「ログインページへ」をクリック
3. メールアドレスとパスワードを入力して「サインアップ」をクリック
4. Supabaseから確認メールが送信されます
5. メール内のリンクをクリックして認証を完了
6. 再度ログインページに戻り、「ログイン」をクリック

### タスクの登録

1. ナビゲーションメニューから「Tasks」をクリック
2. 「新規タスク」セクションで、タスク名を入力
3. 必要に応じて、カテゴリ、締切、見積時間、進捗、優先度、説明を入力
4. 「追加」ボタンをクリック

### タスクの編集・削除

1. 「Tasks」ページのタスク一覧から、編集したいタスクの「編集」ボタンをクリック
2. 情報を変更して「保存」をクリック
3. 削除する場合は「削除」ボタンをクリック

### カテゴリと設定の管理

1. ナビゲーションメニューから「Setting」をクリック
2. 「全体設定」で、平日と週末・祝日の1日あたりの稼働時間を設定
3. 「新規カテゴリ」で、カテゴリ名と1日あたりの上限時間を設定して「追加」
4. カテゴリ一覧から、既存のカテゴリを編集・削除

### スケジューリング

1. ナビゲーションメニューから「Schedule」をクリック
2. 「スケジューリングを実行」ボタンをクリック
3. タスクの優先度、締切、カテゴリ設定を考慮して、最適なスケジュールが自動生成されます
4. 生成されたスケジュールは日付ごとに表示されます

### LINE通知の送信

1. 「Schedule」ページで、スケジュールを生成
2. 「本日のタスクをLINE送信」セクションの「送信」ボタンをクリック
3. AIが生成したコーチングメッセージと当日のタスク一覧がLINEに送信されます

**注意**: LINE通知機能を使用するには、環境変数にLINEの設定が必要です。

## トラブルシューティング

### エラー: `npm: command not found`

**原因**: Node.jsがインストールされていない、またはパスが通っていない

**解決方法**:
1. Node.jsをインストール（ステップ1を参照）
2. ターミナル（コマンドプロンプト）を再起動

### エラー: `Cannot find module`

**原因**: 依存パッケージがインストールされていない

**解決方法**:
```bash
npm install
```

### エラー: `Prisma schema validation error`

**原因**: データベース接続情報が正しくない

**解決方法**:
1. `.env.local`ファイルの`DATABASE_URL`を確認
2. パスワードとプロジェクト参照IDが正しいか確認
3. `npx prisma db push`を再実行

### エラー: `Authentication failed`

**原因**: Supabaseの認証情報が正しくない

**解決方法**:
1. `.env.local`ファイルのSupabase関連の設定を確認
2. Supabaseダッシュボードで、プロジェクトが正しく作成されているか確認

### エラー: `Port 3000 is already in use`

**原因**: ポート3000が既に使用されている

**解決方法**:
1. 他のアプリケーションを終了
2. または、別のポートを使用：
   ```bash
   PORT=3001 npm run dev
   ```

### アプリケーションが起動しない

**確認事項**:
1. `.env.local`ファイルが正しく作成されているか
2. すべての環境変数が正しく設定されているか
3. `npm install`が正常に完了しているか
4. `npx prisma generate`が正常に完了しているか

## 技術スタック

- **フレームワーク**: Next.js 16.0.8
- **データベース**: Supabase (PostgreSQL)
- **認証**: NextAuth.js (Auth.js) + Supabase Adapter
- **ORM**: Prisma 7.1.0
- **スタイリング**: Tailwind CSS 4
- **AI機能**: OpenAI API (GPT-4o-mini)
- **通知**: LINE Messaging API
- **祝日判定**: japanese-holidays 1.0.10

## デプロイ

このアプリケーションはGitHubにアップロードしてVercelにデプロイできます。

### ステップ1: GitHubリポジトリへのアップロード

#### 1.1 リポジトリの初期化（まだの場合）

プロジェクトディレクトリで以下のコマンドを実行：

```bash
cd myaicoach-next
git init
git add .
git commit -m "Initial commit"
```

#### 1.2 GitHubリポジトリに接続

```bash
# 既存のリモートリポジトリに接続
git remote add origin https://github.com/[YOUR-USERNAME]/[YOUR-REPO-NAME].git

# または、SSHを使用する場合
# git remote add origin git@github.com:[YOUR-USERNAME]/[YOUR-REPO-NAME].git
```

#### 1.3 コードをプッシュ

```bash
git branch -M main
git push -u origin main
```

**重要**: `.env`ファイルは`.gitignore`に含まれているため、Gitにコミットされません。これは正しい動作です。

### ステップ2: Vercelへのデプロイ

#### 2.1 Vercelアカウントでログイン

1. [Vercel](https://vercel.com/)にアクセス
2. 「Sign Up」または「Log In」をクリック
3. GitHubアカウントでログイン（推奨）

#### 2.2 新しいプロジェクトを作成

1. Vercelダッシュボードで「Add New...」→「Project」をクリック
2. 「Import Git Repository」を選択
3. GitHubリポジトリを選択（表示されない場合は、GitHubアカウントとの連携を確認）
4. 「Import」をクリック

#### 2.3 プロジェクト設定

1. **Framework Preset**: Next.js（自動検出されるはず）
2. **Root Directory**: `./`（デフォルトのまま）
3. **Build Command**: `npm run build`（デフォルトのまま）
4. **Output Directory**: `.next`（デフォルトのまま）
5. **Install Command**: `npm install`（デフォルトのまま）

#### 2.4 環境変数の設定

「Environment Variables」セクションで、以下の環境変数を追加します：

**必須の環境変数:**
- `DATABASE_URL` - Supabaseのデータベース接続URL
- `SUPABASE_URL` - SupabaseプロジェクトのURL
- `SUPABASE_ANON_KEY` - Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY` - Supabaseのサービスロールキー（⚠️ 機密情報）
- `NEXT_PUBLIC_SUPABASE_URL` - ブラウザ用のSupabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ブラウザ用のSupabase匿名キー
- `NEXTAUTH_URL` - **本番環境のURL**（例: `https://your-app.vercel.app`）
- `NEXTAUTH_SECRET` - ランダムな秘密鍵

**オプションの環境変数:**
- `OPENAI_API_KEY` - AI機能を使用する場合
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE通知を使用する場合
- `LINE_USER_ID` - LINE通知を使用する場合
- `LINE_PUSH_ENDPOINT` - LINE通知を使用する場合（通常は `https://api.line.me/v2/bot/message/push`）

**環境変数の設定方法:**
1. 各環境変数の「Key」と「Value」を入力
2. 「Production」「Preview」「Development」のいずれかにチェック（通常はすべてにチェック）
3. 「Add」をクリック

**重要**: `NEXTAUTH_URL`は、デプロイ後にVercelが提供するURLに変更する必要があります。最初は仮のURLでデプロイし、デプロイ後に正しいURLに更新してください。

#### 2.5 デプロイの実行

1. すべての環境変数を設定したら、「Deploy」をクリック
2. デプロイが完了するまで待機（数分かかります）
3. デプロイが完了すると、URLが表示されます（例: `https://your-app.vercel.app`）

#### 2.6 デプロイ後の設定

1. **NEXTAUTH_URLの更新**:
   - Vercelダッシュボードで「Settings」→「Environment Variables」を開く
   - `NEXTAUTH_URL`を実際のVercel URLに更新（例: `https://your-app.vercel.app`）
   - 「Save」をクリック
   - 「Redeploy」をクリックして再デプロイ

2. **データベースのマイグレーション**:
   - ローカルで以下のコマンドを実行して、本番環境のデータベースにスキーマを適用：
   ```bash
   DATABASE_URL="[本番環境のDATABASE_URL]" npx prisma db push
   ```
   - または、Vercelのビルド時に自動的にマイグレーションを実行するように設定することもできます

3. **動作確認**:
   - デプロイされたURLにアクセス
   - ログイン機能が正常に動作するか確認
   - 各機能が正常に動作するか確認

### トラブルシューティング

#### デプロイが失敗する場合

1. **ビルドエラーの確認**:
   - Vercelダッシュボードの「Deployments」タブでエラーログを確認
   - ローカルで `npm run build` を実行して、ビルドエラーがないか確認

2. **環境変数の確認**:
   - すべての必須環境変数が設定されているか確認
   - 環境変数の値に余分なスペースや引用符がないか確認

3. **データベース接続エラー**:
   - `DATABASE_URL`が正しいか確認
   - Supabaseのデータベースが起動しているか確認
   - ファイアウォール設定を確認

#### 認証が動作しない場合

1. `NEXTAUTH_URL`が正しいURLに設定されているか確認
2. `NEXTAUTH_SECRET`が設定されているか確認
3. Supabaseの認証設定を確認

詳細は[Vercelのドキュメント](https://vercel.com/docs)を参照してください。

## セキュリティに関する注意事項

### 環境変数の管理

- **`.env`、`.env.local`、`.env.bak`ファイルは絶対にGitにコミットしないでください**
  - `.gitignore`に`.env*`が含まれているため、通常は自動的に除外されます
  - 念のため、コミット前に `git status` で確認してください
- **`.env.example`はコミットしても問題ありません**（実際の値は含まれていません）
- 環境変数には機密情報（APIキー、データベースパスワードなど）が含まれます

### 本番環境での注意点

- **Vercelでは環境変数を必ず設定してください**
  - Vercelダッシュボードの「Settings」→「Environment Variables」で設定
  - ローカルの`.env`ファイルの内容をコピー＆ペースト
- **`NEXTAUTH_URL`は本番環境のURLに変更してください**
  - ローカル: `http://localhost:3000`
  - 本番: `https://your-app.vercel.app`
- **Supabaseの`SERVICE_ROLE_KEY`は特に機密情報です**
  - 絶対に公開しないでください
  - GitHubにコミットしないでください
  - Vercelの環境変数としてのみ使用してください

### コミット前の確認事項

GitHubにプッシュする前に、以下のコマンドで機密情報が含まれていないか確認してください：

```bash
# コミットされるファイルを確認
git status

# .envファイルが含まれていないか確認
git ls-files | grep -E "\.env$|\.env\.local$|\.env\.bak$"

# もし.envファイルが表示された場合は、.gitignoreを確認してください
```

### 万が一、機密情報をコミットしてしまった場合

1. **すぐにGitHubのリポジトリから削除**:
   - GitHubのリポジトリ設定で、該当ファイルを削除
   - または、新しいコミットでファイルを削除

2. **機密情報を変更**:
   - すべてのAPIキー、パスワード、トークンを再生成
   - Vercelの環境変数も更新

3. **Git履歴のクリーンアップ**（上級者向け）:
   - `git filter-branch`や`git filter-repo`を使用して履歴から削除
   - または、新しいリポジトリを作成して移行

## ライセンス

このプロジェクトは個人学習用です。
