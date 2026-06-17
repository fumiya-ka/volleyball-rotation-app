# 詳細設計書

**プロジェクト名**: バレーボール ローテーション解説サイト  
**作成日**: 2026-05-28  
**最終更新**: 2026-06-17  
**バージョン**: 1.1

> v1.1 更新概要（ローテ動きの現実性修正）: 破損していた `posBase` を自陣座標へ復元 /
> ディフェンス・攻撃の位置取りを「役割ベース（OH=左・MB=中央・S/OP=右）」に再設計 /
> スパイク・サーブ・ブロックの打点をプレイヤーの手の位置に合わせる /
> ボール保持（静止）を0.1秒以内に抑え軌道を単純なサインカーブ化 /
> 自陣サーブの初期位置をオーバーラップ順を保った最短スタッキングに。

---

## 1. ディレクトリ構成

```
src/
├── App.tsx                      — ルートコンポーネント（UIと3Dシーンの合成）
├── main.tsx                     — エントリポイント
├── index.css                    — グローバルスタイル（Tailwind import）
├── scene/
│   ├── Scene.tsx                — R3F Canvas・カメラ・ライティング・ポストエフェクト
│   ├── SequenceAnimator.tsx     — アニメーションループ（useFrame）
│   ├── Court.tsx                — コート平面・ライン描画
│   ├── Net.tsx                  — ネット描画
│   ├── Player.tsx               — 選手メッシュ（円柱+ラベル）・ドラッグハンドラ
│   └── Ball.tsx                 — ボールメッシュ・自転アニメーション
├── components/
│   ├── TopBar.tsx               — タイトル・現在ローテーション表示
│   ├── PhaseTabs.tsx            — フェーズ/ローテーション/テンポ選択UI
│   ├── Telop.tsx                — 解説テロップ
│   ├── PlaybackControls.tsx     — 再生/停止/シークバー/速度
│   └── DevPanel.tsx             — DEV専用ビジュアル調整パネル
├── store/
│   ├── sceneStore.ts            — 再生・フェーズ・選手座標の状態管理（Zustand）
│   └── constantsStore.ts        — アニメーション定数のランタイム編集ストア
└── data/
    ├── rotations.ts             — ローテーション定義・ポジション→座標マッピング
    ├── players.ts               — 選手定義（ID・役割・色）
    ├── sequences.ts             — buildSequence()・sampleSequence()（アニメーション生成）
    ├── sequenceConstants.json   — タイミング・座標定数（マスターデータ）
    ├── sequenceConstants.ts     — JSON の型定義・エクスポート
    ├── descriptions.json        — フェーズ×ローテーション別テロップテキスト
    └── playerDescriptions.json  — 選手別役割説明テキスト
```

---

## 2. データ構造定義

### 2.1 選手 (`src/data/rotations.ts`)

```typescript
type PlayerId = 'S' | 'OP' | 'OH1' | 'OH2' | 'MB1' | 'MB2'
type Role = 'S' | 'OP' | 'OH' | 'MB'

interface PlayerDef {
  id: PlayerId
  role: Role
  label: string
  color: string
}
```

| ID | 役割 | 色 |
|----|------|----|
| S | セッター | `#ff5436` |
| OP | オポジット | `#3b82f6` |
| OH1 / OH2 | アウトサイドヒッター | `#10b981` |
| MB1 / MB2 | ミドルブロッカー | `#f59e0b` |

### 2.2 ローテーション定義 (`src/data/rotations.ts`)

```typescript
// ROTATIONS[ローテーションキー][選手ID] = ポジション番号(1〜6)
const ROTATIONS = {
  S1: { S: 1, MB1: 2, OH1: 3, OP: 4, MB2: 5, OH2: 6 },
  S6: { S: 6, MB1: 1, OH1: 2, OP: 3, MB2: 4, OH2: 5 },
  // S5 〜 S2 も同様
}

// ポジション番号 → コート座標（単位: m相当）
const POS_BASE: Record<number, { x: number; z: number }> = {
  1: { x:  3, z: 7.0 },  // 右後
  2: { x:  3, z: 1.8 },  // 右前
  3: { x:  0, z: 1.8 },  // 中前
  4: { x: -3, z: 1.8 },  // 左前
  5: { x: -3, z: 7.0 },  // 左後
  6: { x:  0, z: 7.0 },  // 中後
}
```

座標系：X軸（-3 左 〜 +3 右）、Z軸（0 ネット側 〜 +12 エンドライン側）、Y軸（0 床 〜 上方）。

### 2.3 状態管理 (`src/store/sceneStore.ts`)

```typescript
type Phase = 'reception' | 'serve' | 'defense' | 'attack'
type Rotation = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
type AttackTempo = '1st' | '2nd' | '3rd'

interface Vec3 { x: number; y: number; z: number }

interface SceneState {
  // UI選択
  phase: Phase
  rotation: Rotation
  attackTempo: AttackTempo

  // 再生制御
  time: number
  duration: number
  playing: boolean
  playbackSpeed: number  // 0.5 / 1 / 1.5 / 2

  // 3D座標
  ballPos: Vec3
  playerPos: Record<PlayerId, Vec3>

  // DEV機能
  selectedPlayer: PlayerId | null
  draggedId: PlayerId | 'ball' | null
  positionOverrides: Partial<Record<PlayerId | 'ball', Vec3>>
}
```

**状態遷移ルール:**
- `setPhase()` / `setRotation()` 呼出時: `time` を 0 にリセット、`positionOverrides` をクリア
- `applySampled()`: アニメーターが毎フレーム呼び出し、`ballPos` / `playerPos` を一括更新

### 2.4 アニメーションキーフレーム (`src/data/sequences.ts`)

```typescript
interface BallKeyframe {
  t: number    // 時刻（秒）
  x: number
  y: number
  z: number
  arc?: number  // 放物線の弧の高さ（省略時は線形補間）
}

interface PlayerKeyframe {
  t: number
  x: number
  z: number
  jump?: number  // ジャンプ高さ（省略時は待機揺れ）
}

interface Sequence {
  duration: number
  ball: BallKeyframe[]
  players: Record<PlayerId, PlayerKeyframe[]>
}
```

---

## 3. アニメーション設計

### 3.1 全体フロー

```
[フェーズ/ローテーション変更]
        ↓
buildSequence(rotKey, phaseIndex, constants)
  → Sequence オブジェクト生成
  → duration を sceneStore に保存
        ↓
SequenceAnimator.useFrame()  ← 毎フレーム（60FPS）
  ↓ playing の場合: time += delta × playbackSpeed
  ↓
sampleSequence(seq, time)
  → キーフレーム補間で ball/players の Vec3 を算出
        ↓
positionOverrides で上書き（DEVドラッグ固定済みの選手）
        ↓
applySampled(ball, players)
  → sceneStore.ballPos / playerPos を更新
        ↓
Ball.useFrame() / Player.useFrame()
  → Three.js メッシュの position を同期
```

### 3.2 補間関数

#### 線形補間（ボール X/Z, Y弧なし）
```typescript
lerp(a, b, t) = a + (b - a) * t    // 0 ≤ t ≤ 1
```

#### イージング（選手 X/Z）
```typescript
easeInOut(t) = t < 0.5
  ? 2 * t²
  : 1 - (-2t + 2)² / 2
```

#### ボール放物線（`arc > 0` の場合）
```typescript
y = lerp(y0, y1, k) + sin(k × π) × arc
```
→ `sin(k×π)` は区間の中央（k=0.5）で最大値 1、両端で 0 になるため、弧の頂点が自然に生成される。

#### 選手ジャンプ（`jump > 0` の場合）
```typescript
y = sin(k × π) × jump
```

#### 待機揺れ（`jump` なし）
```typescript
y = sin(k × π) × idleBobY    // idleBobY は sequenceConstants.json で定義
```

### 3.3 フェーズ別シーケンス生成 (`buildSequence`)

| フェーズ | 処理の流れ |
|---------|-----------|
| **0: Reception** | レセプション開始位置（`reception.byRotation`、オーバーラップ則を満たす）→ レシーブ → セッターへパス → トス → スパイク（打点＝スパイカーの手・ネット上）→ 専門ポジションへ移動 |
| **1: Serve** | 各ローテのサーブ初期位置（`serve.byRotation`、後述）から開始 → サーバーはボール位置（エンドライン後方）で構え→トス→打点を手に合わせてサーブ→コートへ。非サーバーは初期位置から専門ポジションへ最短移動（後衛MBは深い守備位置で停止） |
| **2: Defense** | 役割ベースの守備配置（OH=左・MB=中央・S/OP=右、前後はそのローテに従う）→ 右2枚ブロック（前衛MB＋前衛S/OP、手をボールに合わせる）／前衛OHはオフブロッカー／後衛OH（左後ろ）がクロスをディグ → ディグ後、セッターのネットインとブロッカー2枚のアタックライン後退を同時実行 |
| **3: Attack** | 役割ベース配置 → セッターがトス → 前衛OHが左からスパイク（打点＝手・ネット上）／前衛MBが中央クイック（助走→ほぼ垂直ジャンプ）／前衛OP（いれば）が右から助走 → 専門ポジションへ |

**役割ベースの位置取り（Defense / Attack / Serve初期位置）**: ローテ番号ではなく「役割」で左右を決める。前衛/後衛はそのローテの前後に従う。
- OH → 左、MB → 中央、S・OP → 右（前衛側の S/OP・後衛側の S/OP を `isFront('S')` で判定）
- 定数は `defense.base` / `attack.base` に役割スロット（`frontOH/frontMB/frontRight/backOH/backMB/backRight`）で定義

**打点アライメント（スパイク・サーブ・ブロック共通）**: 「ボールが方向を変える座標＝プレイヤーの手の位置」になるよう揃える。
- ジャンプの弧をヒット時刻中心に対称化し、**頂点でインパクト**させる（サンプラーはジャンプキーフレームで着地＝y0になるため、`2×hit − takeoff` を着地時刻にして頂点を hit に合わせる）
- 頂点での手の高さ ＝ 足元 + `HAND_OFFSET(=2.4)`。これがボールのインパクト高（`tossY` / サーブ `hitY` / ブロック通過高）に一致するようジャンプ量を算出
- スパイクのインパクト高 `tossY` はネット天端(2.93)より上（レセプション/攻撃とも 3.4）

**ボール軌道の方針**: 「ボールを持ってはいけない」ルールに合わせ、プレー中のボール静止は0.1秒以内。各区間は1区間＝1つの弧（単純なサインカーブ）。被スパイクは「相手セット↑→スパイク↓→ディグ↑→セッター」を連続的に描く。

**専門ポジション（SPECIALIST_POS）**: プレー終了後に移動する「守備隊形」ポジション。セッターが前衛か後衛かで2パターン（`sFront` / `sBack`）あり、`sequenceConstants.json` の `specialistPos` で定義。

### 3.4 アニメーションループ制御

```typescript
// SequenceAnimator.tsx
useFrame((_, delta) => {
  if (useSceneStore.getState().draggedId !== null) return  // DEVドラッグ中はスキップ

  let t = useSceneStore.getState().time
  if (playing) t += delta * playbackSpeed

  const state = sampleSequence(seq, t)  // t % duration で自動ループ
  // positionOverrides を適用
  applySampled(ball, players)
})
```

`sampleSequence` の `loop=true`（デフォルト）時: `t % duration` で時刻を正規化 → シーケンスがエンドレスにループ。

---

## 4. コンポーネント設計

### 4.1 Scene.tsx

R3F `<Canvas>` のルート。3Dシーン全体を管理する。

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| camera position | `[14, 12, 16]` | 右斜め後方からの俯瞰 |
| camera fov | 45° | 標準的な画角 |
| shadow | 有効 | DirectionalLight からの影 |
| dpr | `[1, 2]` | Retina 対応 |
| OrbitControls | target `[0, 1.5, 4]` | コート中央を注視点 |
| ポストエフェクト | Bloom + SSAO | 発光・環境遮蔽 |

**ライティング:**
- AmbientLight: intensity 0.4
- DirectionalLight（主光源）: position `[10, 18, 8]`, intensity 1.2, 影あり
- DirectionalLight（補助）: position `[-8, 6, -8]`, intensity 0.3, color `#ff5436`

### 4.2 Player.tsx

6名分を一括レンダリング。各選手は以下の構成：

```
<group> ← position は useFrame で毎フレーム同期
  <mesh> ← 円柱（CylinderGeometry）
  <Html> ← 選手ラベル（@react-three/drei）
</group>
```

DEVモードのみ `onPointerDown` でドラッグ開始（`triggerDrag(id, planeY=0)`）。

### 4.3 Ball.tsx

```
<mesh> ← SphereGeometry
```

`useFrame` で毎フレーム:
1. `ballPos` を Three.js position に同期
2. ドラッグ中でなければ自転（`rotation.x += 0.02, rotation.y += 0.03`）

### 4.4 PlaybackControls.tsx

- **シークバー**: Pointer Events API でドラッグ。ドラッグ開始時に再生を一時停止、終了後に復帰
- **再生速度**: `[0.5, 1, 1.5, 2]` をクリックで循環

### 4.5 PhaseTabs.tsx

- フェーズタブ: 上段（サーブ系2つ・ラリー系2つ）
- ローテーション選択: 中段（S1〜S6）
- 攻撃テンポ: 下段（攻撃フェーズのみ `opacity: 1` で表示、他は `opacity: 0` + `pointerEvents: none`）

---

## 5. DEV機能設計

### 5.1 ドラッグ操作 (`DragController.tsx` / `Player.tsx` / `Ball.tsx`)

1. 選手/ボールの `onPointerDown` → `triggerDrag(id, planeY)` を呼び出し
2. `DragController` が `Plane`（法線 Y、Y=0 or Y=プレイ中Y）を設定
3. `onPointerMove` → レイキャストでスクリーン座標→ワールド座標変換 → ストアの座標を更新
4. `onPointerUp` → `setPositionOverride(id, finalPos)` で固定位置を `positionOverrides` に保存

**ドラッグ中の制御:**
- `OrbitControls` の `enabled` を `draggedId !== null` で `false` に切替（カメラ回転と競合しない）
- `SequenceAnimator.useFrame()` が `draggedId !== null` のとき即リターン

**ドロップ後:**
- `positionOverrides` に保存された座標が毎フレームのアニメーション結果を上書き
- フェーズ/ローテーション変更時に `positionOverrides` はクリアされる

### 5.2 DEVパネル (`DevPanel.tsx` / `constantsStore.ts`)

1. `sequenceConstants.json` の全パラメータを `constantsStore` にロード
2. スライダー/数値入力で `updatePath("a.b.c", value)` を呼び出し
3. `setByPath()` でイミュータブルに更新 → `buildSequence` が次フレームで新定数を参照
4. **Download JSON** ボタン → `JSON.stringify(constants)` でダウンロード → `sequenceConstants.json` に上書きで永続化

```typescript
// パス文字列でネストオブジェクトをイミュータブル更新
function setByPath(obj, "reception.timing.serveHit", 1.2)
// → obj.reception.timing.serveHit = 1.2 相当の新オブジェクトを返す
```

---

## 6. 定数管理 (`sequenceConstants.json`)

アニメーションのすべての数値パラメータをここで一元管理する。

| キー | 内容 |
|-----|------|
| `posBase` | ポジション番号(1〜6)→自陣コート座標。serve/defense/attack の基準位置（`rotations.ts` の `POS_BASE` と一致する自陣座標） |
| `reception.byRotation` | ローテ別レセプション開始位置（オーバーラップ則を満たす） |
| `reception.timing` | レセプションフェーズの各イベント時刻 |
| `reception.ball` | ボール軌道の座標・弧の高さ（`tossY`=打点高=3.4 ネット上） |
| `reception.players` | 選手移動タイミング・ジャンプ高さ |
| `serve.byRotation` | ローテ別サーブ初期位置（オーバーラップ順を保った最短スタッキング。サーバー=pos1は除外） |
| `serve.timing` / `serve.ball` / `serve.players` | サーブフェーズ同上（`ball.tossUpY`=トス頂点、`ball.hitY`=打点高） |
| `defense.base` | 役割ベース守備配置（`frontOH/frontMB/frontRight/backOH/backMB/backRight`。`backMB`=センターバックは深め z7.8） |
| `defense.attackPrep` | ブロック後に攻撃準備で下がるアタックライン際の位置（`frontMB`/`frontRight`） |
| `defense.timing` / `defense.ball` / `defense.players` | ディフェンスフェーズ同上（`ball.setOrigin/setArc`=相手セット、`timing.attackReady`=トランジション到達、`players.blockTakeoff/blockJumpLand`=ブロック踏切/着地、`players.blockJump`=ジャンプ量） |
| `attack.base` | 役割ベース攻撃配置（役割スロット） |
| `attack.tossTarget` / `attack.rightAttack` | 左サイド（OH）のトス先 / 右サイド（OP）の攻撃位置 |
| `attack.timing` / `attack.ball` / `attack.players` | 攻撃フェーズ同上（`ball.tossY`=打点高=3.4 ネット上、`players.mbApproach`=クイック助走時刻） |
| `setterPos` | セッターポジション座標（全フェーズ共通） |
| `specialistPos.sFront` / `specialistPos.sBack` | 専門ポジション（セッター前衛/後衛別） |
| `frontRowPositions` | 前衛ポジション番号の配列 `[2,3,4]` |
| `sample.idleBobY` | 待機時の上下揺れ振幅 |

> 注: `defense.digByPosition` / `blockPos1` / `blockPos2` / `offBlockPos` 等、旧実装由来で現在は補助的に使う定数も一部残置。`posBase` は以前 z 負（相手コート側）の不正値に破損していたが v1.1 で自陣座標へ復元済み。

---

## 7. シーケンス生成詳細 (`buildSequence`)

### 役割の決定ロジック

```typescript
const frontOH = ['OH1','OH2'].find(id => isFront(id))   // 前衛OH
const backOH  = ['OH1','OH2'].find(id => !isFront(id))  // 後衛OH
const frontMB = ['MB1','MB2'].find(id => isFront(id))   // 前衛MB
const backMB  = ['MB1','MB2'].find(id => !isFront(id))  // 後衛MB
const sFront  = isFront('S')                             // セッター前衛判定
const opFront = isFront('OP')                            // OP前衛判定
```

### Reception（フェーズ0）の特殊処理

- レセプション開始位置 `RECEPTION_START`: `reception.byRotation[rotKey]` から取得（全ローテでオーバーラップ則を満たすよう配置）
- スパイカー決定: 左前（Pos4）の選手を優先、なければ frontOH → OP → frontMB の順
- S1ローテーションのみ移動開始タイミングが他と異なる（`rotKey === 'S1'` 分岐）
- スパイカーは打点アライメント（頂点を spikeHit に合わせ、手の高さ＝`tossY`）

### Serve（フェーズ1）の初期位置スタッキング

- `serve.byRotation[rotKey]` でローテ別の初期位置を定義（サーバー＝pos1 は `serverPos` で別管理のため除外）
- 方針: オーバーラップ順（前衛 pos4<pos3<pos2 / 後衛 pos5<pos6<pos1）を保ったまま、交代後の専門ポジションへ移動最短化（合致列は定位置近く、入れ替わる列は中央寄りにスタック）
- 後衛MB（非サーバー）はサーブ後も深い守備位置に停止。サーバーが後衛MB（S3/S6）の場合は打った後に深い位置(z7.8)へ

### Defense（フェーズ2）の役割ベース配置・ブロック

- 役割で左右を決定（`frontOHId/backOHId/frontMBId/backMBId/frontRightId/backRightId`、`frontRightId = isFront('S') ? 'S' : 'OP'`）→ `defense.base` の役割スロットへ配置
- ブロック: 前衛S/OP（右）＋前衛MB（中央→右に締める）の2枚。ボールのネット通過時刻に頂点を合わせ、手の高さをボールに一致（`blockTakeoff`→`blockJumpLand`、`blockJump`）
- 前衛OHはオフブロッカー（左でコートカバー）、後衛OH（左後ろ）がクロスをディグ、後衛MB（センターバック）は深め
- ディグ後トランジション: 後衛セッターのネットイン と ブロッカー2枚のアタックライン後退（`defense.attackPrep`）を `digHold`→`attackReady` で同時実行

### Attack（フェーズ3）の役割ベース配置

- スパイカー＝前衛OH（左から、打点アライメント）。前衛MB＝中央クイック（`mbApproach` 助走→ほぼ垂直ジャンプ）。前衛OP（いれば）＝右から助走。セッターは `setterPos` でトス
- 開始位置は `attack.base` の役割スロット、トス先は `attack.tossTarget`（左）

### 専門ポジション（SPECIALIST_POS）

プレー終了後の守備隊形。`specialistPos.sFront` / `sBack` のスロット定義：

```
frontOH: 左前（アンテナ付近）
frontMB: ネット前中央
backOH:  左後（レシーブ優先ゾーン）
backMB:  中後（センターバック）
S / OP:  前衛後衛それぞれの定位置（前衛=右前、後衛=右後）
```

---

## 8. ファイル間の依存関係

```
App.tsx
  ├── scene/Scene.tsx
  │   ├── scene/Court.tsx
  │   ├── scene/Net.tsx
  │   ├── scene/Player.tsx          ← store/sceneStore
  │   ├── scene/Ball.tsx            ← store/sceneStore
  │   ├── scene/SequenceAnimator.tsx ← data/sequences, store/sceneStore, store/constantsStore
  │   └── scene/DragController.tsx  ← store/sceneStore
  ├── components/TopBar.tsx         ← store/sceneStore
  ├── components/PhaseTabs.tsx      ← store/sceneStore
  ├── components/Telop.tsx          ← store/sceneStore, data/descriptions
  ├── components/PlaybackControls.tsx ← store/sceneStore
  └── components/DevPanel.tsx       ← store/constantsStore
        ↑
store/constantsStore.ts ← data/sequenceConstants.json
store/sceneStore.ts     ← data/rotations

data/sequences.ts ← data/rotations, data/sequenceConstants
data/players.ts   ← data/rotations
```
