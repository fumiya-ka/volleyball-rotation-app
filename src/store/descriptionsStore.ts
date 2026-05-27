/**
 * 解説テキスト編集ストア
 * DevPanel の解説エディタで変更 → Download JSON で書き出し → src/data/*.json に上書き
 */

import { create } from 'zustand'
import { DEFAULT_DESCRIPTIONS } from '../data/descriptions'
import { DEFAULT_PLAYER_DESCRIPTIONS } from '../data/playerDescriptions'
import type { DescriptionsData, RotationKey, PhaseKey } from '../data/descriptions'
import type { PlayerDescsData } from '../data/playerDescriptions'
import type { PlayerId } from '../data/rotations'

interface DescriptionsState {
  overall: DescriptionsData
  players: PlayerDescsData
  isDirty: boolean

  /** 全体解説テキストを更新 */
  setOverallText: (rotation: RotationKey, phase: PhaseKey, text: string) => void
  /** 全体解説のサーバー/前衛/後衛フィールドを更新 */
  setOverallMeta: (rotation: RotationKey, field: 'server' | 'frontRow' | 'backRow', text: string) => void
  /** テンポ解説テキストを更新 */
  setTempoText: (tempo: '1st' | '2nd' | '3rd', field: 'badge' | 'title' | 'desc', text: string) => void
  /** 個人別解説を更新 */
  setPlayerText: (rotation: RotationKey, phase: PhaseKey, playerId: PlayerId, field: 'position' | 'action', text: string) => void
  /** リセット */
  resetOverall: () => void
  resetPlayers: () => void
}

export const useDescriptionsStore = create<DescriptionsState>((set) => ({
  overall: JSON.parse(JSON.stringify(DEFAULT_DESCRIPTIONS)),
  players: JSON.parse(JSON.stringify(DEFAULT_PLAYER_DESCRIPTIONS)),
  isDirty: false,

  setOverallText: (rotation, phase, text) =>
    set((s) => ({
      isDirty: true,
      overall: {
        ...s.overall,
        rotations: {
          ...s.overall.rotations,
          [rotation]: { ...s.overall.rotations[rotation], [phase]: text },
        },
      },
    })),

  setOverallMeta: (rotation, field, text) =>
    set((s) => ({
      isDirty: true,
      overall: {
        ...s.overall,
        rotations: {
          ...s.overall.rotations,
          [rotation]: { ...s.overall.rotations[rotation], [field]: text },
        },
      },
    })),

  setTempoText: (tempo, field, text) =>
    set((s) => ({
      isDirty: true,
      overall: {
        ...s.overall,
        tempos: {
          ...s.overall.tempos,
          [tempo]: { ...s.overall.tempos[tempo], [field]: text },
        },
      },
    })),

  setPlayerText: (rotation, phase, playerId, field, text) =>
    set((s) => ({
      isDirty: true,
      players: {
        ...s.players,
        [rotation]: {
          ...s.players[rotation],
          [phase]: {
            ...s.players[rotation][phase],
            [playerId]: {
              ...s.players[rotation][phase][playerId],
              [field]: text,
            },
          },
        },
      },
    })),

  resetOverall: () =>
    set({ overall: JSON.parse(JSON.stringify(DEFAULT_DESCRIPTIONS)), isDirty: false }),

  resetPlayers: () =>
    set({ players: JSON.parse(JSON.stringify(DEFAULT_PLAYER_DESCRIPTIONS)), isDirty: false }),
}))

/** overall JSONをダウンロード */
export function downloadOverallJson(data: DescriptionsData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'descriptions.json'
  a.click()
  URL.revokeObjectURL(url)
}

/** players JSONをダウンロード */
export function downloadPlayersJson(data: PlayerDescsData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'playerDescriptions.json'
  a.click()
  URL.revokeObjectURL(url)
}
