import { useSceneStore } from '../store/sceneStore'

export default function TopBar() {
  const { rotation } = useSceneStore()

  return (
    <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 pointer-events-none">
      <h1 className="font-display text-xl text-[#ff5436]">VOLLEYBALL ROTATION</h1>
      <div className="font-mono text-xs tracking-widest text-[#c9cdd4] px-3 py-1.5 border border-[#2d3340] bg-[#0a0e1a]/60 backdrop-blur-md">
        ROTATION <span className="text-[#ff5436] font-bold">{rotation}</span>
      </div>
    </div>
  )
}
