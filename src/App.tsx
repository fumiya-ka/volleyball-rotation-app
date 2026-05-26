import Scene from './scene/Scene'
import TopBar from './components/TopBar'
import PhaseTabs from './components/PhaseTabs'
import Telop from './components/Telop'
import PlaybackControls from './components/PlaybackControls'
import DevPanel from './components/DevPanel'

function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0e1a]">
      {/* 3Dシーン */}
      <Scene />

      {/* UI レイヤー */}
      <TopBar />
      <PhaseTabs />
      <Telop />
      <PlaybackControls />

      {/* 開発ツール（dev環境のみ） */}
      {import.meta.env.DEV && <DevPanel />}
    </div>
  )
}

export default App
