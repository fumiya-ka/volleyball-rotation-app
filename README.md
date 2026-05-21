# バレーボール3D - Vite + R3F セットアップ手順

## 前提条件

- Node.js 20以上がインストール済み (`node --version` で確認)
- npm または pnpm が使えること
- GitHubアカウント
- Vercelアカウント(GitHubで連携可能)

## 1. プロジェクト作成

ターミナルで好きなディレクトリに移動して:

```bash
# Viteプロジェクト作成(React + TypeScript)
npm create vite@latest volleyball-3d -- --template react-ts
cd volleyball-3d

# 依存関係インストール
npm install

# Three.js + R3F関連
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm install -D @types/three

# UI + 状態管理
npm install zustand
npm install tailwindcss@next @tailwindcss/vite@next
npm install motion
npm install lucide-react
```

## 2. プロジェクトファイルの差し替え

このフォルダに含まれているファイルを、上で作成した `volleyball-3d` プロジェクトに上書き/追加してください:

```
volleyball-3d/
├ index.html                ← 上書き
├ vite.config.ts            ← 上書き  
├ tsconfig.json             ← 上書き
├ package.json              ← 参考(必要なdepsの確認用)
├ src/
│  ├ App.tsx                ← 上書き
│  ├ main.tsx               ← 上書き
│  ├ index.css              ← 上書き
│  ├ vite-env.d.ts          (既存のまま)
│  ├ scene/
│  │  ├ Scene.tsx           ← 新規
│  │  ├ Court.tsx           ← 新規
│  │  ├ Net.tsx             ← 新規
│  │  ├ Player.tsx          ← 新規
│  │  └ Ball.tsx            ← 新規
│  ├ components/
│  │  ├ TopBar.tsx          ← 新規
│  │  ├ PhaseTabs.tsx       ← 新規
│  │  └ Telop.tsx           ← 新規
│  ├ store/
│  │  └ sceneStore.ts       ← 新規
│  └ data/
│     ├ rotations.ts        ← 新規
│     └ players.ts          ← 新規
```

## 3. ローカル起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いて動作確認。コートと選手6人、ボールが表示されればOK。

## 4. GitHubにpush

```bash
# Gitリポジトリ初期化(まだの場合)
git init
git add -A
git commit -m "Initial volleyball 3D app with R3F"

# GitHubで新規リポジトリ作成後、リモートに紐付け
git remote add origin https://github.com/<your-username>/volleyball-3d.git
git branch -M main
git push -u origin main
```

## 5. Vercelデプロイ

1. https://vercel.com/new にアクセス
2. 「Import Git Repository」でさっき作ったGitHubリポジトリを選択
3. Frameworkは「Vite」が自動検出される
4. 「Deploy」ボタンを押す
5. 30秒〜1分で `volleyball-3d-xxx.vercel.app` のようなURLが発行される

そのURLをスマホでブックマークしておけば、以降は `git push` するだけで自動更新されます。

## 6. 修正→確認サイクル

```bash
# 修正後
git add -A
git commit -m "Adjust player positions"
git push

# Vercelが自動的にビルド&デプロイ(30秒程度)
# スマホで開いていたURLをリロードすると最新版が見える
```

## 補足

- **プレビューデプロイ**: ブランチを切ってpushすると、そのブランチ専用のURLが生成される(本番に影響なく試せる)
- **環境変数**: Vercelのダッシュボードから設定可能
- **カスタムドメイン**: 無料で `.vercel.app` ドメイン、有料で独自ドメインも

## トラブルシューティング

### Tailwindが効かない
`src/index.css` の冒頭に `@import "tailwindcss";` があるか確認。
`vite.config.ts` で `@tailwindcss/vite` プラグインが入っているか確認。

### Three.jsの型エラー
`npm install -D @types/three` を再実行。
`tsconfig.json` の `"types": ["vite/client"]` を確認。

### Vercelビルドが失敗
ローカルで `npm run build` を試して、エラーがないか確認してから push。
