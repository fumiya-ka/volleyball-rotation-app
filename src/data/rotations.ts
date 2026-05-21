// プレイヤーIDとロール
export type PlayerId = 'S' | 'OP' | 'OH1' | 'OH2' | 'MB1' | 'MB2'
export type Role = 'S' | 'OP' | 'OH' | 'MB'

export interface PlayerDef {
  id: PlayerId
  role: Role
  label: string
  color: string
}

export const PLAYERS: PlayerDef[] = [
  { id: 'S',   role: 'S',  label: 'S',   color: '#ff5436' },
  { id: 'OP',  role: 'OP', label: 'OP',  color: '#3b82f6' },
  { id: 'OH1', role: 'OH', label: 'OH1', color: '#10b981' },
  { id: 'OH2', role: 'OH', label: 'OH2', color: '#10b981' },
  { id: 'MB1', role: 'MB', label: 'MB1', color: '#f59e0b' },
  { id: 'MB2', role: 'MB', label: 'MB2', color: '#f59e0b' },
]

// ローテーションごとの「プレイヤーID → ポジション番号」
// ポジション番号: 1=右後, 2=右前, 3=中前, 4=左前, 5=左後, 6=中後
export const ROTATIONS = {
  S1: { S: 1, MB1: 2, OH1: 3, OP: 4, MB2: 5, OH2: 6 },
  S6: { S: 6, MB1: 1, OH1: 2, OP: 3, MB2: 4, OH2: 5 },
  S5: { S: 5, MB1: 6, OH1: 1, OP: 2, MB2: 3, OH2: 4 },
  S4: { S: 4, MB1: 5, OH1: 6, OP: 1, MB2: 2, OH2: 3 },
  S3: { S: 3, MB1: 4, OH1: 5, OP: 6, MB2: 1, OH2: 2 },
  S2: { S: 2, MB1: 3, OH1: 4, OP: 5, MB2: 6, OH2: 1 },
} as const

// ポジション番号 → コート座標(x: 左右, z: 前後・ネット側が0)
export const POS_BASE: Record<number, { x: number; z: number }> = {
  1: { x: 3, z: 7 },
  2: { x: 3, z: 1.8 },
  3: { x: 0, z: 1.8 },
  4: { x: -3, z: 1.8 },
  5: { x: -3, z: 7 },
  6: { x: 0, z: 7 },
}
