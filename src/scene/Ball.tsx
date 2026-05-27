import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../store/sceneStore'
import { triggerDrag } from './DragController'

export default function Ball() {
  const meshRef = useRef<THREE.Mesh>(null)
  const ballPos = useSceneStore((s) => s.ballPos)
  const setDraggedId = useSceneStore((s) => s.setDraggedId)
  const draggedId = useSceneStore((s) => s.draggedId)
  const isDragged = draggedId === 'ball'

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.set(ballPos.x, ballPos.y, ballPos.z)
    if (!isDragged) {
      meshRef.current.rotation.x += 0.02
      meshRef.current.rotation.y += 0.03
    }
  })

  const handlePointerDown = (e: { stopPropagation: () => void }) => {
    if (!import.meta.env.DEV) return
    e.stopPropagation()
    triggerDrag('ball', ballPos.y, setDraggedId)
  }

  return (
    <mesh
      ref={meshRef}
      castShadow
      onPointerDown={handlePointerDown}
    >
      <sphereGeometry args={[0.18, 32, 32]} />
      <meshStandardMaterial
        color="#ffe066"
        roughness={0.25}
        metalness={0.1}
        emissive="#ffaa00"
        emissiveIntensity={isDragged ? 0.8 : 0.4}
      />
      <pointLight intensity={1} distance={3} color="#ffaa44" />
    </mesh>
  )
}
