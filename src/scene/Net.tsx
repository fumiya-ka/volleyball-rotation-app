const COURT_W = 9

export default function Net() {
  return (
    <group>
      {/* ネット本体 */}
      <mesh position={[0, 2.43, 0]}>
        <planeGeometry args={[COURT_W + 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={2} />
      </mesh>

      {/* 上バー */}
      <mesh position={[0, 2.93, 0]} castShadow>
        <boxGeometry args={[COURT_W + 1, 0.06, 0.06]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* 下バー */}
      <mesh position={[0, 1.93, 0]} castShadow>
        <boxGeometry args={[COURT_W + 1, 0.06, 0.06]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* ポール */}
      {[-COURT_W / 2 - 0.5, COURT_W / 2 + 0.5].map((x) => (
        <mesh key={x} position={[x, 1.75, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 3.5, 16]} />
          <meshStandardMaterial color="#cccccc" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
    </group>
  )
}
