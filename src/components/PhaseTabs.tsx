import { motion } from 'motion/react'
import { useSceneStore } from '../store/sceneStore'
import type { AttackTempo } from '../store/sceneStore'

const PHASES = [
  { key: 'reception', label: '① 相手サーブ' },
  { key: 'serve', label: '② 自陣サーブ' },
  { key: 'defense', label: '③ 被スパイク' },
  { key: 'attack', label: '④ 攻撃' },
] as const

const ROTATIONS = ['S1', 'S6', 'S5', 'S4', 'S3', 'S2'] as const

const TEMPOS: { key: AttackTempo; label: string }[] = [
  { key: '1st', label: '1st（クイック）' },
  { key: '2nd', label: '2nd（セミ）' },
  { key: '3rd', label: '3rd（高め）' },
]

export default function PhaseTabs() {
  const { phase, rotation, attackTempo, setPhase, setRotation, setAttackTempo } = useSceneStore()

  return (
    <>
      {/* フェーズタブ */}
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

      {/* ローテーション選択（全フェーズ共通） */}
      <div className="fixed top-28 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-[#0a0e1a]/85 backdrop-blur-md p-1">
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
      </div>

      {/* 攻撃テンポ選択（attackフェーズのみ） */}
      <motion.div
        className="fixed top-[9.5rem] left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-[#0a0e1a]/85 backdrop-blur-md p-1"
        animate={{
          opacity: phase === 'attack' ? 1 : 0,
          pointerEvents: phase === 'attack' ? 'auto' : 'none',
        }}
        transition={{ duration: 0.2 }}
      >
        {TEMPOS.map((t) => (
          <button
            key={t.key}
            onClick={() => setAttackTempo(t.key)}
            className={`px-3 py-1.5 font-mono text-[10px] transition-all ${
              attackTempo === t.key
                ? 'bg-[#2d3340] text-[#fbbf24] font-bold'
                : 'text-[#6b7280] hover:text-[#c9cdd4]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>
    </>
  )
}
