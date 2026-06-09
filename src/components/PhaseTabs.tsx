import { motion } from 'motion/react'
import { useSceneStore } from '../store/sceneStore'
import type { AttackTempo } from '../store/sceneStore'

const PHASES = [
  { key: 'reception', label: '① 相手サーブ', shortLabel: '① 受' },
  { key: 'serve', label: '② 自陣サーブ', shortLabel: '② 出' },
  { key: 'defense', label: '③ 被スパイク', shortLabel: '③ 守' },
  { key: 'attack', label: '④ 攻撃', shortLabel: '④ 攻' },
] as const

const ROTATIONS = ['S1', 'S6', 'S5', 'S4', 'S3', 'S2'] as const

const TEMPOS: { key: AttackTempo; label: string; shortLabel: string }[] = [
  { key: '1st', label: '1st（クイック）', shortLabel: '1st' },
  { key: '2nd', label: '2nd（セミ）', shortLabel: '2nd' },
  { key: '3rd', label: '3rd（高め）', shortLabel: '3rd' },
]

export default function PhaseTabs() {
  const { phase, rotation, attackTempo, setPhase, setRotation, setAttackTempo } = useSceneStore()

  return (
    <>
      {/* フェーズタブ */}
      <div className="fixed top-[72px] sm:top-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2 bg-[#0a0e1a]/85 backdrop-blur-md p-1.5 sm:p-2">
        <span className="hidden sm:block font-mono text-[16.5px] tracking-widest text-[#6b7280] uppercase px-3">
          サーブ
        </span>
        {PHASES.slice(0, 2).map((p) => (
          <button
            key={p.key}
            onClick={() => setPhase(p.key)}
            className={`px-3 py-[9px] sm:px-[18px] sm:py-3 font-mono text-[16.5px] sm:text-[18px] tracking-wider transition-all ${
              phase === p.key
                ? 'bg-[#ff5436] text-[#0a0e1a] font-bold'
                : 'text-[#6b7280] hover:text-[#c9cdd4]'
            }`}
          >
            {/* モバイル: 短縮ラベル / デスクトップ: フルラベル */}
            <span className="sm:hidden">{p.shortLabel}</span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}

        <div className="w-px h-[30px] sm:h-9 bg-[#2d3340] mx-1 sm:mx-1.5" />

        <span className="hidden sm:block font-mono text-[16.5px] tracking-widest text-[#6b7280] uppercase px-3">
          ラリー
        </span>
        {PHASES.slice(2).map((p) => (
          <button
            key={p.key}
            onClick={() => setPhase(p.key)}
            className={`px-3 py-[9px] sm:px-[18px] sm:py-3 font-mono text-[16.5px] sm:text-[18px] tracking-wider transition-all ${
              phase === p.key
                ? 'bg-[#ff5436] text-[#0a0e1a] font-bold'
                : 'text-[#6b7280] hover:text-[#c9cdd4]'
            }`}
          >
            <span className="sm:hidden">{p.shortLabel}</span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>

      {/* ローテーション選択（全フェーズ共通） */}
      <div className="fixed top-[132px] sm:top-[168px] left-1/2 -translate-x-1/2 z-10 flex gap-1 sm:gap-1.5 bg-[#0a0e1a]/85 backdrop-blur-md p-1.5">
        {ROTATIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRotation(r)}
            className={`px-[15px] py-1.5 sm:px-[18px] sm:py-[9px] font-mono text-[16.5px] sm:text-[18px] transition-all ${
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
        className="fixed top-[192px] sm:top-[228px] left-1/2 -translate-x-1/2 z-10 flex gap-1 sm:gap-1.5 bg-[#0a0e1a]/85 backdrop-blur-md p-1.5"
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
            className={`px-3 py-1.5 sm:px-[18px] sm:py-[9px] font-mono text-[16.5px] sm:text-[18px] transition-all ${
              attackTempo === t.key
                ? 'bg-[#2d3340] text-[#fbbf24] font-bold'
                : 'text-[#6b7280] hover:text-[#c9cdd4]'
            }`}
          >
            {/* モバイル: 短縮 / デスクトップ: フル */}
            <span className="sm:hidden">{t.shortLabel}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </motion.div>
    </>
  )
}
