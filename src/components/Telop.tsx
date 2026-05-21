import { useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSceneStore } from '../store/sceneStore'

const PHASE_LABELS: Record<string, string> = {
  reception: '① 相手サーブ時(レセプション)',
  serve: '② 自陣サーブ時',
  defense: '③ 被スパイク時(ブロック+ディグ)',
  attack: '④ 自陣攻撃時(スパイク)',
}

function getDescription(phase: string, rotation: string) {
  if (phase === 'reception') {
    return {
      title: `${rotation}: レセプション陣形`,
      desc: 'サーブが打たれてから自陣が返球するまで、各選手はベース位置を保ちレシーブ。Sのみネット際へ移動。返球後にディフェンス陣形へ。',
    }
  }
  if (phase === 'serve') {
    return {
      title: `${rotation}: サーブ陣形`,
      desc: 'ポジション1の選手がサーバー。サーブが打たれた瞬間まで他5人はベース位置を保ち、サーブ後にディフェンス陣形へ移動。',
    }
  }
  if (phase === 'defense') {
    return {
      title: 'ブロック+ディグ陣形',
      desc: '相手のスパイクを受ける場面。前衛の中・右の2人がブロック、左前OHはワンタッチカバー。後衛OHが主ディガー。',
    }
  }
  return {
    title: '攻撃フォーメーション',
    desc: '後衛OHのレシーブからSがトス、前衛スパイカーが助走 → ネット際で垂直ジャンプ → スパイク。MBはクイック助走。',
  }
}

export default function Telop() {
  const { phase, rotation } = useSceneStore()
  const desc = useMemo(() => getDescription(phase, rotation), [phase, rotation])
  const key = `${phase}-${rotation}`

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-10 w-[min(700px,92vw)]">
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
            {PHASE_LABELS[phase]}
          </div>
          <h2 className="text-lg font-bold text-white mb-2">{desc.title}</h2>
          <p className="text-[13px] leading-relaxed text-[#c9cdd4]">{desc.desc}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
