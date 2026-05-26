/**
 * DevPanel — ビジュアル調整ツール（dev環境のみ表示）
 * トグル: ` キー または 右下の [DEV] ボタン
 * 定数を即時変更 → アニメーションがリアルタイムで更新
 * Download JSON でファイル保存補助
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useConstantsStore, getByPath } from '../store/constantsStore'
import type { SequenceConstants } from '../data/sequenceConstants'

// ────────────────────────────────────────────────────────────
// フィールド定義
// ────────────────────────────────────────────────────────────

interface FieldDef {
  path: string
  label: string
  min: number
  max: number
  step: number
  tip: string   // 必須: ツールチップ説明文
}

interface GroupDef {
  key: string
  label: string
  fields: FieldDef[]
}

const num = (
  path: string,
  label: string,
  min: number,
  max: number,
  tip: string,
  step = 0.05,
): FieldDef => ({ path, label, min, max, step, tip })

const vec2 = (
  base: string,
  label: string,
  min: number,
  max: number,
  tipX: string,
  tipZ: string,
  step = 0.05,
): FieldDef[] => [
  { path: `${base}.x`, label: `${label} X`, min, max, step, tip: tipX },
  { path: `${base}.z`, label: `${label} Z`, min: -12, max: 12, step, tip: tipZ },
]

// 座標系の共通説明
const COORD_TIP = 'X: 正=右・負=左。Z: 小=ネット寄り・大=エンドライン寄り。'

const GROUPS: GroupDef[] = [
  {
    key: 'general',
    label: '⚙️ 共通',
    fields: [
      ...vec2(
        'setterPos',
        'セッター定位置',
        -5, 5,
        'セッターがトスする定位置のX座標。正=右、負=左。通常は右寄り（正値）。',
        'セッター定位置のZ座標。小さいほどネット寄り。通常は1.0前後。',
      ),
      num('sample.idleBobY', 'アイドル揺れ幅', 0, 0.5,
        '選手が静止しているときに上下に揺れる幅（Y軸）。0で揺れなし。大きくするとよりリアルな待機モーションになる。', 0.01),
    ],
  },
  {
    key: 'reception-timing',
    label: '① レセプション / タイミング（秒）',
    fields: [
      num('reception.timing.serveHit', 'サーブヒット', 0, 3,
        '相手がサーブを打つ時刻（秒）。これ以前は全選手が静止してローテーション確認ポーズを取る。'),
      num('reception.timing.ballToReceiver', 'ボール→レシーバー到達', 0, 5,
        'サーブされたボールがレシーバーの元に届く時刻。大きくするとボールの滞空時間が長くなる。'),
      num('reception.timing.ballToSetter', 'ボール→セッター到達', 0, 6,
        'レシーブされたボールがセッターに届く時刻。ballToReceiverより大きくする必要がある。'),
      num('reception.timing.ballSetterHold', 'セッターホールド終了', 0, 6,
        'セッターがボールを保持している状態の終了時刻。この区間でセッターは次のトスを選択するモーションになる。'),
      num('reception.timing.ballToToss', 'トス上がりきる時刻', 0, 7,
        'セッターのトスがスパイカーの元に届く時刻。ballSetterHoldより大きくする必要がある。'),
      num('reception.timing.spikeHit', 'スパイクヒット', 0, 8,
        'スパイカーがボールを打つ時刻。ballToTossより大きくする必要がある。'),
      num('reception.timing.ballLands', 'ボール着地', 0, 9,
        'スパイクが相手コートに着地する時刻。spikeHitより大きくする必要がある。'),
      num('reception.timing.endTime', 'シーケンス終了', 1, 12,
        'アニメーション1サイクルの総時間（秒）。この時刻になるとループ先頭に戻る。長くするとゆっくり繰り返す。'),
    ],
  },
  {
    key: 'reception-ball',
    label: '① レセプション / ボール軌道',
    fields: [
      num('reception.ball.receiveY', 'レシーブ高さ Y', 0, 5,
        'レシーブ時のボールの高さ（地面=0）。低いと低い位置でのレシーブ、高いと腕を上げたレシーブに見える。'),
      num('reception.ball.receiveArc', 'レシーブ弧の高さ', 0, 5,
        'サーブからレシーバーへのボール軌道の弧の高さ。大きいほど放物線が高くなり、フワッとしたサーブに見える。'),
      num('reception.ball.setterY', 'セッター到達高さ Y', 0, 5,
        'レシーブされたボールがセッターに届く高さ。レセプション精度を表現する。2.5〜3.0が自然。'),
      num('reception.ball.setterArc', 'セッターへの弧', 0, 5,
        'レシーバーからセッターへのボール軌道の弧の高さ。大きいほど高く上がったパスに見える。'),
      num('reception.ball.tossY', 'トス高さ Y', 0, 6,
        'セッターからスパイカーへのトスの高さ。3.0前後が標準的なセットの高さ。大きくすると高いセットになる。'),
      num('reception.ball.tossArc', 'トス軌道の弧', 0, 5,
        'トスの軌道の弧の高さ。正値で放物線状になる。0にすると直線的なクイックセットのように見える。'),
      num('reception.ball.opponentLandArc', '相手コート着地弧', 0, 3,
        'スパイクが相手コートに着地するときの弧。小さいほど鋭い角度のスパイクに見える。'),
    ],
  },
  {
    key: 'reception-players',
    label: '① レセプション / 選手タイミング（秒）',
    fields: [
      num('reception.players.setterMoveFront', 'S移動開始(前衛時)', 0, 5,
        'セッターが前衛のローテーション(S2/S3/S4)で、ネット際の定位置へ移動を開始する時刻。サーブヒット後に動き始めるのが自然。'),
      num('reception.players.setterMoveBack', 'S移動開始(後衛時)', 0, 5,
        'セッターが後衛のローテーション(S1/S5/S6)で、後衛からネット際へ走り込む開始時刻。少し早めに設定するのが自然。'),
      num('reception.players.setterHold', 'セッター待機終了', 0, 5,
        'セッターがネット際の定位置に到達して待機している終了時刻。この後トスのモーションに入る。'),
      num('reception.players.setterTossJump', 'セッタートスジャンプ時刻', 0, 5,
        'セッターがトスのためにジャンプする時刻。ballSetterHoldと近い値にするのが自然。'),
      num('reception.players.setterJump', 'セッタージャンプ高さ', 0, 1.5,
        'セッターのトス時のジャンプ高さ（Y軸）。0でジャンプなし（アンダーハンドセット）、0.2〜0.4で軽いジャンプセット。', 0.05),
      num('reception.players.spikerHold', 'スパイカー待機終了', 0, 5,
        'スパイカーが助走を始める前に待機している終了時刻。トスが上がるタイミングを見極める動作を表現。'),
      num('reception.players.spikerApproach', 'スパイカー助走完了', 0, 6,
        'スパイカーがネット際への助走を完了する時刻。spikeHitより少し前に設定する。'),
      num('reception.players.spikerApproachZOffset', '助走終了Zオフセット', 0, 2,
        'スパイク位置からどれだけ後ろ（Z軸方向）で助走を終えるか。0に近いほどネット際ギリギリ、大きいほど助走の踏み込みが深い。'),
      num('reception.players.spikerJump', 'スパイカージャンプ高さ', 0, 4,
        'スパイカーのジャンプ高さ（Y軸）。2.0〜2.5が標準的。大きくするほど高いジャンプに見える。'),
      num('reception.players.spikerLandDelay', '着地ディレイ(秒)', 0, 1,
        'スパイクヒット後、スパイカーが着地するまでの時間（秒）。0.3〜0.5が自然なジャンプの滞空時間。'),
      num('reception.frontRowZ', '前衛のZ位置(レセプション)', 0, 9,
        'レセプション時に前衛3選手が揃うZ位置。ネット際(小)ではなく少し下がった位置(3.0前後)でローテーション上の隊形を取る。'),
      num('reception.backSetterBehindZ', '後衛SのZ位置', 0, 9,
        '後衛セッターがサーブ前にスタンバイするZ位置。前衛の選手の後ろに隠れる位置（3.8前後）に設定。'),
      num('reception.tossTargetZ', 'トスの目標Z', 0, 5,
        'セッターからスパイカーへトスを上げる目標のZ座標。0に近いほどネット際、大きいほど後ろへのセット。'),
    ],
  },
  {
    key: 'specialist',
    label: '🎯 スペシャリスト定位置',
    fields: [
      ...vec2('specialistPos.sFront.frontOH', 'S前衛›前衛OH', -5, 5,
        'セッターが前衛時、前衛に入るOH（アウトサイドヒッター）の最終定位置X。通常はレフト側（負値）。',
        'セッターが前衛時、前衛OHの最終定位置Z。ネット際（0.8前後）。' + COORD_TIP),
      ...vec2('specialistPos.sFront.frontMB', 'S前衛›前衛MB', -5, 5,
        'セッターが前衛時、前衛に入るMB（ミドルブロッカー）の定位置X。通常は中央（0）。',
        'セッターが前衛時、前衛MBの定位置Z。ネット際（0.7前後）。' + COORD_TIP),
      ...vec2('specialistPos.sFront.S', 'S前衛›セッター', -5, 5,
        'セッターが前衛時の定位置X。通常はライト側（正値）。',
        'セッターが前衛時の定位置Z。ネット際（0.8前後）。' + COORD_TIP),
      ...vec2('specialistPos.sFront.backOH', 'S前衛›後衛OH', -5, 5,
        'セッターが前衛時、後衛に入るOHの定位置X。通常はレフト寄り（負値）。',
        'セッターが前衛時、後衛OHの定位置Z。後衛（5.5〜6.0）。' + COORD_TIP),
      ...vec2('specialistPos.sFront.backMB', 'S前衛›後衛MB', -5, 5,
        'セッターが前衛時、後衛に入るMBの定位置X。通常は中央（0）。',
        'セッターが前衛時、後衛MBの定位置Z。後衛（6.0〜7.0）。' + COORD_TIP),
      ...vec2('specialistPos.sFront.OP', 'S前衛›OP', -5, 5,
        'セッターが前衛時のOP（オポジット）定位置X。セッターと対角のためライト側後衛（正値）。',
        'セッターが前衛時のOP定位置Z。後衛（5.5〜6.0）。' + COORD_TIP),
      ...vec2('specialistPos.sBack.frontOH', 'S後衛›前衛OH', -5, 5,
        'セッターが後衛時、前衛に入るOHの定位置X。通常はレフト側（負値）。',
        'セッターが後衛時、前衛OHの定位置Z。ネット際（0.8前後）。' + COORD_TIP),
      ...vec2('specialistPos.sBack.frontMB', 'S後衛›前衛MB', -5, 5,
        'セッターが後衛時、前衛に入るMBの定位置X。通常は中央（0）。',
        'セッターが後衛時、前衛MBの定位置Z。ネット際（0.7前後）。' + COORD_TIP),
      ...vec2('specialistPos.sBack.OP', 'S後衛›前衛OP', -5, 5,
        'セッターが後衛時のOP定位置X。前衛ライト側（正値）。',
        'セッターが後衛時のOP定位置Z。ネット際（0.8前後）。' + COORD_TIP),
      ...vec2('specialistPos.sBack.backOH', 'S後衛›後衛OH', -5, 5,
        'セッターが後衛時、後衛に入るOHの定位置X。レフト寄り後衛（負値）。',
        'セッターが後衛時、後衛OHの定位置Z。後衛（5.5〜6.0）。' + COORD_TIP),
      ...vec2('specialistPos.sBack.backMB', 'S後衛›後衛MB', -5, 5,
        'セッターが後衛時、後衛に入るMBの定位置X。中央後衛（0前後）。',
        'セッターが後衛時、後衛MBの定位置Z。後衛（6.0〜7.0）。' + COORD_TIP),
      ...vec2('specialistPos.sBack.S', 'S後衛›セッター', -5, 5,
        'セッターが後衛時のセッター定位置X。ライト側後衛（正値）。',
        'セッターが後衛時のセッター定位置Z。後衛（5.5〜6.0）。' + COORD_TIP),
    ],
  },
  {
    key: 'serve',
    label: '② サーブ',
    fields: [
      num('serve.serverZ', 'サーバーZ位置', 8, 14,
        'サーバーが立つZ座標。エンドラインの外（コート奥）に位置する。大きいほど遠くに見える。'),
      num('serve.timing.serveHit', 'サーブヒット', 0, 4,
        'サーバーがボールを打つ時刻（秒）。これ以前はサーバーがトスを上げるモーション。'),
      num('serve.timing.ballOver', 'ネット通過時刻', 0, 5,
        'サーブされたボールがネットを通過する時刻。serveHitより大きい値にする。'),
      num('serve.timing.endTime', 'シーケンス終了', 1, 10,
        'サーブシーケンスの総時間（秒）。この時刻でループ先頭に戻る。'),
      num('serve.ball.holdY', 'ボール保持高さ Y', 0, 4,
        'サーブ前にサーバーがボールを保持している高さ。腰〜胸あたり（1.0〜1.5）が自然。'),
      num('serve.ball.tossUpY', 'トスアップ最高点 Y', 0, 6,
        'サーブのトスアップの最高点の高さ。高いほどダイナミックなトスに見える。3.0〜3.5が標準。'),
      num('serve.ball.hitY', 'ヒット高さ Y', 0, 6,
        'サーブのボールを打つ瞬間の高さ。ジャンプサーブは高め（2.5〜3.0）、フローターは低め（2.0前後）。'),
      num('serve.ball.overNetY', 'ネット通過高さ Y', 0, 5,
        'ボールがネット上を通過するときの高さ。ネット高さ（2.4m相当）より高めに設定する。'),
      num('serve.ball.overNetZ', 'ネット通過 Z位置', -10, 0,
        'ボールがネット上を通過するZ座標。負値で相手コート方向。ネット位置（0）より少し相手寄り（-3前後）。'),
      num('serve.ball.overNetXFactor', 'ネット通過X係数', 0, 1,
        'ネット通過時のX座標をサーバーのX座標に掛ける係数。1.0でサーバーと同じX、0で中央。0.6〜0.8が自然。', 0.05),
      num('serve.ball.landTime', '着地時刻(秒)', 0, 6,
        '相手コートへ着地する時刻。ballOverより大きい値にする。'),
      num('serve.ball.landY', '着地高さ Y', 0, 3,
        '着地瞬間のボールの高さ。地面より少し高め（0.5〜1.0）にするとバウンドのタイミングが自然に見える。'),
      num('serve.ball.landZ', '着地 Z位置', -12, 0,
        '相手コートへの着地Z座標。負値で相手コート内。-5〜-7程度が一般的なサーブコース。'),
      num('serve.ball.landXFactor', '着地X係数', 0, 1,
        '着地のX座標をサーバーのX座標に掛ける係数。1.0でサーバーと同X、0で中央。コースを表現するのに使う。', 0.05),
      num('serve.ball.landArc', '着地弧', 0, 3,
        '着地前の軌道の弧の高さ。小さいほど直線的（フローター的）、大きいほど放物線（ジャンプサーブ的）に見える。'),
      num('serve.players.serverMove', 'サーバー移動開始', 0, 3,
        'サーバーがPos1からサーブゾーン（エンドライン外）へ移動を開始する時刻。0.5〜1.0が自然。'),
      num('serve.players.serverToss', 'サーバートスアップ', 0, 3,
        'サーバーがトスを上げ始める時刻。serverMoveより大きい値にする。'),
      num('serve.players.serverLand', 'サーバー着地', 0, 5,
        'サーブのジャンプから着地する時刻。serveHitより少し大きい値にする。'),
      num('serve.players.serverJump', 'サーバージャンプ高さ', 0, 1.5,
        'サーブジャンプの高さ（Y軸）。0でジャンプサーブなし、0.3〜0.5でジャンプサーブ表現。', 0.05),
      num('serve.ballTimes.hold', 'ボール保持開始', 0, 3,
        'ボールのアニメーション上、保持モーションが始まる時刻。0から始まることが多い。'),
      num('serve.ballTimes.tossUp', 'トスアップ開始', 0, 3,
        'ボールのトスアップが始まる時刻。serverTossと揃えると自然なモーションになる。'),
    ],
  },
  {
    key: 'defense',
    label: '③ ディフェンス',
    fields: [
      ...vec2('defense.ballDigPoint', 'ディグポイント', -6, 6,
        'ディグでボールが捉えられる地点のX座標。レフト寄り（負値）が多い。',
        'ディグポイントのZ座標。後衛中央付近（4〜5）が標準的。' + COORD_TIP),
      ...vec2('defense.blockPos1', 'ブロック1 定位置', -5, 5,
        'ブロッカー1（Pos2=右前の選手）がブロックのために移動するX座標。スパイクコースに合わせて調整。',
        'ブロッカー1のZ座標。ネット際（0.3〜0.5）。' + COORD_TIP),
      ...vec2('defense.blockPos2', 'ブロック2 定位置', -5, 5,
        'ブロッカー2（Pos3=中前の選手）がブロックのために移動するX座標。ブロック1の隣に並ぶ位置。',
        'ブロッカー2のZ座標。ネット際（0.3〜0.5）。' + COORD_TIP),
      ...vec2('defense.offBlockPos', 'オフブロック位置', -5, 5,
        'Pos4（左前）の選手がブロックに入らずカバーに回る位置X。レフト寄り（-2.5〜-3.5）。',
        'オフブロック選手のカバー位置Z。少し後ろ（2.0〜3.0）。' + COORD_TIP),
      ...vec2('defense.digByPosition.1', 'ディグ待機: Pos1', -6, 6,
        'Pos1（右後）選手のディグ待機位置X。ライト後衛（3.0〜4.0）が標準。',
        'Pos1選手のディグ待機位置Z。後衛（5.0〜6.0）。' + COORD_TIP),
      ...vec2('defense.digByPosition.5', 'ディグ待機: Pos5(主ディガー)', -6, 6,
        'Pos5（左後）選手のディグ待機位置X。このシーンの主ディガー。レフト後衛（-2.5〜-3.0）。',
        'Pos5選手のディグ待機位置Z。後衛（4.5〜5.5）。' + COORD_TIP),
      ...vec2('defense.digByPosition.6', 'ディグ待機: Pos6', -6, 6,
        'Pos6（中後）選手のディグ待機位置X。中央後衛（0〜1.0）。',
        'Pos6選手のディグ待機位置Z。後衛（4.0〜5.0）。' + COORD_TIP),
      num('defense.timing.spikeWindup', 'スパイクウィンドアップ', 0, 3,
        '相手スパイクのウィンドアップ（振りかぶり）が完了する時刻。ブロッカーがジャンプを開始するタイミングの目安。'),
      num('defense.timing.spikeHit', 'スパイクヒット', 0, 4,
        '相手スパイクがボールを打つ時刻。ブロッカーはこの時刻にジャンプの頂点に達する。'),
      num('defense.timing.ballDig', 'ボールディグ時刻', 0, 5,
        'ディガーがスパイクされたボールを捉える時刻。spikeHitより少し後（0.5〜0.8秒後）が自然。'),
      num('defense.timing.digHold', 'ディグホールド終了', 0, 6,
        'ディグされたボールが空中に上がり続けている区間の終了時刻。この後セッターへのパスが始まる。'),
      num('defense.timing.ballToSetter', 'ボール→セッター到達', 0, 7,
        'ディグされたボールがセッターに届く時刻。digHoldより大きい値にする。'),
      num('defense.timing.end', 'シーケンス終了', 1, 10,
        'ディフェンスシーケンスの総時間（秒）。セッターにボールが収まった後の余韻も含む。'),
      num('defense.players.blocker1Move', 'ブロッカー1 移動完了', 0, 3,
        'ブロッカー1がブロック位置への横移動を完了する時刻。spikeWindupより少し前が自然。'),
      num('defense.players.blocker2Move', 'ブロッカー2 移動完了', 0, 3,
        'ブロッカー2がブロック位置への横移動を完了する時刻。ブロッカー1と同程度か少し後。'),
      num('defense.players.offBlockMove', 'オフブロック 移動完了', 0, 3,
        'Pos4選手がカバー位置への移動を完了する時刻。'),
      num('defense.players.digMove', 'ディガー 移動完了', 0, 3,
        'ディガーがディグ待機位置への移動を完了する時刻。スパイクヒット前には構えていると自然。'),
      num('defense.players.digContact', 'ディグ接触時刻', 0, 4,
        'ディガーがボールに手を当てるアニメーションのタイミング。ballDigと同じ値にするのが自然。'),
      num('defense.players.blockJump', 'ブロックジャンプ高さ', 0, 4,
        'ブロッカーのジャンプ高さ（Y軸）。1.5〜2.0が標準的なブロックジャンプ。'),
      num('defense.players.blockLand', 'ブロック着地時刻', 0, 4,
        'ブロッカーが着地する時刻。spikeHitの直後（0.1〜0.3秒後）が自然。'),
      num('defense.players.digJump', 'ディグジャンプ高さ', 0, 0.5,
        'ディグ時の小さなジャンプ高さ。ディグはほぼ地面での動作なので0.1〜0.15が自然。', 0.01),
      num('defense.players.backSetterMove', '後衛S→セッター移動', 0, 6,
        '後衛セッターがディグ後にネット際のセッター定位置へ走り込む開始時刻。digHold前後が自然。'),
    ],
  },
  {
    key: 'attack',
    label: '④ 攻撃',
    fields: [
      num('attack.tossTargetZMin', 'トス目標Z 最小値', 0, 3,
        'スパイカーの位置に関わらず、トスの目標Z座標がこの値を下回らないようにする下限。ネット際に近づきすぎを防ぐ。'),
      num('attack.tossTargetZOffset', 'トス目標Z オフセット', 0, 3,
        'スパイカーの基本Z位置からどれだけ手前（ネット側）をトス目標にするか。大きいほどネット際へのセット。'),
      num('attack.fakeApproachZMin', 'フェイク助走Z 最小値', 0, 3,
        'フェイクアプローチ（囮の助走）の目標Z座標の下限。フェイク選手がネット際に近づきすぎを防ぐ。'),
      num('attack.fakeApproachZOffset', 'フェイク助走Z オフセット', 0, 3,
        'フェイク選手の基本Z位置からどれだけ前へ踏み込むか。大きいほど積極的なフェイク助走になる。'),
      num('attack.timing.ballRise', 'ボール上昇完了', 0, 3,
        'セッターへのパスボールが上昇し切る時刻。この後セッターがボールを保持するモーションに入る。'),
      num('attack.timing.ballHold', 'ボールホールド終了', 0, 3,
        'セッターがボールを保持している区間の終了時刻。この後トスの軌道が始まる。'),
      num('attack.timing.ballToToss', 'トス上がりきる時刻', 0, 5,
        'セッターのトスがスパイカーの打点に届く時刻。spikeHitより少し前にする。'),
      num('attack.timing.spikeHit', 'スパイクヒット', 0, 5,
        'スパイカーがボールを打つ時刻。'),
      num('attack.timing.ballLands', 'ボール着地', 0, 6,
        'スパイクが相手コートに着地する時刻。spikeHitの0.5〜1.0秒後が自然。'),
      num('attack.timing.endTime', 'シーケンス終了', 1, 10,
        '攻撃シーケンスの総時間（秒）。'),
      num('attack.ball.riseY', 'ボール上昇開始高さ Y', 0, 5,
        'セッターに届く前のボールの初期高さ（セッターへのパスのスタート高さ）。'),
      num('attack.ball.riseZOffset', 'ボール上昇開始Zオフセット', 0, 4,
        'ボールの上昇開始位置をセッター位置からどれだけ後ろ（Z方向）にするか。パスの飛んでくる方向を表現。'),
      num('attack.ball.riseArc', '上昇の弧', 0, 4,
        'セッターへ向かうボールの弧の高さ。大きいほど高いパスに見える。'),
      num('attack.ball.setterY', 'セッター保持高さ Y', 0, 5,
        'セッターがボールを保持するときの高さ。トス前の手元の高さ。2.5〜3.0が標準。'),
      num('attack.ball.tossY', 'トス高さ Y', 0, 6,
        'セッターのトスがスパイカーの打点に届く高さ。3.0前後が標準的なセットの高さ。'),
      num('attack.ball.tossArc', 'トス軌道の弧', 0, 4,
        'トスの軌道の弧の高さ。大きいほど高く浮いたトスに見える。0に近いほどクイックセット的。'),
      num('attack.ball.landY', '着地高さ Y', 0, 3,
        '相手コートへの着地瞬間のボール高さ。0.5前後が自然なバウンド表現。'),
      num('attack.ball.landZ', '着地 Z位置', -12, 0,
        '相手コートへの着地Z座標。-5〜-7程度が標準的なスパイクコース。'),
      num('attack.ball.landXFactor', '着地 X係数', 0, 1,
        '着地X座標をスパイカーのX座標に掛ける係数。コースの方向を表現する。', 0.05),
      num('attack.ball.landArc', '着地弧', 0, 3,
        '着地前の弧の高さ。ネットへの角度が急なスパイクは小さく、フェンテ等は大きめに。'),
      num('attack.players.setterJump', 'セッタージャンプ高さ', 0, 1.5,
        'セッターのトス時のジャンプ高さ。0でジャンプなし、0.3前後でジャンプセット表現。', 0.05),
      num('attack.players.spikerReady', 'スパイカー準備完了', 0, 3,
        'スパイカーがトスを見極めて助走を始める準備ができる時刻。ballHoldと近い値が自然。'),
      num('attack.players.spikerApproach', 'スパイカー助走完了', 0, 4,
        'スパイカーがネット際への助走を完了する時刻。spikeHitの直前。'),
      num('attack.players.spikerJump', 'スパイカージャンプ高さ', 0, 4,
        'スパイカーのジャンプ高さ。2.0〜2.5が標準的。大きいほど高い打点のスパイクに見える。'),
      num('attack.players.spikerLandDelay', '着地ディレイ(秒)', 0, 1,
        'スパイクヒット後に着地するまでの時間。0.3〜0.5秒が自然なジャンプの滞空時間。'),
      num('attack.players.spikerApproachZOffset', '助走終了Zオフセット', 0, 2,
        '助走終了位置をスパイク目標からどれだけ後ろ（Z方向）にするか。踏み込みの深さを表現。'),
      ...vec2('attack.players.mbQuickPos', 'MBクイック位置', -5, 5,
        'MBがクイック攻撃でジャンプする位置X。セッターのすぐ隣（0前後）が標準。',
        'MBクイック位置Z。ネット際（0.7前後）。' + COORD_TIP),
      num('attack.players.mbQuickStart', 'MBクイック開始時刻', 0, 3,
        'MBがクイック攻撃のジャンプを開始する時刻。セッターがトスを上げると同時〜直前が1stテンポ。'),
      num('attack.players.mbQuickLand', 'MBクイック着地時刻', 0, 4,
        'MBクイックのジャンプから着地する時刻。mbQuickStartから0.3〜0.5秒後が自然。'),
      num('attack.players.mbQuickJump', 'MBクイックジャンプ高さ', 0, 4,
        'MBのクイック攻撃のジャンプ高さ。スパイカーより少し低め（1.5〜2.0）でも可。'),
      num('attack.players.fakeReady', 'フェイク準備完了', 0, 3,
        'フェイク（囮）助走する選手が助走の準備動作を完了する時刻。'),
      num('attack.players.fakeApproach', 'フェイク助走完了', 0, 4,
        'フェイク選手がフェイクの助走を完了する時刻。実際のスパイカーと同時〜少し前にジャンプする。'),
      num('attack.players.fakeJump', 'フェイクジャンプ高さ', 0, 3,
        'フェイク選手のジャンプ高さ。実際にスパイクしないので本スパイカーより低めにすると自然。'),
    ],
  },
]

// ────────────────────────────────────────────────────────────
// ツールチップコンポーネント
// ────────────────────────────────────────────────────────────

function InfoTooltip({ tip }: { tip: string }) {
  const iconRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  const handleEnter = useCallback(() => {
    if (!iconRef.current) return
    const r = iconRef.current.getBoundingClientRect()
    setPos({ top: r.top + r.height / 2, right: window.innerWidth - r.left + 10 })
  }, [])

  const sentences = tip.split('。').filter(Boolean)
  const headline = sentences[0] + '。'
  const body = sentences.slice(1).join('。') + (sentences.length > 1 ? '。' : '')

  return (
    <div className="flex-shrink-0" onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)}>
      <span
        ref={iconRef}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] leading-none cursor-help text-[#4b5563] hover:text-[#8892a4] border border-[#2d3340] hover:border-[#4b5563] transition-colors select-none"
      >
        ?
      </span>

      {pos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] w-64 p-2.5 bg-[#1a2035] border border-[#3d4f6b] text-[9px] leading-relaxed shadow-xl rounded"
            style={{ top: pos.top, right: pos.right, transform: 'translateY(-50%)' }}
          >
            <div className="font-mono text-[8px] text-[#ff5436] mb-1">{headline}</div>
            {body && <div className="text-[#8892a4]">{body}</div>}
            <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-[5px] border-t-transparent border-b-transparent border-l-[#3d4f6b]" />
          </div>,
          document.body,
        )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// フィールド行
// ────────────────────────────────────────────────────────────

function FieldRow({ field, constants }: { field: FieldDef; constants: SequenceConstants }) {
  const updatePath = useConstantsStore((s) => s.updatePath)
  const value = getByPath(constants, field.path)
  const numValue = typeof value === 'number' ? value : 0

  const handleChange = useCallback(
    (v: number) => {
      if (isNaN(v)) return
      const clamped = Math.min(field.max, Math.max(field.min, v))
      updatePath(field.path, clamped)
    },
    [field.path, field.min, field.max, updatePath],
  )

  return (
    <div className="flex items-center gap-1.5 py-1 px-2 hover:bg-[#1a2035] rounded min-w-0">
      {/* ラベル */}
      <span
        className="text-[10px] text-[#8892a4] flex-shrink-0 truncate"
        style={{ width: '120px' }}
        title={field.path}
      >
        {field.label}
      </span>

      {/* ツールチップアイコン */}
      <InfoTooltip tip={field.tip} />

      {/* スライダー */}
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={numValue}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="flex-1 min-w-0 h-1 accent-[#ff5436] cursor-pointer"
      />

      {/* 数値入力 */}
      <input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={numValue}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="w-14 flex-shrink-0 text-[10px] text-right bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-1 py-0.5 rounded focus:border-[#ff5436] focus:outline-none"
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// グループアコーディオン
// ────────────────────────────────────────────────────────────

function GroupSection({
  group,
  constants,
  openKey,
  onToggle,
}: {
  group: GroupDef
  constants: SequenceConstants
  openKey: string | null
  onToggle: (key: string) => void
}) {
  const isOpen = openKey === group.key

  return (
    <div className="border-b border-[#1e2840]">
      <button
        onClick={() => onToggle(group.key)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-[#c9cdd4] hover:text-white hover:bg-[#1a2035] transition-colors"
      >
        <span>{group.label}</span>
        <span className="text-[#4b5563] text-[10px] ml-2 flex-shrink-0">
          {isOpen ? '▲' : '▼'} {group.fields.length}項目
        </span>
      </button>
      {isOpen && (
        <div className="pb-2 overflow-x-hidden">
          {group.fields.map((f) => (
            <FieldRow key={f.path} field={f} constants={constants} />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────────────────

const MIN_WIDTH = 340
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 440

export default function DevPanel() {
  const [visible, setVisible] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>('general')
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const { constants, isDirty, reset } = useConstantsStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(DEFAULT_WIDTH)

  // ` キーでトグル
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') setVisible((v) => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // リサイズ（左端ドラッグ）
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    resizeStartX.current = e.clientX
    resizeStartWidth.current = panelWidth
    e.preventDefault()
  }, [panelWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = resizeStartX.current - e.clientX
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartWidth.current + delta)))
    }
    const onUp = () => { isResizing.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleToggleGroup = useCallback((key: string) => {
    setOpenKey((prev) => (prev === key ? null : key))
  }, [])

  const handleCopyJson = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(constants, null, 2)).then(() => {
      alert('JSONをクリップボードにコピーしました！\nsrc/data/sequenceConstants.json に貼り付けてください。')
    })
  }, [constants])

  const handleDownloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(constants, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sequenceConstants.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [constants])

  const handleReset = useCallback(() => {
    if (confirm('すべての変更をリセットしますか？')) reset()
  }, [reset])

  return (
    <>
      {/* トグルボタン */}
      <button
        onClick={() => setVisible((v) => !v)}
        className={`fixed bottom-4 right-4 z-50 font-mono text-[10px] px-3 py-1.5 border transition-all ${
          visible
            ? 'bg-[#ff5436] text-[#0a0e1a] border-[#ff5436]'
            : 'bg-[#0a0e1a]/80 border-[#2d3340] text-[#6b7280] hover:text-[#ff5436] hover:border-[#ff5436]'
        }`}
        title="DEVパネル (` キーでも開閉)"
      >
        DEV {isDirty && <span className="text-[#fbbf24]">●</span>}
      </button>

      {/* パネル本体 */}
      {visible && (
        <div
          ref={panelRef}
          className="fixed right-0 top-0 bottom-0 z-40 bg-[#0d1424]/97 backdrop-blur-md border-l border-[#1e2840] flex flex-col shadow-2xl overflow-x-hidden"
          style={{ width: panelWidth }}
        >
          {/* ← リサイズハンドル（左端） */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 group"
            onMouseDown={handleResizeStart}
          >
            {/* ホバー時にハイライト */}
            <div className="absolute inset-0 group-hover:bg-[#ff5436]/30 active:bg-[#ff5436]/50 transition-colors" />
            {/* ドラッグ用グリップドット */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pl-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-0.5 h-0.5 rounded-full bg-[#ff5436]" />
              ))}
            </div>
          </div>

          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2840] flex-shrink-0 pl-5">
            <div className="min-w-0">
              <h2 className="font-mono text-[11px] font-bold text-[#ff5436] tracking-widest">
                CONSTANTS EDITOR
              </h2>
              <p className="font-mono text-[9px] text-[#4b5563] mt-0.5">
                ` キーで開閉　左端ドラッグで幅調整　<span className="text-[#6b7280]">? ホバーで説明</span>
                {isDirty && <span className="text-[#fbbf24] ml-1">— 変更あり</span>}
              </p>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-[#4b5563] hover:text-white text-lg leading-none ml-2 flex-shrink-0"
            >
              ×
            </button>
          </div>

          {/* フィールドリスト（スクロール可） */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {GROUPS.map((g) => (
              <GroupSection
                key={g.key}
                group={g}
                constants={constants}
                openKey={openKey}
                onToggle={handleToggleGroup}
              />
            ))}
          </div>

          {/* フッター */}
          <div className="flex-shrink-0 border-t border-[#1e2840] p-3 space-y-2">
            <p className="font-mono text-[9px] text-[#4b5563] leading-relaxed">
              調整後は <span className="text-[#ff5436]">Download JSON</span> →{' '}
              <code className="text-[#8892a4]">src/data/sequenceConstants.json</code> に上書き保存
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyJson}
                className="flex-1 font-mono text-[10px] py-1.5 bg-[#1a2035] border border-[#2d3340] text-[#c9cdd4] hover:border-[#ff5436] hover:text-white transition-colors"
              >
                Copy JSON
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex-1 font-mono text-[10px] py-1.5 bg-[#ff5436] text-[#0a0e1a] font-bold hover:bg-[#ff6b52] transition-colors"
              >
                Download JSON
              </button>
            </div>
            <button
              onClick={handleReset}
              className="w-full font-mono text-[10px] py-1 border border-[#2d3340] text-[#4b5563] hover:border-[#6b7280] hover:text-[#8892a4] transition-colors"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </>
  )
}
