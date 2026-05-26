import { ROTATIONS, POS_BASE, type PlayerId } from './rotations'
import type { Phase } from '../store/sceneStore'
import { C as DEFAULT_C } from './sequenceConstants'
import type { SequenceConstants } from './sequenceConstants'

export interface BallKeyframe {
  t: number
  x: number
  y: number
  z: number
  arc?: number
}

export interface PlayerKeyframe {
  t: number
  x: number
  z: number
  jump?: number
}

export interface Sequence {
  duration: number
  ball: BallKeyframe[]
  players: Record<PlayerId, PlayerKeyframe[]>
}

export interface SampledState {
  ball: { x: number; y: number; z: number }
  players: Record<PlayerId, { x: number; y: number; z: number }>
}

type RotKey = keyof typeof ROTATIONS

type RoleSlot = 'frontOH' | 'frontMB' | 'backOH' | 'backMB' | 'S' | 'OP'

function applySpecialistPos(
  target: Record<PlayerId, { x: number; z: number }>,
  slots: Record<RoleSlot, { x: number; z: number }>,
  frontOH: PlayerId | undefined,
  frontMB: PlayerId | undefined,
  backOH: PlayerId | undefined,
  backMB: PlayerId | undefined,
) {
  if (frontOH) target[frontOH] = slots.frontOH
  if (frontMB) target[frontMB] = slots.frontMB
  if (backOH) target[backOH] = slots.backOH
  if (backMB) target[backMB] = slots.backMB
  target.S = slots.S
  target.OP = slots.OP
}

export function phaseToIndex(phase: Phase): number {
  const map: Record<Phase, number> = {
    reception: 0,
    serve: 1,
    defense: 2,
    attack: 3,
  }
  return map[phase]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function pkf(frames: PlayerKeyframe[]): PlayerKeyframe[] {
  return frames.map((f) => ({ ...f }))
}

export function sampleSequence(seq: Sequence, t: number, loop = true): SampledState {
  const total = seq.duration
  const tt = loop ? t % total : Math.min(t, total)

  const ballKf = seq.ball
  let ballPos = { x: ballKf[0].x, y: ballKf[0].y, z: ballKf[0].z }
  for (let i = 0; i < ballKf.length - 1; i++) {
    if (tt >= ballKf[i].t && tt <= ballKf[i + 1].t) {
      const span = ballKf[i + 1].t - ballKf[i].t
      const k = span > 0 ? (tt - ballKf[i].t) / span : 0
      const arc = ballKf[i + 1].arc || 0
      ballPos.x = lerp(ballKf[i].x, ballKf[i + 1].x, k)
      ballPos.z = lerp(ballKf[i].z, ballKf[i + 1].z, k)
      if (arc > 0) {
        const baseY = lerp(ballKf[i].y, ballKf[i + 1].y, k)
        ballPos.y = baseY + Math.sin(k * Math.PI) * arc
      } else {
        ballPos.y = lerp(ballKf[i].y, ballKf[i + 1].y, k)
      }
      break
    }
  }
  if (tt >= ballKf[ballKf.length - 1].t) {
    const last = ballKf[ballKf.length - 1]
    ballPos = { x: last.x, y: last.y, z: last.z }
  }

  const idleBob = DEFAULT_C.sample.idleBobY
  const playerStates = {} as Record<PlayerId, { x: number; y: number; z: number }>
  for (const id of Object.keys(seq.players) as PlayerId[]) {
    const kfs = seq.players[id]
    let state = { x: kfs[0].x, y: 0, z: kfs[0].z }
    for (let i = 0; i < kfs.length - 1; i++) {
      if (tt >= kfs[i].t && tt <= kfs[i + 1].t) {
        const span = kfs[i + 1].t - kfs[i].t
        const k = span > 0 ? (tt - kfs[i].t) / span : 0
        const e = easeInOut(k)
        state.x = lerp(kfs[i].x, kfs[i + 1].x, e)
        state.z = lerp(kfs[i].z, kfs[i + 1].z, e)
        const jump = kfs[i + 1].jump || 0
        state.y = jump > 0 ? Math.sin(k * Math.PI) * jump : Math.sin(k * Math.PI) * idleBob
        break
      }
    }
    if (tt >= kfs[kfs.length - 1].t) {
      const last = kfs[kfs.length - 1]
      state = { x: last.x, y: 0, z: last.z }
    }
    playerStates[id] = state
  }

  return { ball: ballPos, players: playerStates }
}

export function buildSequence(rotKey: RotKey, phase: number, C: SequenceConstants = DEFAULT_C): Sequence {
  const assignment = ROTATIONS[rotKey]
  const posOf = (id: PlayerId) => assignment[id]
  const isFront = (id: PlayerId) => C.frontRowPositions.includes(posOf(id))

  const base = {} as Record<PlayerId, { x: number; z: number }>
  for (const id of Object.keys(assignment) as PlayerId[]) {
    base[id] = { ...POS_BASE[assignment[id]] }
  }

  const SETTER_POS = C.setterPos
  const R = C.reception

  const frontOH = (['OH1', 'OH2'] as PlayerId[]).find((id) => isFront(id))
  const backOH = (['OH1', 'OH2'] as PlayerId[]).find((id) => !isFront(id))
  const frontMB = (['MB1', 'MB2'] as PlayerId[]).find((id) => isFront(id))
  const backMB = (['MB1', 'MB2'] as PlayerId[]).find((id) => !isFront(id))
  const opFront = isFront('OP')
  const sFront = isFront('S')

  const RECEPTION_START = {} as Record<PlayerId, { x: number; z: number }>
  for (const id of Object.keys(assignment) as PlayerId[]) {
    const posNum = assignment[id]
    const b = POS_BASE[posNum]
    if (C.frontRowPositions.includes(posNum)) {
      RECEPTION_START[id] = { x: b.x, z: R.frontRowZ }
    } else {
      RECEPTION_START[id] = { x: b.x, z: b.z }
    }
  }

  if (!sFront) {
    const sPos = assignment['S']
    const frontPair = R.backSetterFrontPair
    const frontPosNum = frontPair[String(sPos)]
    if (frontPosNum) {
      const frontBase = POS_BASE[frontPosNum]
      RECEPTION_START['S'] = { x: frontBase.x, z: R.backSetterBehindZ }
    }
  }

  if (rotKey === 'S1') {
    for (const [id, pos] of Object.entries(R.s1Overrides) as [PlayerId, { x: number; z: number }][]) {
      RECEPTION_START[id] = pos
    }
  }

  const SPECIALIST_POS = {} as Record<PlayerId, { x: number; z: number }>
  const specSlots = sFront ? C.specialistPos.sFront : C.specialistPos.sBack
  applySpecialistPos(
    SPECIALIST_POS,
    specSlots as Record<RoleSlot, { x: number; z: number }>,
    frontOH,
    frontMB,
    backOH,
    backMB,
  )

  if (phase === 0) {
    const T = R.timing
    const B = R.ball
    const P = R.players
    const serveOrigin = B.serveOrigin as { x: number; y: number; z: number }
    const opponentLand = B.opponentLand as { x: number; y: number; z: number }

    const finalPos = SPECIALIST_POS
    const receiverId = backOH || (!opFront ? ('OP' as PlayerId) : null) || backMB
    const receiverStart = receiverId ? RECEPTION_START[receiverId] : R.fallbackReceiver

    const leftFrontId = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 4,
    )
    const spikerId =
      leftFrontId || frontOH || (opFront ? ('OP' as PlayerId) : null) || frontMB
    const spikerStart = spikerId ? RECEPTION_START[spikerId] : R.fallbackSpiker

    const { serveHit, ballToReceiver, ballToSetter, ballSetterHold, ballToToss, spikeHit, ballLands, endTime } = T
    const tossTargetX = spikerStart.x
    const tossTargetZ = R.tossTargetZ

    const ballSeq: BallKeyframe[] = [
      { t: 0.0, ...serveOrigin, arc: 0 },
      { t: serveHit, ...serveOrigin, arc: 0 },
      { t: ballToReceiver, x: receiverStart.x, y: B.receiveY as number, z: receiverStart.z, arc: B.receiveArc as number },
      { t: ballToSetter, x: SETTER_POS.x, y: B.setterY as number, z: SETTER_POS.z, arc: B.setterArc as number },
      { t: ballSetterHold, x: SETTER_POS.x, y: B.setterY as number, z: SETTER_POS.z, arc: 0 },
      { t: ballToToss, x: tossTargetX, y: B.tossY as number, z: tossTargetZ, arc: B.tossArc as number },
      { t: spikeHit, x: tossTargetX, y: B.tossY as number, z: tossTargetZ, arc: 0 },
      { t: ballLands, ...opponentLand, arc: B.opponentLandArc as number },
      { t: endTime, ...opponentLand, arc: 0 },
    ]

    const playerSeqs = {} as Record<PlayerId, PlayerKeyframe[]>
    for (const id of Object.keys(assignment) as PlayerId[]) {
      const startP = RECEPTION_START[id]
      const f = finalPos[id]
      const moveStart = rotKey === 'S1' ? spikeHit : ballLands

      if (id === 'S') {
        playerSeqs[id] = pkf([
          { t: 0.0, x: startP.x, z: startP.z },
          { t: serveHit, x: startP.x, z: startP.z },
          { t: sFront ? P.setterMoveFront : P.setterMoveBack, x: SETTER_POS.x, z: SETTER_POS.z },
          { t: P.setterHold, x: SETTER_POS.x, z: SETTER_POS.z },
          { t: P.setterTossJump, x: SETTER_POS.x, z: SETTER_POS.z, jump: P.setterJump },
          { t: moveStart, x: SETTER_POS.x, z: SETTER_POS.z },
          { t: endTime, x: f.x, z: f.z },
        ])
      } else if (id === spikerId) {
        const spikerMoveStart = rotKey === 'S1' ? spikeHit + P.spikerLandDelay : ballLands
        playerSeqs[id] = pkf([
          { t: 0.0, x: startP.x, z: startP.z },
          { t: serveHit, x: startP.x, z: startP.z },
          { t: P.spikerHold, x: startP.x, z: startP.z },
          { t: P.spikerApproach, x: tossTargetX, z: tossTargetZ + P.spikerApproachZOffset },
          { t: spikeHit, x: tossTargetX, z: tossTargetZ, jump: P.spikerJump },
          { t: spikerMoveStart, x: tossTargetX, z: tossTargetZ },
          { t: endTime, x: f.x, z: f.z },
        ])
      } else if (id === receiverId) {
        playerSeqs[id] = pkf([
          { t: 0.0, x: startP.x, z: startP.z },
          { t: serveHit, x: startP.x, z: startP.z },
          { t: moveStart, x: startP.x, z: startP.z },
          { t: endTime, x: f.x, z: f.z },
        ])
      } else {
        playerSeqs[id] = pkf([
          { t: 0.0, x: startP.x, z: startP.z },
          { t: serveHit, x: startP.x, z: startP.z },
          { t: moveStart, x: startP.x, z: startP.z },
          { t: endTime, x: f.x, z: f.z },
        ])
      }
    }

    return { duration: endTime, ball: ballSeq, players: playerSeqs }
  }

  if (phase === 1) {
    const S = C.serve
    const T = S.timing
    const B = S.ball
    const BT = S.ballTimes
    const P = S.players

    const serverId = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 1,
    )!
    const serverPos = { x: POS_BASE[1].x, z: S.serverZ }
    const finalPos = SPECIALIST_POS
    const { serveHit, ballOver, endTime } = T

    const ballSeq: BallKeyframe[] = [
      { t: 0.0, x: serverPos.x, y: B.holdY, z: serverPos.z, arc: 0 },
      { t: BT.hold, x: serverPos.x, y: B.holdY, z: serverPos.z, arc: 0 },
      { t: BT.tossUp, x: serverPos.x, y: B.tossUpY, z: serverPos.z, arc: 0 },
      { t: serveHit, x: serverPos.x, y: B.hitY, z: serverPos.z, arc: 0 },
      { t: ballOver, x: serverPos.x * B.overNetXFactor, y: B.overNetY, z: B.overNetZ, arc: 0 },
      { t: B.landTime, x: serverPos.x * B.landXFactor, y: B.landY, z: B.landZ, arc: B.landArc },
      { t: endTime, x: serverPos.x * B.landXFactor, y: B.landY, z: B.landZ, arc: 0 },
    ]

    const playerSeqs = {} as Record<PlayerId, PlayerKeyframe[]>
    for (const id of Object.keys(assignment) as PlayerId[]) {
      const b = base[id]
      const f = finalPos[id]
      if (id === serverId) {
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: P.serverMove, x: serverPos.x, z: serverPos.z },
          { t: P.serverToss, x: serverPos.x, z: serverPos.z },
          { t: serveHit, x: serverPos.x, z: serverPos.z, jump: P.serverJump },
          { t: P.serverLand, x: serverPos.x, z: serverPos.z },
          { t: endTime, x: f.x, z: f.z },
        ])
      } else {
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: serveHit, x: b.x, z: b.z },
          { t: endTime, x: f.x, z: f.z },
        ])
      }
    }

    return { duration: endTime, ball: ballSeq, players: playerSeqs }
  }

  if (phase === 2) {
    const D = C.defense
    const T = D.timing
    const B = D.ball
    const P = D.players
    const spikeOrigin = B.spikeOrigin as { x: number; y: number; z: number }
    const spikeApproach = B.spikeApproach as { x: number; y: number; z: number }

    const blocker1Id = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 2,
    )!
    const blocker2Id = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 3,
    )!
    const offBlockId = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 4,
    )!
    const pos1Id = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 1,
    )!
    const pos5Id = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 5,
    )!
    const pos6Id = (Object.keys(assignment) as PlayerId[]).find(
      (id) => assignment[id] === 6,
    )!

    const digPositions: Partial<Record<PlayerId, { x: number; z: number }>> = {
      [pos1Id]: D.digByPosition['1'],
      [pos5Id]: D.digByPosition['5'],
      [pos6Id]: D.digByPosition['6'],
    }
    const ballDigPoint = D.ballDigPoint
    const digReceiverId = pos5Id
    const { end: endTime } = T

    const ballSeq: BallKeyframe[] = [
      { t: 0.0, ...spikeOrigin, arc: 0 },
      { t: T.spikeWindup, ...spikeOrigin, arc: 0 },
      { t: T.spikeHit, ...spikeApproach, arc: 0 },
      { t: T.ballDig, x: ballDigPoint.x, y: B.digY as number, z: ballDigPoint.z, arc: B.digArc as number },
      { t: T.digHold, x: ballDigPoint.x, y: B.digY as number, z: ballDigPoint.z, arc: 0 },
      { t: T.ballToSetter, x: SETTER_POS.x, y: B.setterY as number, z: SETTER_POS.z, arc: B.setterArc as number },
      { t: endTime, x: SETTER_POS.x, y: B.setterY as number, z: SETTER_POS.z, arc: 0 },
    ]

    const playerSeqs = {} as Record<PlayerId, PlayerKeyframe[]>
    for (const id of Object.keys(assignment) as PlayerId[]) {
      const b = base[id]
      if (id === blocker1Id) {
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: P.blocker1Move, x: D.blockPos1.x, z: D.blockPos1.z },
          { t: T.spikeHit, x: D.blockPos1.x, z: D.blockPos1.z, jump: P.blockJump },
          { t: P.blockLand, x: D.blockPos1.x, z: D.blockPos1.z },
          { t: endTime, x: D.blockPos1.x, z: D.blockPos1.z },
        ])
      } else if (id === blocker2Id) {
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: P.blocker2Move, x: D.blockPos2.x, z: D.blockPos2.z },
          { t: T.spikeHit, x: D.blockPos2.x, z: D.blockPos2.z, jump: P.blockJump },
          { t: P.blockLand, x: D.blockPos2.x, z: D.blockPos2.z },
          { t: endTime, x: D.blockPos2.x, z: D.blockPos2.z },
        ])
      } else if (id === offBlockId) {
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: P.offBlockMove, x: D.offBlockPos.x, z: D.offBlockPos.z },
          { t: endTime, x: D.offBlockPos.x, z: D.offBlockPos.z },
        ])
      } else if (id === digReceiverId) {
        const d = digPositions[id]!
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: P.digMove, x: d.x, z: d.z },
          { t: P.digContact, x: ballDigPoint.x, z: ballDigPoint.z },
          { t: T.digHold, x: ballDigPoint.x, z: ballDigPoint.z, jump: P.digJump },
          { t: endTime, x: ballDigPoint.x, z: ballDigPoint.z },
        ])
      } else if (id === 'S' && !sFront) {
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: P.digMove, x: b.x, z: b.z },
          { t: T.digHold, x: b.x, z: b.z },
          { t: P.backSetterMove, x: SETTER_POS.x, z: SETTER_POS.z },
          { t: endTime, x: SETTER_POS.x, z: SETTER_POS.z },
        ])
      } else if (digPositions[id]) {
        const d = digPositions[id]!
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: P.digMove, x: d.x, z: d.z },
          { t: endTime, x: d.x, z: d.z },
        ])
      } else {
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: endTime, x: b.x, z: b.z },
        ])
      }
    }

    return { duration: endTime, ball: ballSeq, players: playerSeqs }
  }

  // phase === 3: 攻撃
  const A = C.attack
  const T = A.timing
  const B = A.ball
  const ap = A.players
  const mbQuick = ap.mbQuickPos as { x: number; z: number }
  const setterJump = ap.setterJump as number
  const spikerReady = ap.spikerReady as number
  const spikerApproach = ap.spikerApproach as number
  const spikerJump = ap.spikerJump as number
  const spikerLandDelay = ap.spikerLandDelay as number
  const spikerApproachZOffset = ap.spikerApproachZOffset as number
  const mbQuickStart = ap.mbQuickStart as number
  const mbQuickLand = ap.mbQuickLand as number
  const mbQuickJump = ap.mbQuickJump as number
  const fakeReady = ap.fakeReady as number
  const fakeApproach = ap.fakeApproach as number
  const fakeJump = ap.fakeJump as number

  const leftFrontId = (Object.keys(assignment) as PlayerId[]).find(
    (id) => assignment[id] === 4,
  )
  const spikerId =
    leftFrontId || frontOH || (opFront ? ('OP' as PlayerId) : null) || frontMB
  const spikerBase = spikerId ? base[spikerId] : A.fallbackSpiker

  const { spikeHit, ballLands, endTime } = T
  const { ballRise, ballHold, ballToToss } = T

  const tossTargetX = spikerBase.x
  const tossTargetZ = Math.max(spikerBase.z - A.tossTargetZOffset, A.tossTargetZMin)
  const finalPos = SPECIALIST_POS

  const ballSeq: BallKeyframe[] = [
    { t: 0.0, x: SETTER_POS.x, y: B.riseY, z: SETTER_POS.z + B.riseZOffset, arc: B.riseArc },
    { t: ballRise, x: SETTER_POS.x, y: B.setterY, z: SETTER_POS.z, arc: 0 },
    { t: ballHold, x: SETTER_POS.x, y: B.setterY, z: SETTER_POS.z, arc: 0 },
    { t: ballToToss, x: tossTargetX, y: B.tossY, z: tossTargetZ, arc: B.tossArc },
    { t: spikeHit, x: tossTargetX, y: B.tossY, z: tossTargetZ, arc: 0 },
    { t: ballLands, x: tossTargetX * B.landXFactor, y: B.landY, z: B.landZ, arc: B.landArc },
    { t: endTime, x: tossTargetX * B.landXFactor, y: B.landY, z: B.landZ, arc: 0 },
  ]

  const playerSeqs = {} as Record<PlayerId, PlayerKeyframe[]>
  for (const id of Object.keys(assignment) as PlayerId[]) {
    const b = base[id]
    const f = finalPos[id]

    if (id === 'S') {
      playerSeqs[id] = pkf([
        { t: 0.0, x: SETTER_POS.x, z: SETTER_POS.z },
        { t: ballRise, x: SETTER_POS.x, z: SETTER_POS.z, jump: setterJump },
        { t: spikeHit, x: SETTER_POS.x, z: SETTER_POS.z },
        { t: ballLands, x: SETTER_POS.x, z: SETTER_POS.z },
        { t: endTime, x: f.x, z: f.z },
      ])
    } else if (id === spikerId) {
      playerSeqs[id] = pkf([
        { t: 0.0, x: b.x, z: b.z },
        { t: spikerReady, x: b.x, z: b.z },
        { t: spikerApproach, x: tossTargetX, z: tossTargetZ + spikerApproachZOffset },
        { t: spikeHit, x: tossTargetX, z: tossTargetZ, jump: spikerJump },
        { t: spikeHit + spikerLandDelay, x: tossTargetX, z: tossTargetZ },
        { t: ballLands, x: tossTargetX, z: tossTargetZ },
        { t: endTime, x: f.x, z: f.z },
      ])
    } else if (frontMB && id === frontMB && spikerId !== frontMB) {
      const mbBase = base[frontMB]
      playerSeqs[id] = pkf([
        { t: 0.0, x: mbBase.x, z: mbBase.z },
        { t: fakeReady, x: mbBase.x, z: mbBase.z },
        { t: mbQuickStart, x: mbQuick.x, z: mbQuick.z, jump: mbQuickJump },
        { t: mbQuickLand, x: mbQuick.x, z: mbQuick.z },
        { t: ballLands, x: mbQuick.x, z: mbQuick.z },
        { t: endTime, x: f.x, z: f.z },
      ])
    } else if (id === 'OP' && opFront && spikerId !== 'OP') {
      const opBase = base['OP']
      const opZ = Math.max(opBase.z - A.fakeApproachZOffset, A.fakeApproachZMin)
      playerSeqs[id] = pkf([
        { t: 0.0, x: opBase.x, z: opBase.z },
        { t: fakeReady, x: opBase.x, z: opBase.z },
        { t: fakeApproach, x: opBase.x, z: opZ },
        { t: spikeHit, x: opBase.x, z: opZ, jump: fakeJump },
        { t: spikeHit + spikerLandDelay, x: opBase.x, z: opZ },
        { t: ballLands, x: opBase.x, z: opZ },
        { t: endTime, x: f.x, z: f.z },
      ])
    } else if (frontOH && id === frontOH && spikerId !== frontOH) {
      const ohBase = base[frontOH]
      const ohZ = Math.max(ohBase.z - A.fakeApproachZOffset, A.fakeApproachZMin)
      playerSeqs[id] = pkf([
        { t: 0.0, x: ohBase.x, z: ohBase.z },
        { t: fakeReady, x: ohBase.x, z: ohBase.z },
        { t: fakeApproach, x: ohBase.x, z: ohZ },
        { t: spikeHit, x: ohBase.x, z: ohZ, jump: fakeJump },
        { t: spikeHit + spikerLandDelay, x: ohBase.x, z: ohZ },
        { t: ballLands, x: ohBase.x, z: ohZ },
        { t: endTime, x: f.x, z: f.z },
      ])
    } else {
      playerSeqs[id] = pkf([
        { t: 0.0, x: b.x, z: b.z },
        { t: ballLands, x: b.x, z: b.z },
        { t: endTime, x: f.x, z: f.z },
      ])
    }
  }

  return { duration: endTime, ball: ballSeq, players: playerSeqs }
}
