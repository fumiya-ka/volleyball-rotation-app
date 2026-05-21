import { create } from 'zustand'

type Phase = 'reception' | 'serve' | 'defense' | 'attack'
type Rotation = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
type AttackSide = 'left' | 'center' | 'right'

interface SceneState {
  phase: Phase
  rotation: Rotation
  attackSide: AttackSide
  time: number
  playing: boolean

  setPhase: (phase: Phase) => void
  setRotation: (rot: Rotation) => void
  setAttackSide: (side: AttackSide) => void
  setTime: (t: number) => void
  setPlaying: (p: boolean) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  phase: 'reception',
  rotation: 'S1',
  attackSide: 'left',
  time: 0,
  playing: true,

  setPhase: (phase) => set({ phase }),
  setRotation: (rotation) => set({ rotation }),
  setAttackSide: (attackSide) => set({ attackSide }),
  setTime: (time) => set({ time }),
  setPlaying: (playing) => set({ playing }),
}))

// フェーズがローテーション依存かどうか
export const isRotationDependent = (phase: Phase) =>
  phase === 'reception' || phase === 'serve'
