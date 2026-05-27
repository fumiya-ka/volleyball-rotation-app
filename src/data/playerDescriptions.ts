/**
 * 個人別解説の型定義とヘルパー関数
 * テキストデータは playerDescriptions.json で管理 → DevPanel の解説エディタで編集可能
 */

import rawData from './playerDescriptions.json'
import type { PlayerId } from './rotations'
import type { PhaseKey, RotationKey } from './descriptions'

export interface PlayerDesc {
  position: string  // コート上の位置（例: "右後衛 Pos1"）
  action: string    // このフェーズでの役割・動き
}

export type PlayerDescsData = Record<
  RotationKey,
  Record<PhaseKey, Record<PlayerId, PlayerDesc>>
>

/** JSON から読み込んだ初期データ */
export const DEFAULT_PLAYER_DESCRIPTIONS: PlayerDescsData = rawData as PlayerDescsData

/** 個人別解説を取得するヘルパー関数（ストアのデータを使用） */
export function getPlayerDescription(
  data: PlayerDescsData,
  rotation: RotationKey,
  phase: PhaseKey,
  playerId: PlayerId,
): PlayerDesc | null {
  return data[rotation]?.[phase]?.[playerId] ?? null
}
