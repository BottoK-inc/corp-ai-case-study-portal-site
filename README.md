# BottoK AI活用事例ライブラリ

社内の生成AI活用事例を一覧表示するWebサイト。  
Notionのデータベースを正本として、毎日自動でサイトを更新します。

## アーキテクチャ

```
Notion DB（正本）
  ↓（毎日 or 手動トリガー）
GitHub Actions
  ↓ scripts/fetch_notion.js
  data/cases.json
  ↓ scripts/build.js
  index.html
  ↓
GitHub Pages（公開URL）
```

## セットアップ手順

### 1. このリポジトリをGitHubに作成

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-cases-site.git
git push -u origin main
```

### 2. Notion Integrationのトークンを取得

1. https://www.notion.so/my-integrations にアクセス
2. 「新しいインテグレーション」を作成
3. 「内部インテグレーショントークン」をコピー
4. NotionのAI活用事例DB → 右上「...」→「接続」→ 作成したインテグレーションを追加

### 3. GitHub Secretsに登録

リポジトリの `Settings → Secrets and variables → Actions` で以下を追加：

| Name | Value |
|------|-------|
| `NOTION_TOKEN` | Notionのインテグレーショントークン（`secret_...`） |
| `NOTION_DB_ID` | `3e4668ffa71e4d6d9bcc3f356588dbc3` |

### 4. GitHub Pagesを有効化

リポジトリの `Settings → Pages` で：
- Source: `GitHub Actions` を選択

### 5. 初回デプロイ

`Actions` タブ → `Build & Deploy AI Cases Site` → `Run workflow` で手動実行。

完了すると `https://YOUR_USERNAME.github.io/ai-cases-site/` でアクセスできます。

## 自動更新

- **毎日 AM 7:00（JST）** に自動でNotionからデータを取得してサイトを更新
- Notionを更新したらすぐ反映したい場合は `Actions → Run workflow` で手動実行

## ローカルでのビルド確認

```bash
NOTION_TOKEN=your_token NOTION_DB_ID=3e4668ffa71e4d6d9bcc3f356588dbc3 node scripts/fetch_notion.js
node scripts/build.js
open index.html
```

## 事例の投稿・更新

Claudeのチャットで操作できます：

- 「事例を投稿したい」→ Claudeがヒアリングして自動登録
- 「スライドを作って」→ PPTXを生成→DriveにアップしてURLを渡す→Notionに登録
- 「サイトを更新して」→ GitHub ActionsのRun workflowを手動実行、またはActions APIで自動実行
