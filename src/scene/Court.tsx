import { useMemo } from 'react'
import * as THREE from 'three'

const COURT_W = 9
const COURT_L = 9

// ライン作成ヘルパー
function Line({
  from,
  to,
  color = 0xffffff,
  thickness = 0.08,
}: {
  from: [number, number]
  to: [number, number]
  color?: number
  thickness?: number
}) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dz, dx)
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, 0.012, (from[1] + to[1]) / 2]}
      rotation={[-Math.PI / 2, 0, -angle]}
    >
      <planeGeometry args={[len, thickness]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

// プロシージャル木目テクスチャ
function useWoodTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const grad = ctx.createLinearGradient(0, 0, 512, 0)
    grad.addColorStop(0, '#8B6F47')
    grad.addColorStop(0.5, '#A0824F')
    grad.addColorStop(1, '#7A5F3D')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)

    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(${60 + Math.random() * 30}, ${40 + Math.random() * 20}, ${20 + Math.random() * 15}, ${0.3 + Math.random() * 0.4})`
      ctx.lineWidth = 1 + Math.random() * 2
      ctx.beginPath()
      const y = i * 13 + Math.random() * 5
      ctx.moveTo(0, y)
      for (let x = 0; x < 512; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3)
      }
      ctx.stroke()
    }
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(20,10,5,0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, i * 85)
      ctx.lineTo(512, i * 85)
      ctx.stroke()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3, 2)
    return tex
  }, [])
}

export default function Court() {
  const woodTex = useWoodTexture()
  const half = COURT_W / 2

  return (
    <group>
      {/* 床 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 28]} />
        <meshStandardMaterial map={woodTex} roughness={0.4} metalness={0.1} envMapIntensity={0.8} />
      </mesh>

      {/* コート(自陣) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, COURT_L / 2]} receiveShadow>
        <planeGeometry args={[COURT_W, COURT_L]} />
        <meshStandardMaterial color="#c97a3f" roughness={0.7} metalness={0} />
      </mesh>

      {/* コート(相手陣)薄め */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -COURT_L / 2]} receiveShadow>
        <planeGeometry args={[COURT_W, COURT_L]} />
        <meshStandardMaterial color="#b86d35" roughness={0.7} metalness={0} />
      </mesh>

      {/* 自陣境界 */}
      <Line from={[-half, 0]} to={[half, 0]} />
      <Line from={[half, 0]} to={[half, COURT_L]} />
      <Line from={[half, COURT_L]} to={[-half, COURT_L]} />
      <Line from={[-half, COURT_L]} to={[-half, 0]} />
      {/* アタックライン */}
      <Line from={[-half, 3]} to={[half, 3]} thickness={0.06} />

      {/* 相手陣境界(薄め) */}
      <Line from={[-half, 0]} to={[half, 0]} color={0x666666} thickness={0.06} />
      <Line from={[half, 0]} to={[half, -COURT_L]} color={0x666666} thickness={0.06} />
      <Line from={[half, -COURT_L]} to={[-half, -COURT_L]} color={0x666666} thickness={0.06} />
      <Line from={[-half, -COURT_L]} to={[-half, 0]} color={0x666666} thickness={0.06} />
    </group>
  )
}
