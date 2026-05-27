import { useSceneStore } from '../store/sceneStore'

export default function TopBar() {
  const { rotation } = useSceneStore()

  return (
    <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-3 py-3 sm:px-6 sm:py-4 pointer-events-none">
      <h1 className="font-display text-sm sm:text-xl text-[#ff5436] tracking-wider">
        <span className="hidden sm:inline">VOLLEYBALL </span>ROTATION
      </h1>
      <div className="font-mono text-[10px] sm:text-xs tracking-widest text-[#c9cdd4] px-2 py-1 sm:px-3 sm:py-1.5 border border-[#2d3340] bg-[#0a0e1a]/60 backdrop-blur-md">
        ROT <span className="text-[#ff5436] font-bold">{rotation}</span>
      </div>
    </div>
  )
}
