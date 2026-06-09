import { motion, AnimatePresence } from 'motion/react'
import { useUiStore } from '../store/uiStore'

const STEPS = [
  {
    icon: '🏐',
    title: 'バレーのローテを 3D で',
    desc: 'S1〜S6 の各ローテーションごとに、選手の動きと配置を立体的に確認できます。',
  },
  {
    icon: '👆',
    title: '選手をタップ → 個人解説',
    desc: 'コート上の選手をタップすると、その選手の役割と動きの解説が表示されます。背景タップで全体解説に戻ります。',
  },
  {
    icon: '🔀',
    title: 'フェーズを切り替え',
    desc: '上部のタブで「相手サーブ／自陣サーブ／被スパイク／攻撃」を切り替え。各局面の動きを見比べられます。',
  },
  {
    icon: '▶',
    title: '下部バーで再生・シーク',
    desc: '再生／一時停止・速度変更ができ、バーをドラッグすれば任意のタイミングへ移動できます。',
  },
] as const

export default function Onboarding() {
  const { onboardingOpen, closeOnboarding } = useUiStore()

  return (
    <AnimatePresence>
      {onboardingOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e1a]/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={closeOnboarding}
        >
          <motion.div
            className="relative w-[min(440px,94vw)] max-h-[88vh] overflow-y-auto bg-[#0f1420] border border-[#2d3340] shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="px-6 pt-6 pb-4 border-b border-[#2d3340]">
              <div className="font-mono text-[12px] tracking-widest text-[#ff5436] mb-1.5">
                VOLLEYBALL ROTATION
              </div>
              <h1 className="font-display text-2xl sm:text-3xl text-white tracking-wider leading-none">
                3D で学ぶ、ローテーションの動き
              </h1>
            </div>

            {/* 操作ガイド */}
            <div className="px-6 py-5 flex flex-col gap-4">
              {STEPS.map((s) => (
                <div key={s.title} className="flex items-start gap-3.5">
                  <span className="shrink-0 w-9 h-9 flex items-center justify-center text-lg bg-[#1a2030] border border-[#2d3340]">
                    {s.icon}
                  </span>
                  <div>
                    <div className="text-[15px] font-bold text-white leading-snug mb-0.5">
                      {s.title}
                    </div>
                    <p className="text-[13px] leading-relaxed text-[#9ca3af]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* フッター */}
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={closeOnboarding}
                className="w-full py-3 bg-[#ff5436] text-[#0a0e1a] font-display text-lg tracking-widest hover:bg-[#ff6b50] active:bg-[#e8472c] transition-colors"
              >
                始める
              </button>
              <p className="mt-2.5 text-center text-[12px] text-[#6b7280] font-mono tracking-wider">
                右上の <span className="text-[#9ca3af]">?</span> でいつでも再表示できます
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
