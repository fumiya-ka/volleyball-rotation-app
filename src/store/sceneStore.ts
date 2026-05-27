import { create } from 'zustand'
import type { PlayerId } from '../data/rotations'

export type Phase = 'reception' | 'serve' | 'defense' | 'attack'
export type Rotation = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
export type AttackSide = 'left' | 'center' | 'right'
export type AttackTempo = '1st' | '2nd' | '3rd'

export interface Vec3 {
  x: number
  y: number
  z: number
}

interface SceneState {
  phase: Phase
  rotation: Rotation
  attackSide: AttackSide
  attackTempo: AttackTempo
  time: number
  duration: number
  playing: boolean
  playbackSpeed: number
  ballPos: Vec3
  playerPos: Record<PlayerId, Vec3>
  selectedPlayer: PlayerId | null
  /** DEVドラッグ中のエンティティ */
  draggedId: PlayerId | 'ball' | null
  /**
   * DEV: ドロップ後に保持する位置オーバーライド
   * SequenceAnimator のアニメーション後に上書き適用される
   * フェーズ/ローテーション変更時にクリアされる
   */
  positionOverrides: Partial<Record<PlayerId | 'ball', Vec3>>

  setPhase: (phase: Phase) => void
  setRotation: (rot: Rotation) => void
  setAttackSide: (side: AttackSide) => void
  setAttackTempo: (tempo: AttackTempo) => void
  setTime: (t: number) => void
  setDuration: (d: number) => void
  setPlaying: (p: boolean) => void
  setPlaybackSpeed: (s: number) => void
  setBallPos: (p: Vec3) => void
  setPlayerPos: (id: PlayerId, p: Vec3) => void
  applySampled: (ball: Vec3, players: Record<PlayerId, Vec3>) => void
  setSelectedPlayer: (id: PlayerId | null) => void
  setDraggedId: (id: PlayerId | 'ball' | null) => void
  /** ドロップ時に位置を保存 */
  setPositionOverride: (id: PlayerId | 'ball', pos: Vec3) => void
  /** 指定エンティティのオーバーライドを削除 */
  clearPositionOverride: (id: PlayerId | 'ball') => void
  /** 全オーバーライドをクリア */
  clearAllPositionOverrides: () => void
}

const defaultPlayerPos = {} as Record<PlayerId, Vec3>
const ids: PlayerId[] = ['S', 'OP', 'OH1', 'OH2', 'MB1', 'MB2']
for (const id of ids) {
  defaultPlayerPos[id] = { x: 0, y: 0, z: 0 }
}

export const useSceneStore = create<SceneState>((set) => ({
  phase: 'reception',
  rotation: 'S1',
  attackSide: 'left',
  attackTempo: '2nd',
  time: 0,
  duration: 6,
  playing: true,
  playbackSpeed: 1,
  ballPos: { x: -2, y: 2.4, z: -8 },
  playerPos: { ...defaultPlayerPos },
  selectedPlayer: null,
  draggedId: null,
  positionOverrides: {},

  // フェーズ/ローテーション変更時にオーバーライドをクリア
  setPhase: (phase) => set({ phase, time: 0, selectedPlayer: null, positionOverrides: {} }),
  setRotation: (rotation) => set({ rotation, time: 0, selectedPlayer: null, positionOverrides: {} }),
  setAttackSide: (attackSide) => set({ attackSide }),
  setAttackTempo: (attackTempo) => set({ attackTempo }),
  setTime: (time) => set({ time }),
  setDuration: (duration) => set({ duration }),
  setPlaying: (playing) => set({ playing }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setBallPos: (ballPos) => set({ ballPos }),
  setPlayerPos: (id, p) =>
    set((s) => ({ playerPos: { ...s.playerPos, [id]: p } })),
  applySampled: (ballPos, playerPos) => set({ ballPos, playerPos }),
  setSelectedPlayer: (selectedPlayer) => set({ selectedPlayer }),
  setDraggedId: (draggedId) => set({ draggedId }),
  setPositionOverride: (id, pos) =>
    set((s) => ({ positionOverrides: { ...s.positionOverrides, [id]: pos } })),
  clearPositionOverride: (id) =>
    set((s) => {
      const next = { ...s.positionOverrides }
      delete next[id]
      return { positionOverrides: next }
    }),
  clearAllPositionOverrides: () => set({ positionOverrides: {} }),
}))

// 全フェーズでローテーション依存
export const isRotationDependent = (_phase: Phase) => true
