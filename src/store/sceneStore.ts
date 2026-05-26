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

  setPhase: (phase) => set({ phase, time: 0 }),
  setRotation: (rotation) => set({ rotation, time: 0 }),
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
}))

// 全フェーズでローテーション依存
export const isRotationDependent = (_phase: Phase) => true
