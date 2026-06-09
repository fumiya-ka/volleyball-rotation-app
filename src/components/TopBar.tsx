import { useSceneStore } from '../store/sceneStore'
import { useUiStore } from '../store/uiStore'

export default function TopBar() {
  const { rotation } = useSceneStore()
  const openOnboarding = useUiStore((s) => s.openOnboarding)

  return (
    <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-3 py-3 sm:px-6 sm:py-4 pointer-events-none">
      <h1 className="font-display text-[21px] sm:text-[30px] text-[#ff5436] tracking-wider">
        <span className="hidden sm:inline">VOLLEYBALL </span>ROTATION
      </h1>
      <div className="flex items-center gap-2">
        <div className="font-mono text-[16.5px] sm:text-[18px] tracking-widest text-[#c9cdd4] px-2 py-1 sm:px-3 sm:py-1.5 border border-[#2d3340] bg-[#0a0e1a]/60 backdrop-blur-md">
          ROT <span className="text-[#ff5436] font-bold">{rotation}</span>
        </div>
        <button
          type="button"
          onClick={openOnboarding}
          aria-label="使い方を表示"
          className="pointer-events-auto w-[42px] h-[42px] sm:w-12 sm:h-12 flex items-center justify-center font-mono text-[19.5px] sm:text-[21px] text-[#c9cdd4] border border-[#2d3340] bg-[#0a0e1a]/60 backdrop-blur-md hover:border-[#ff5436] hover:text-[#ff5436] transition-colors"
        >
          ?
        </button>
      </div>
    </div>
  )
}
