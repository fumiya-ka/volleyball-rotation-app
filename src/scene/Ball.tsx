import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

export default function Ball() {
  const ballRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ballRef.current) return
    ballRef.current.rotation.x += 0.02
    ballRef.current.rotation.y += 0.03
  })

  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.4}>
      <mesh ref={ballRef} position={[1.5, 2.4, 1]} castShadow>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffe066"
          roughness={0.25}
          metalness={0.1}
          emissive="#ffaa00"
          emissiveIntensity={0.4}
        />
        <pointLight intensity={1} distance={3} color="#ffaa44" />
      </mesh>
    </Float>
  )
}
