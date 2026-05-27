import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLAYERS } from '../data/rotations'
import type { PlayerId } from '../data/rotations'
import { useSceneStore } from '../store/sceneStore'
import { triggerDrag } from './DragController'

function NumberLabel({ label, color }: { label: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 256, 128)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 72px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 128, 70)
    return new THREE.CanvasTexture(canvas)
  }, [label, color])

  return (
    <sprite position={[0, 2.5, 0]} scale={[0.9, 0.45, 1]}>
      <spriteMaterial map={texture} />
    </sprite>
  )
}

function AnimatedPlayer({
  id,
  color,
  label,
}: {
  id: PlayerId
  color: string
  label: string
}) {
  const groupRef = useRef<THREE.Group>(null)
  const pos = useSceneStore((s) => s.playerPos[id])
  const selectedPlayer = useSceneStore((s) => s.selectedPlayer)
  const setSelectedPlayer = useSceneStore((s) => s.setSelectedPlayer)
  const setDraggedId = useSceneStore((s) => s.setDraggedId)

  const isSelected = selectedPlayer === id
  const hasSelection = selectedPlayer !== null
  const isDimmed = hasSelection && !isSelected

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(pos.x, pos.y, pos.z)
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    // ドラッグ中はクリック選択しない
    if (useSceneStore.getState().draggedId !== null) return
    setSelectedPlayer(isSelected ? null : id)
  }

  const handlePointerDown = (e: { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
    if (!import.meta.env.DEV) return
    e.stopPropagation()
    triggerDrag(id, 0, setDraggedId)
  }

  return (
    <group ref={groupRef} onClick={handleClick} onPointerDown={handlePointerDown}>
      {/* 選択時のハイライトリング */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.38, 0.52, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={2} />
        </mesh>
      )}

      {/* 胴体 */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.28, 1.2, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.45}
          metalness={0.05}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : isDimmed ? 0 : 0.05}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>

      {/* 頭 */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial
          color="#fbe1c7"
          roughness={0.65}
          metalness={0}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>

      {/* 髪 */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <sphereGeometry args={[0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#2a1a0a"
          roughness={0.9}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>

      {/* ナンバーラベル（スプライト） */}
      <sprite position={[0, 2.5, 0]} scale={[0.9, 0.45, 1]}>
        <spriteMaterial
          map={useMemo(() => {
            const canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 128
            const ctx = canvas.getContext('2d')!
            ctx.fillStyle = color
            ctx.globalAlpha = isDimmed ? 0.2 : 1
            ctx.fillRect(0, 0, 256, 128)
            ctx.globalAlpha = isDimmed ? 0.2 : 1
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 72px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(label, 128, 70)
            return new THREE.CanvasTexture(canvas)
          // eslint-disable-next-line react-hooks/exhaustive-deps
          }, [label, color, isDimmed])}
          transparent
          opacity={isDimmed ? 0.2 : 1}
        />
      </sprite>
    </group>
  )
}

export default function Players() {
  return (
    <>
      {PLAYERS.map((p) => (
        <AnimatedPlayer key={p.id} id={p.id} color={p.color} label={p.label} />
      ))}
    </>
  )
}
