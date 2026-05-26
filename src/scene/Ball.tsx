import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../store/sceneStore'

export default function Ball() {
  const meshRef = useRef<THREE.Mesh>(null)
  const ballPos = useSceneStore((s) => s.ballPos)

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.set(ballPos.x, ballPos.y, ballPos.z)
    meshRef.current.rotation.x += 0.02
    meshRef.current.rotation.y += 0.03
  })

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.18, 32, 32]} />
      <meshStandardMaterial
        color="#ffe066"
        roughness={0.25}
        metalness={0.1}
        emissive="#ffaa00"
        emissiveIntensity={0.4}
      />
      <pointLight intensity={1} distance={3} color="#ffaa44" />
    </mesh>
  )
}
