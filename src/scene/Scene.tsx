import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import { Color } from 'three'
import Court from './Court'
import Net from './Net'
import Players from './Player'
import Ball from './Ball'
import SequenceAnimator from './SequenceAnimator'
import DragController from './DragController'
import { useSceneStore } from '../store/sceneStore'

export default function Scene() {
  const setSelectedPlayer = useSceneStore((s) => s.setSelectedPlayer)
  const draggedId = useSceneStore((s) => s.draggedId)

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [14, 11.2, 16], fov: 45 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelectedPlayer(null)}
      >
        {/* 背景 */}
        <color attach="background" args={['#0a0e1a']} />
        <fog attach="fog" args={['#0a0e1a', 25, 60]} />

        {/* ライティング */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 18, 8]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-8, 6, -8]} intensity={0.3} color="#ff5436" />

        {/* 体育館っぽい雰囲気のHDR環境 */}
        <Environment preset="city" />

        {/* コート要素 */}
        <Court />
        <Net />
        <SequenceAnimator />
        <Players />
        <Ball />

        {/* カメラ操作（DEVドラッグ中は無効化） */}
        <OrbitControls
          target={[0, 0.7, 4]}
          enableDamping
          dampingFactor={0.05}
          minDistance={8}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2.1}
          enabled={draggedId === null}
        />

        {/* DEVドラッグコントローラー */}
        {import.meta.env.DEV && <DragController />}

        {/* ポストエフェクト */}
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.4} luminanceThreshold={0.9} luminanceSmoothing={0.5} />
          <SSAO
            samples={11}
            radius={0.5}
            intensity={20}
            luminanceInfluence={0.6}
            color={new Color('#000000')}
            worldDistanceThreshold={0}
            worldDistanceFalloff={0}
            worldProximityThreshold={0}
            worldProximityFalloff={0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
