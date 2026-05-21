import { ROTATIONS, POS_BASE, PLAYERS, PlayerId } from './rotations'

// 現在のローテーションでの各選手の位置を返す
export function getPlayerPositions(rotKey: keyof typeof ROTATIONS) {
  const assignment = ROTATIONS[rotKey]
  const result: Record<PlayerId, { x: number; z: number }> = {} as never
  for (const player of PLAYERS) {
    const posNum = assignment[player.id]
    result[player.id] = POS_BASE[posNum]
  }
  return result
}
