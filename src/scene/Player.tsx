import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLAYERS } from '../data/rotations'
import type { PlayerId } from '../data/rotations'
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

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(pos.x, pos.y, pos.z)
  })

  return (
    <group ref={groupRef}>
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

      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#fbe1c7" roughness={0.65} metalness={0} />
      </mesh>

      <mesh position={[0, 1.78, 0]} castShadow>
        <sphereGeometry args={[0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={2} />
      </mesh>

      <NumberLabel label={label} color={color} />
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
