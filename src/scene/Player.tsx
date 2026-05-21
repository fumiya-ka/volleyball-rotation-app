import { useMemo } from 'react'
import * as THREE from 'three'
import { PLAYERS } from '../data/rotations'
import { getPlayerPositions } from '../data/players'
import { useSceneStore } from '../store/sceneStore'

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
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [label, color])

  return (
    <sprite position={[0, 2.5, 0]} scale={[0.9, 0.45, 1]}>
      <spriteMaterial map={texture} />
    </sprite>
  )
}

function Player({
  position,
  color,
  label,
}: {
  position: [number, number, number]
  color: string
  label: string
}) {
  return (
    <group position={position}>
      {/* 体 */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.28, 1.2, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.45}
          metalness={0.05}
          emissive={color}
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* 頭 */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#fbe1c7" roughness={0.65} metalness={0} />
      </mesh>

      {/* 髪 */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <sphereGeometry args={[0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
      </mesh>

      {/* 足元のリング */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={2} />
      </mesh>

      {/* ラベル */}
      <NumberLabel label={label} color={color} />
    </group>
  )
}

export default function Players() {
  const rotation = useSceneStore((s) => s.rotation)
  const positions = useMemo(() => getPlayerPositions(rotation), [rotation])

  return (
    <>
      {PLAYERS.map((p) => {
        const pos = positions[p.id]
        return (
          <Player
            key={p.id}
            position={[pos.x, 0, pos.z]}
            color={p.color}
            label={p.label}
          />
        )
      })}
    </>
  )
}
