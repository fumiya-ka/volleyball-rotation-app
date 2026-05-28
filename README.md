# バレーボール ローテーション解説サイト

バレーボールの6ローテーション × 4フェーズ（レセプション・サーブ・ディフェンス・攻撃）の動きを3Dで再現・解説するWebアプリ。

**技術スタック**: React + Three.js (R3F) + Zustand + Tailwind CSS v4 + Vite + TypeScript  
**公開**: Vercel（`git push` で自動デプロイ）

## 設計書

- [基本設計書](docs/basic-design.md) — システム概要・機能要件・技術スタック・画面構成
- [詳細設計書](docs/detail-design.md) — データ構造・アニメーション設計・コンポーネント設計・DEV機能

---

## プロジェクト構成

```
src/
├ App.tsx                      ← ルートコンポーネント
├ main.tsx
├ index.css
├ scene/
│  ├ Scene.tsx                 ← R3F Canvasと3Dシーン全体
│  ├ SequenceAnimator.tsx      ← アニメーションループ（useFrame）
│  ├ Court.tsx                 ← コート描画
│  ├ Net.tsx                   ← ネット描画
│  ├ Player.tsx                ← 選手（円柱+ラベル）
│  └ Ball.tsx                  ← ボール
├ components/
│  ├ TopBar.tsx                ← タイトル + ローテーション表示
│  ├ PhaseTabs.tsx             ← フェーズ切替タブ + ローテーション選択 + 攻撃テンポ選択
│  ├ Telop.tsx                 ← 解説テロップ（フェーズ×ローテーション×テンポ別）
│  ├ PlaybackControls.tsx      ← 再生/停止/シークバー/速度
│  └ DevPanel.tsx              ← ビジュアル調整ツール（dev環境のみ）
├ store/
│  ├ sceneStore.ts             ← 再生状態・フェーズ・ローテーション・テンポ管理
│  └ constantsStore.ts         ← アニメーション定数のランタイム編集ストア
└ data/
   ├ rotations.ts              ← ローテーション定義・コート座標
   ├ sequences.ts              ← buildSequence(): キーフレーム生成ロジック
   ├ sequenceConstants.json    ← ★ 全タイミング・座標定数（ここを編集して調整）
   ├ sequenceConstants.ts      ← JSONの型定義とエクスポート
   └ players.ts                ← 選手定義
```

---

## ローカル開発

```bash
npm install
npm run dev
# → http://localhost:5173 で起動
```

---

## アニメーション定数の調整

選手の座標・ボール軌道・タイミングはすべて `src/data/sequenceConstants.json` で管理している。

### 方法A: DEVパネル（推奨）

`npm run dev` 中にブラウザで `` ` ``（バッククォート）キー または 右下の **[DEV]** ボタンを押す。

- 右サイドパネルが開き、全パラメータをスライダー＋数値入力でリアルタイム調整できる
- **Download JSON** ボタンで変更後の `sequenceConstants.json` をダウンロード
- ダウンロードしたファイルを `src/data/sequenceConstants.json` に上書き保存すると永続化される
- DEVパネルは本番ビルドには含まれない（`import.meta.env.DEV` で制御）

### 方法B: JSON直接編集

`src/data/sequenceConstants.json` を直接編集すると Vite の HMR でブラウザが即時更新される。

---

## フェーズ・ローテーション・テンポ

| 選択項目 | 内容 |
|---------|------|
| フェーズ | ① 相手サーブ（レセプション）/ ② 自陣サーブ / ③ 被スパイク（ブロック+ディグ）/ ④ 攻撃 |
| ローテーション | S1〜S6（全フェーズで切替可能） |
| 攻撃テンポ | 1st（クイック）/ 2nd（セミ）/ 3rd（高め）— ④攻撃フェーズのみ表示 |

---

## Vercel へのデプロイ

```bash
# ローカルでビルド確認してからpush
npm run build
git add -A
git commit -m "feat: 変更内容"
git push
# → Vercelが自動ビルド&デプロイ（30秒〜1分）
```

> **注意**: `npm run build` でエラーがないことを確認してからpushすること。

### 初回セットアップ（済みの場合はスキップ）

1. https://vercel.com/new でGitHubリポジトリをインポート
2. Frameworkは「Vite」が自動検出される
3. 「Deploy」でデプロイ完了、`xxx.vercel.app` のURLが発行される
4. 以降は `git push` するだけで自動更新

**プレビューデプロイ**: ブランチを切ってpushすると本番とは別のURLが生成され、本番に影響なく動作確認できる。

---

## トラブルシューティング

### Tailwindが効かない
`src/index.css` の冒頭に `@import "tailwindcss";` があるか確認。  
`vite.config.ts` で `@tailwindcss/vite` プラグインが入っているか確認。

### Three.jsの型エラー
`npm install -D @types/three` を再実行。

### Vercelビルドが失敗
ローカルで `npm run build` を実行してエラー内容を確認してからpush。
