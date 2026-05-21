import { motion } from 'motion/react'
import { useSceneStore, isRotationDependent } from '../store/sceneStore'

const PHASES = [
  { key: 'reception', label: '① 相手' },
  { key: 'serve', label: '② 自陣' },
  { key: 'defense', label: '③ 被スパイク' },
  { key: 'attack', label: '④ 攻撃' },
] as const

const ROTATIONS = ['S1', 'S6', 'S5', 'S4', 'S3', 'S2'] as const

export default function PhaseTabs() {
  const { phase, rotation, setPhase, setRotation } = useSceneStore()
  const showRotSelector = isRotationDependent(phase)

  return (
    <>
      {/* シーンタブ */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#0a0e1a]/85 backdrop-blur-md p-1.5">
        <span className="font-mono text-[8px] tracking-widest text-[#6b7280] uppercase px-2">
          サーブ
        </span>
        {PHASES.slice(0, 2).map((p) => (
          <button
            key={p.key}
            onClick={() => setPhase(p.key)}
            className={`px-3 py-2 font-mono text-[10px] tracking-wider transition-all ${
              phase === p.key
                ? 'bg-[#ff5436] text-[#0a0e1a] font-bold'
                : 'text-[#6b7280] hover:text-[#c9cdd4]'
            }`}
          >
            {p.label}
          </button>
        ))}

        <div className="w-px h-6 bg-[#2d3340] mx-1" />

        <span className="font-mono text-[8px] tracking-widest text-[#6b7280] uppercase px-2">
          ラリー
        </span>
        {PHASES.slice(2).map((p) => (
          <button
            key={p.key}
            onClick={() => setPhase(p.key)}
            className={`px-3 py-2 font-mono text-[10px] tracking-wider transition-all ${
              phase === p.key
                ? 'bg-[#ff5436] text-[#0a0e1a] font-bold'
                : 'text-[#6b7280] hover:text-[#c9cdd4]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ローテーション選択 */}
      <motion.div
        className="fixed top-28 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-[#0a0e1a]/85 backdrop-blur-md p-1"
        animate={{ opacity: showRotSelector ? 1 : 0, pointerEvents: showRotSelector ? 'auto' : 'none' }}
        transition={{ duration: 0.2 }}
      >
        {ROTATIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRotation(r)}
            className={`px-3 py-1.5 font-mono text-[10px] transition-all ${
              rotation === r
                ? 'bg-[#2d3340] text-[#ff5436] font-bold'
                : 'text-[#6b7280] hover:text-[#c9cdd4]'
            }`}
          >
            {r}
          </button>
        ))}
      </motion.div>
    </>
  )
}
