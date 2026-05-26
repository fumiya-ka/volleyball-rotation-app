import { useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSceneStore } from '../store/sceneStore'
import type { AttackTempo } from '../store/sceneStore'

// ローテーション別：誰がどのポジションにいるか
// ポジション: 1=右後, 2=右前, 3=中前, 4=左前, 5=左後, 6=中後
const ROT_INFO: Record<string, {
  server: string      // サーブ担当（Pos1）
  frontRow: string    // 前衛3人
  backRow: string     // 後衛3人
  sFront: boolean     // セッターが前衛か
  reception: string   // レセプション解説
  serve: string       // サーブ解説
  defense: string     // ディフェンス解説
  attack: string      // 攻撃解説
}> = {
  S1: {
    server: 'S（セッター）',
    frontRow: 'MB1（右前）・OH1（中前）・OP（左前）',
    backRow: 'S（右後）・MB2（左後）・OH2（中後）',
    sFront: false,
    reception: 'Sは後衛右（Pos1）→ サーブ後すぐにネット際へ移動。OH2がメインレシーバー。前衛はOP・OH1・MB1が揃い、攻撃力が最高のローテーション。',
    serve: 'SがPos1からサーブ。サーブ後、他5人はベース位置を維持しつつディフェンス陣形へ移行。OPが前衛左で主攻撃担当。',
    defense: 'MB1（右前）とOH1（中前）がブロック。OPはワンタッチカバー。後衛はOH2主ディガー。SはPos1から素早くネット際のセッター位置へ移動。',
    attack: 'OPが前衛左から主スパイク。OH1が中前でフェイクアプローチ。MB1がクイック助走。Sはネット際からバックセット・フロントセットを選択。',
  },
  S6: {
    server: 'MB1（ミドルブロッカー）',
    frontRow: 'OH1（右前）・OP（中前）・MB2（左前）',
    backRow: 'MB1（右後）・OH2（左後）・S（中後）',
    sFront: false,
    reception: 'SはPos6（中後）→ 前衛中央後ろに位置し、サーブ後にネット際へ移動。OH2がメインレシーバー。MB2が前衛左に入り攻撃参加。',
    serve: 'MB1がPos1からサーブ。SはPos6の中後衛からサーブ後にネット際へ。OH1・OP・MB2の前衛3枚が揃う。',
    defense: 'OH1（右前）とOP（中前）がブロック。MB2はワンタッチカバー。後衛はOH2主ディガー。SはPos6後衛からネット際セッター位置へ移動。',
    attack: 'MB2が前衛左から主スパイク。OH1が右前でフェイクアプローチ。OPがクイック助走（中前）。Sは後衛ポジションからネット際でセット。',
  },
  S5: {
    server: 'OH1（アウトサイドヒッター）',
    frontRow: 'OP（右前）・MB2（中前）・OH2（左前）',
    backRow: 'OH1（右後）・S（左後）・MB1（中後）',
    sFront: false,
    reception: 'SはPos5（左後）→ レフト後衛からネット際へ。OH1がPos1右後衛からレシーブ。OH2が前衛左でスパイク準備。OPが前衛右で後衛的役割から復帰。',
    serve: 'OH1がPos1からサーブ。SはPos5左後衛からサーブ後にネット際へ。前衛はOP・MB2・OH2の3枚。',
    defense: 'OP（右前）とMB2（中前）がブロック。OH2はワンタッチカバー。後衛はOH1主ディガー（Pos1右後）。SはPos5からネット際へ。',
    attack: 'OH2が前衛左から主スパイク。OP右前でフェイクアプローチ。MB2がクイック助走（中前）。Sは後衛左からネット際でセット。',
  },
  S4: {
    server: 'OP（オポジット）',
    frontRow: 'MB2（右前）・OH2（中前）・S（左前）',
    backRow: 'OP（右後）・OH1（左後）・MB1（中後）',
    sFront: true,
    reception: 'SはPos4（左前）→ 前衛左に位置。サーブ後すぐにネット際へ。OH1がメインレシーバー（後衛左）。OPが後衛右でレシーブ補助。Sが前衛にいる珍しいローテーション。',
    serve: 'OPがPos1からサーブ。SはPos4左前衛。サーブ後は前衛のままネット際セッター位置へ。MB2・OH2が前衛で攻撃待機。',
    defense: 'MB2（右前）とOH2（中前）がブロック。S（左前）はワンタッチカバー。後衛はOH1主ディガー。SはPos4前衛からネット際へ（短い移動）。',
    attack: 'S（左前）が前衛から主スパイク担当。MB2右前でフェイクアプローチ。OH2がクイック助走（中前）。Sが攻撃後にセッターへ復帰（難しいローテーション）。',
  },
  S3: {
    server: 'MB2（ミドルブロッカー）',
    frontRow: 'OH2（右前）・S（中前）・MB1（左前）',
    backRow: 'MB2（右後）・OH1（左後）・OP（中後）',
    sFront: true,
    reception: 'SはPos3（中前）→ 前衛中央からネット際へ。OH1がメインレシーバー（後衛左）。OPが後衛中央。前衛はOH2・S・MB1。',
    serve: 'MB2がPos1からサーブ。SはPos3中前衛。前衛のまま短い移動でネット際へ。OH2・MB1が前衛でスパイク準備。',
    defense: 'OH2（右前）とS（中前）がブロック担当位置。MB1はワンタッチカバー（左前）。後衛はOH1主ディガー。SはPos3前衛からネット際へ。',
    attack: 'MB1が前衛左から主スパイク。OH2右前でフェイクアプローチ。S（中前）はクイック助走位置だがセット優先。Sが前衛中央からセット。',
  },
  S2: {
    server: 'OH2（アウトサイドヒッター）',
    frontRow: 'S（右前）・MB1（中前）・OH1（左前）',
    backRow: 'OH2（右後）・OP（左後）・MB2（中後）',
    sFront: true,
    reception: 'SはPos2（右前）→ 前衛右からネット際へ（最短移動）。OH2がメインレシーバー（後衛右）。OPが後衛左。OH1が前衛左でスパイク準備。',
    serve: 'OH2がPos1からサーブ。SはPos2右前衛。ネット際まで最短距離のローテーション。MB1・OH1が前衛で攻撃待機。',
    defense: 'S（右前）とMB1（中前）がブロック担当位置。OH1はワンタッチカバー（左前）。後衛はOH2主ディガー。SはPos2前衛からネット際へ（最短）。',
    attack: 'OH1が前衛左から主スパイク。S右前でネット際セット。MB1がクイック助走（中前）。Sが前衛右からセット（最もセットしやすいローテーション）。',
  },
}

const TEMPO_INFO: Record<AttackTempo, { title: string; desc: string; badge: string }> = {
  '1st': {
    badge: '1st テンポ / クイック',
    title: '1stテンポ（クイック攻撃）',
    desc: 'セッターがボールに触れると同時にMBがジャンプし、トスとスパイクがほぼ同時。相手ブロッカーが反応する間もない超高速攻撃。MB専用で、合わせの精度が求められる。',
  },
  '2nd': {
    badge: '2nd テンポ / セミ',
    title: '2ndテンポ（セミ攻撃）',
    desc: 'トスが上がってから助走を開始するセミクイック。クイックより若干高め・遅めのトスで、OHやOPが使う。ブロッカーのタイミングを外しつつ速さも確保する、最も多用されるテンポ。',
  },
  '3rd': {
    badge: '3rd テンポ / 高め',
    title: '3rdテンポ（高いトス）',
    desc: 'トスを高く上げてOHがしっかり助走できるパワー重視の攻撃。時間的余裕があるためスパイカーが位置を調整しやすい。ブロックに捕まりやすい一方、打点が高くコース精度が上がる。',
  },
}

function getDescription(phase: string, rotation: string, tempo: AttackTempo) {
  const info = ROT_INFO[rotation]
  if (!info) return { badge: '', title: rotation, desc: '' }

  if (phase === 'reception') {
    return {
      badge: '① 相手サーブ時 / レセプション',
      title: `${rotation}: レセプション陣形`,
      desc: info.reception,
    }
  }
  if (phase === 'serve') {
    return {
      badge: '② 自陣サーブ時',
      title: `${rotation}: サーブ陣形 — サーバー: ${info.server}`,
      desc: info.serve,
    }
  }
  if (phase === 'defense') {
    return {
      badge: '③ 被スパイク時 / ブロック＋ディグ',
      title: `${rotation}: ブロック＋ディグ陣形`,
      desc: info.defense,
    }
  }
  // attack
  return {
    badge: TEMPO_INFO[tempo].badge,
    title: `${rotation}: ${TEMPO_INFO[tempo].title}`,
    desc: `${info.attack}\n\n${TEMPO_INFO[tempo].desc}`,
  }
}

export default function Telop() {
  const { phase, rotation, attackTempo } = useSceneStore()
  const desc = useMemo(
    () => getDescription(phase, rotation, attackTempo),
    [phase, rotation, attackTempo],
  )
  const key = `${phase}-${rotation}-${attackTempo}`

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-10 w-[min(720px,92vw)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="px-7 py-5 bg-[#0a0e1a]/88 backdrop-blur-md border-l-4 border-[#ff5436]"
        >
          <div className="font-mono text-[10px] tracking-widest text-[#ff5436] mb-1.5">
            {desc.badge}
          </div>
          <h2 className="text-lg font-bold text-white mb-2">{desc.title}</h2>
          {desc.desc.split('\n\n').map((para, i) => (
            <p key={i} className={`text-[13px] leading-relaxed text-[#c9cdd4] ${i > 0 ? 'mt-2 pt-2 border-t border-[#2d3340]' : ''}`}>
              {para}
            </p>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
