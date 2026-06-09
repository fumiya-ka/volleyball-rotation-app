import { useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSceneStore } from '../store/sceneStore'
import { useDescriptionsStore } from '../store/descriptionsStore'
import { PLAYERS } from '../data/rotations'
import { getOverallDescription } from '../data/descriptions'
import { getPlayerDescription } from '../data/playerDescriptions'
import type { RotationKey, PhaseKey, AttackTempoKey } from '../data/descriptions'

export default function Telop() {
  const { phase, rotation, attackTempo, selectedPlayer, setSelectedPlayer } = useSceneStore()
  const { overall, players } = useDescriptionsStore()

  // 全体解説（ストアのデータを使用 → DevPanelでのリアルタイム編集が反映）
  const overallDesc = useMemo(
    () => getOverallDescription(overall, phase as PhaseKey, rotation as RotationKey, attackTempo as AttackTempoKey),
    [overall, phase, rotation, attackTempo],
  )

  // 個人別解説（ストアのデータを使用）
  const playerDesc = useMemo(() => {
    if (!selectedPlayer) return null
    return getPlayerDescription(players, rotation as RotationKey, phase as PhaseKey, selectedPlayer)
  }, [players, selectedPlayer, rotation, phase])

  // 選手カラーを取得
  const playerColor = useMemo(() => {
    if (!selectedPlayer) return '#ff5436'
    return PLAYERS.find((p) => p.id === selectedPlayer)?.color ?? '#ff5436'
  }, [selectedPlayer])

  // アニメーション用キー
  const animKey = selectedPlayer
    ? `player-${selectedPlayer}-${phase}-${rotation}`
    : `overall-${phase}-${rotation}-${attackTempo}`

  return (
    <div className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-10 w-[min(720px,94vw)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="px-4 py-3 sm:px-7 sm:py-5 bg-[#0a0e1a]/88 backdrop-blur-md"
          style={{ borderLeft: `4px solid ${selectedPlayer ? playerColor : '#ff5436'}` }}
        >
          {selectedPlayer && playerDesc ? (
            /* ── 個人別解説 ── */
            <>
              {/* ヘッダー行 */}
              <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                <div className="flex items-center gap-2">
                  {/* 選手カラーバッジ */}
                  <span
                    className="font-mono text-[11px] sm:text-[12px] tracking-widest px-2 py-0.5 font-bold"
                    style={{ backgroundColor: playerColor, color: '#0a0e1a' }}
                  >
                    {selectedPlayer}
                  </span>
                  <span className="font-mono text-[12px] sm:text-[13px] tracking-widest text-[#9ca3af]">
                    個人別解説 / {rotation}
                  </span>
                </div>
                {/* 全体解説に戻るボタン */}
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="font-mono text-[12px] sm:text-[13px] tracking-wider text-[#9ca3af] hover:text-[#e8ebef] transition-colors flex items-center gap-1"
                >
                  ← 全体解説
                </button>
              </div>

              {/* ポジション */}
              <div
                className="font-mono text-[11px] sm:text-[12px] tracking-wider mb-1 sm:mb-1.5"
                style={{ color: playerColor }}
              >
                📍 {playerDesc.position}
              </div>

              {/* タイトル */}
              <h2 className="text-base sm:text-xl font-extrabold text-white mb-1.5 sm:mb-2 leading-snug">
                {selectedPlayer} — {PLAYERS.find((p) => p.id === selectedPlayer)?.label ?? selectedPlayer} の役割
              </h2>

              {/* 解説本文 */}
              <p className="text-[14px] sm:text-[16px] leading-relaxed text-[#dde1e7]">
                {playerDesc.action}
              </p>

              {/* ヒント */}
              <p className="mt-2 text-[12px] sm:text-[13px] text-[#9ca3af] font-mono tracking-wider">
                他の選手をタップして切替 / コート背景タップで全体解説に戻る
              </p>
            </>
          ) : (
            /* ── 全体解説 ── */
            <>
              <div className="font-mono text-[11px] sm:text-[12px] tracking-widest text-[#ff5436] mb-1 sm:mb-1.5">
                {overallDesc.badge}
              </div>
              <h2 className="text-base sm:text-xl font-extrabold text-white mb-1.5 sm:mb-2 leading-snug">
                {overallDesc.title}
              </h2>
              {overallDesc.desc.split('\n\n').map((para, i) => (
                <p
                  key={i}
                  className={`text-[14px] sm:text-[16px] leading-relaxed text-[#dde1e7] ${
                    i > 0 ? 'mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-[#2d3340]' : ''
                  }`}
                >
                  {para}
                </p>
              ))}
              {/* ヒント */}
              <p className="mt-2 text-[12px] sm:text-[13px] text-[#9ca3af] font-mono tracking-wider">
                選手をタップすると個人別解説を表示
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
