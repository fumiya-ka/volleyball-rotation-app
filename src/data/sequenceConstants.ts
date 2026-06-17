import raw from './sequenceConstants.json'
import type { PlayerId } from './rotations'

export type Vec2 = { x: number; z: number }

export interface SequenceConstants {
  posBase: Record<string, Vec2>
  setterPos: Vec2
  frontRowPositions: number[]
  sample: { idleBobY: number }
  reception: {
    fallbackSpiker: Vec2
    tossTargetZ: number
    byRotation: Record<string, Record<PlayerId, Vec2>>
    timing: Record<string, number>
    ball: Record<string, number | Vec2 | { x: number; y: number; z: number }>
    players: Record<string, number>
  }
  specialistPos: {
    sFront: Record<string, Vec2>
    sBack: Record<string, Vec2>
  }
  serve: {
    serverZ: number
    byRotation?: Record<string, Partial<Record<PlayerId, Vec2>>>
    timing: Record<string, number>
    ball: Record<string, number>
    ballTimes: Record<string, number>
    players: Record<string, number>
  }
  defense: {
    duration: number
    ballDigPoint: Vec2
    digByPosition: Record<string, Vec2>
    base: Record<string, Vec2>
    attackPrep: Record<string, Vec2>
    blockPos1: Vec2
    blockPos2: Vec2
    offBlockPos: Vec2
    timing: Record<string, number>
    ball: Record<string, number | Vec2 | { x: number; y: number; z: number }>
    players: Record<string, number>
  }
  attack: {
    fallbackSpiker: Vec2
    tossTargetZMin: number
    tossTargetZOffset: number
    fakeApproachZMin: number
    fakeApproachZOffset: number
    base: Record<string, Vec2>
    tossTarget: Vec2
    rightAttack: Vec2
    timing: Record<string, number>
    ball: Record<string, number>
    players: Record<string, number | Vec2>
  }
}

/** アニメーション定数（JSON）。タイミング・座標の調整は sequenceConstants.json を編集 */
export const C = raw as SequenceConstants
