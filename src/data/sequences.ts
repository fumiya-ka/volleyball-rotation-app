import { ROTATIONS, type PlayerId } from './rotations'
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

  const getPosBase = (posNum: number) => C.posBase[String(posNum)]

  const base = {} as Record<PlayerId, { x: number; z: number }>
  for (const id of Object.keys(assignment) as PlayerId[]) {
    base[id] = { ...getPosBase(assignment[id]) }
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
  const startByRot = R.byRotation[rotKey]
  for (const id of Object.keys(assignment) as PlayerId[]) {
    RECEPTION_START[id] = { ...startByRot[id] }
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
    const receiverId = (backOH || (!opFront ? ('OP' as PlayerId) : null) || backMB)!
    const receiverStart = RECEPTION_START[receiverId]

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
        // 打点(ボールのインパクト)とスパイカーの「手」を揃える:
        //  - ジャンプの頂点を spikeHit に一致させる（弧を spikeHit 中心に対称化）
        //  - 頂点での手の高さ(足元+HAND_OFFSET)＝ボールのインパクト高(tossY) になるジャンプ量にする
        //    （HAND_OFFSET=2.4 は頭=1.7 より上。手を伸ばして打つ表現。tossY はネット天端2.93より上）
        const HAND_OFFSET = 2.4 // 手を伸ばした打点のローカル高さ（足元から／頭より上）
        const spikerJumpLand = 2 * spikeHit - P.spikerApproach // 頂点が spikeHit に来る着地時刻
        const handAlignedJump = (B.tossY as number) - HAND_OFFSET // 頂点で手(打点)がボールに一致
        playerSeqs[id] = pkf([
          { t: 0.0, x: startP.x, z: startP.z },
          { t: serveHit, x: startP.x, z: startP.z },
          { t: P.spikerHold, x: startP.x, z: startP.z },
          { t: P.spikerApproach, x: tossTargetX, z: tossTargetZ + P.spikerApproachZOffset },
          { t: spikerJumpLand, x: tossTargetX, z: tossTargetZ - P.spikerApproachZOffset, jump: handAlignedJump },
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
    const serverPos = { x: getPosBase(1).x, z: S.serverZ }
    // ローテごとのサーブ初期位置（オーバーラップを崩さず移動を最短化するスタッキング）。
    // 未定義のローテは従来どおり posBase から。
    const serveStart = S.byRotation?.[rotKey]
    // 後衛MB（サーバー以外で後衛のMB）はサーブ後も初期位置に停止させる（移動しない）。
    const staticBackMB = (['MB1', 'MB2'] as PlayerId[]).find(
      (id) => id !== serverId && !isFront(id),
    )
    const finalPos = SPECIALIST_POS
    const { serveHit, endTime } = T

    // サーブのボール軌道を単純なサイン弧2本で表現:
    //  手元で保持 → トス(1区間のサイン弧で頂点→打点) → サーブ飛球(1区間のサイン弧でネット越え→着地)
    const ballSeq: BallKeyframe[] = [
      { t: 0.0, x: serverPos.x, y: B.holdY, z: serverPos.z, arc: 0 },
      { t: BT.hold, x: serverPos.x, y: B.holdY, z: serverPos.z, arc: 0 },
      { t: serveHit, x: serverPos.x, y: B.hitY, z: serverPos.z, arc: B.tossArc },
      { t: B.landTime, x: serverPos.x * B.landXFactor, y: B.landY, z: B.landZ, arc: B.flightArc },
      { t: endTime, x: serverPos.x * B.landXFactor, y: B.landY, z: B.landZ, arc: 0 },
    ]

    const playerSeqs = {} as Record<PlayerId, PlayerKeyframe[]>
    for (const id of Object.keys(assignment) as PlayerId[]) {
      const b = serveStart?.[id] ?? base[id]
      const f = finalPos[id]
      if (id === serverId) {
        // サーバーは最初からボール位置(ライン後方)に立ち、手(打点)をボールに合わせて打つ → コートへ。
        // ジャンプの頂点を serveHit に一致させ、頂点での手の高さ＝インパクト高(hitY)にする。
        const HAND_OFFSET = 2.4
        const serverJumpLand = 2 * serveHit - P.serverToss // 頂点が serveHit に来る着地時刻
        const handAlignedJump = B.hitY - HAND_OFFSET // 頂点で手がインパクト高(hitY)に一致
        // サーバーが後衛MB(S3/S6)の場合は、打った後の位置取りを他ローテの後衛MBと同じく深く(z7.8)
        const serverIsMB = id === 'MB1' || id === 'MB2'
        const serverDest = serverIsMB ? { x: 0, z: 7.8 } : f
        playerSeqs[id] = pkf([
          { t: 0.0, x: serverPos.x, z: serverPos.z },
          { t: P.serverToss, x: serverPos.x, z: serverPos.z },
          { t: serverJumpLand, x: serverPos.x, z: serverPos.z, jump: handAlignedJump },
          { t: endTime, x: serverDest.x, z: serverDest.z },
        ])
      } else if (id === staticBackMB) {
        // 後衛MBはサーブ後も初期位置（深い守備位置）に停止
        playerSeqs[id] = pkf([
          { t: 0.0, x: b.x, z: b.z },
          { t: endTime, x: b.x, z: b.z },
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
    const setOrigin = B.setOrigin as { x: number; y: number; z: number }
    const spikeApproach = B.spikeApproach as { x: number; y: number; z: number }

    // 被スパイク時はローテ番号ではなく「役割」で位置取りする。
    // すでにボールは相手に渡っており、各選手は守備の定位置にスイッチ済みのため。
    // OH=左, MB=中央, S/OP=右（前衛/後衛はそのローテの前後に従う）。
    const frontOHId: PlayerId = isFront('OH1') ? 'OH1' : 'OH2'
    const backOHId: PlayerId = frontOHId === 'OH1' ? 'OH2' : 'OH1'
    const frontMBId: PlayerId = isFront('MB1') ? 'MB1' : 'MB2'
    const backMBId: PlayerId = frontMBId === 'MB1' ? 'MB2' : 'MB1'
    const frontRightId: PlayerId = isFront('S') ? 'S' : 'OP' // 前衛側の S/OP
    const backRightId: PlayerId = frontRightId === 'S' ? 'OP' : 'S' // 後衛側の S/OP

    const db = D.base
    const roleBase: Record<PlayerId, { x: number; z: number }> = {
      [frontOHId]: db.frontOH,
      [frontMBId]: db.frontMB,
      [frontRightId]: db.frontRight,
      [backOHId]: db.backOH,
      [backMBId]: db.backMB,
      [backRightId]: db.backRight,
    } as Record<PlayerId, { x: number; z: number }>

    const ballDigPoint = D.ballDigPoint
    const digReceiverId = backOHId // クロスの打球は左後ろの OH が処理
    const { end: endTime } = T

    // ボールは止めず連続的に動かす（保持＝反則のため）。
    // 余分な折れを排し、各区間を単純なサインカーブ（1区間＝1つの弧）にする:
    //  相手セット↑(1本) → スパイク↓(ブロックが当たる単純なサイン弧) → ディグ↑ → セッター
    const ballSeq: BallKeyframe[] = [
      { t: 0.0, ...setOrigin, arc: 0 },
      { t: T.spikeHit, ...spikeApproach, arc: B.setArc as number },
      { t: T.ballDig, x: ballDigPoint.x, y: B.digY as number, z: ballDigPoint.z, arc: B.digArc as number },
      { t: T.ballToSetter, x: SETTER_POS.x, y: B.setterY as number, z: SETTER_POS.z, arc: B.setterArc as number },
      { t: endTime, x: SETTER_POS.x, y: B.setterY as number, z: SETTER_POS.z, arc: 0 },
    ]

    const playerSeqs = {} as Record<PlayerId, PlayerKeyframe[]>
    for (const id of Object.keys(assignment) as PlayerId[]) {
      const rb = roleBase[id]
      if (id === frontRightId) {
        // 右ブロッカー（相手アウトサイドをブロック）。
        // 前衛セッターならブロック後にトスへ、アタッカー(OP)なら着地後アタックライン際へ下がって攻撃準備
        // ブロック→着地→(ディグまで保持)→ digHold で一斉にトランジション開始 → attackReady で同時到達
        if (id === 'S') {
          playerSeqs[id] = pkf([
            { t: 0.0, x: rb.x, z: rb.z },
            { t: P.blocker1Move, x: D.blockPos1.x, z: D.blockPos1.z },
            { t: P.blockTakeoff, x: D.blockPos1.x, z: D.blockPos1.z },
            { t: P.blockJumpLand, x: D.blockPos1.x, z: D.blockPos1.z, jump: P.blockJump },
            { t: T.digHold, x: D.blockPos1.x, z: D.blockPos1.z },
            { t: T.attackReady, x: SETTER_POS.x, z: SETTER_POS.z },
            { t: endTime, x: SETTER_POS.x, z: SETTER_POS.z },
          ])
        } else {
          const ap = D.attackPrep.frontRight
          playerSeqs[id] = pkf([
            { t: 0.0, x: rb.x, z: rb.z },
            { t: P.blocker1Move, x: D.blockPos1.x, z: D.blockPos1.z },
            { t: P.blockTakeoff, x: D.blockPos1.x, z: D.blockPos1.z },
            { t: P.blockJumpLand, x: D.blockPos1.x, z: D.blockPos1.z, jump: P.blockJump },
            { t: T.digHold, x: D.blockPos1.x, z: D.blockPos1.z },
            { t: T.attackReady, x: ap.x, z: ap.z },
            { t: endTime, x: ap.x, z: ap.z },
          ])
        }
      } else if (id === frontMBId) {
        // ミドルブロッカー（中央→右へ寄せて2枚で締める）。digHold で一斉スタート → attackReady でアタックライン際へ
        const ap = D.attackPrep.frontMB
        playerSeqs[id] = pkf([
          { t: 0.0, x: rb.x, z: rb.z },
          { t: P.blocker2Move, x: D.blockPos2.x, z: D.blockPos2.z },
          { t: P.blockTakeoff, x: D.blockPos2.x, z: D.blockPos2.z },
          { t: P.blockJumpLand, x: D.blockPos2.x, z: D.blockPos2.z, jump: P.blockJump },
          { t: T.digHold, x: D.blockPos2.x, z: D.blockPos2.z },
          { t: T.attackReady, x: ap.x, z: ap.z },
          { t: endTime, x: ap.x, z: ap.z },
        ])
      } else if (id === frontOHId) {
        // オフブロッカー（左前→ネットから離れてコート内をカバー）
        playerSeqs[id] = pkf([
          { t: 0.0, x: rb.x, z: rb.z },
          { t: P.offBlockMove, x: D.offBlockPos.x, z: D.offBlockPos.z },
          { t: endTime, x: D.offBlockPos.x, z: D.offBlockPos.z },
        ])
      } else if (id === digReceiverId) {
        // 左後ろ＝クロスに飛んだ打球をディグ
        playerSeqs[id] = pkf([
          { t: 0.0, x: rb.x, z: rb.z },
          { t: P.digMove, x: rb.x, z: rb.z },
          { t: P.digContact, x: ballDigPoint.x, z: ballDigPoint.z },
          { t: T.digHold, x: ballDigPoint.x, z: ballDigPoint.z, jump: P.digJump },
          { t: endTime, x: ballDigPoint.x, z: ballDigPoint.z },
        ])
      } else if (id === backRightId && id === 'S') {
        // 後衛セッターは右後ろで守り、ディグ後にネットへ入って速攻に備える
        // （ブロッカー2枚のアタックライン後退と同じ digHold→attackReady で同時に動く）
        playerSeqs[id] = pkf([
          { t: 0.0, x: rb.x, z: rb.z },
          { t: T.digHold, x: rb.x, z: rb.z },
          { t: T.attackReady, x: SETTER_POS.x, z: SETTER_POS.z },
          { t: endTime, x: SETTER_POS.x, z: SETTER_POS.z },
        ])
      } else {
        // 中後ろ／右後ろ等は役割ベースの定位置で待機
        playerSeqs[id] = pkf([
          { t: 0.0, x: rb.x, z: rb.z },
          { t: endTime, x: rb.x, z: rb.z },
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
  const spikerLandDelay = ap.spikerLandDelay as number
  const spikerApproachZOffset = ap.spikerApproachZOffset as number
  const mbApproach = ap.mbApproach as number
  const mbQuickStart = ap.mbQuickStart as number
  const mbQuickLand = ap.mbQuickLand as number
  const mbQuickJump = ap.mbQuickJump as number
  const fakeReady = ap.fakeReady as number
  const fakeApproach = ap.fakeApproach as number
  const fakeJump = ap.fakeJump as number

  // 攻撃時もローテ番号ではなく「役割」で位置取り（OH=左 / MB=中央 / S・OP=右、前衛後衛はそのローテの前後）
  const frontOHId: PlayerId = isFront('OH1') ? 'OH1' : 'OH2'
  const backOHId: PlayerId = frontOHId === 'OH1' ? 'OH2' : 'OH1'
  const frontMBId: PlayerId = isFront('MB1') ? 'MB1' : 'MB2'
  const backMBId: PlayerId = frontMBId === 'MB1' ? 'MB2' : 'MB1'
  const frontRightId: PlayerId = isFront('S') ? 'S' : 'OP' // 前衛側の S/OP
  const backRightId: PlayerId = frontRightId === 'S' ? 'OP' : 'S' // 後衛側の S/OP

  const ab = A.base
  const roleBase: Record<PlayerId, { x: number; z: number }> = {
    [frontOHId]: ab.frontOH,
    [frontMBId]: ab.frontMB,
    [frontRightId]: ab.frontRight,
    [backOHId]: ab.backOH,
    [backMBId]: ab.backMB,
    [backRightId]: ab.backRight,
  } as Record<PlayerId, { x: number; z: number }>

  const { spikeHit, ballLands, endTime } = T
  const { ballRise, ballHold, ballToToss } = T

  // 左サイド(OH)へ上げる
  const tossTargetX = A.tossTarget.x
  const tossTargetZ = A.tossTarget.z

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
    const rb = roleBase[id]

    if (id === 'S') {
      // セッターはネット際でトス → 役割定位置へ戻る
      playerSeqs[id] = pkf([
        { t: 0.0, x: SETTER_POS.x, z: SETTER_POS.z },
        { t: ballRise, x: SETTER_POS.x, z: SETTER_POS.z, jump: setterJump },
        { t: spikeHit, x: SETTER_POS.x, z: SETTER_POS.z },
        { t: ballLands, x: SETTER_POS.x, z: SETTER_POS.z },
        { t: endTime, x: rb.x, z: rb.z },
      ])
    } else if (id === frontOHId) {
      // 前衛OH＝左からスパイク。打点(ボール)とスパイカーの手を揃える（頂点=spikeHit、手=tossY、ネット上）
      const HAND_OFFSET = 2.4
      const spikerJumpLand = 2 * spikeHit - spikerApproach // 頂点が spikeHit に来る着地時刻
      const handAlignedJump = B.tossY - HAND_OFFSET // 頂点で手がボールに一致
      playerSeqs[id] = pkf([
        { t: 0.0, x: rb.x, z: rb.z },
        { t: spikerReady, x: rb.x, z: rb.z },
        { t: spikerApproach, x: tossTargetX, z: tossTargetZ + spikerApproachZOffset },
        { t: spikerJumpLand, x: tossTargetX, z: tossTargetZ - spikerApproachZOffset, jump: handAlignedJump },
        { t: ballLands, x: tossTargetX, z: tossTargetZ },
        { t: endTime, x: rb.x, z: rb.z },
      ])
    } else if (id === frontMBId) {
      // 前衛MB＝中央でクイック。助走（前方移動）→ ほぼ垂直ジャンプ に分離（前飛びを防ぐ）
      playerSeqs[id] = pkf([
        { t: 0.0, x: rb.x, z: rb.z },
        { t: fakeReady, x: rb.x, z: rb.z },
        { t: mbApproach, x: mbQuick.x, z: mbQuick.z + spikerApproachZOffset },
        { t: mbQuickStart, x: mbQuick.x, z: mbQuick.z, jump: mbQuickJump },
        { t: mbQuickLand, x: mbQuick.x, z: mbQuick.z },
        { t: ballLands, x: mbQuick.x, z: mbQuick.z },
        { t: endTime, x: rb.x, z: rb.z },
      ])
    } else if (id === frontRightId) {
      // 前衛の S/OP（=OP）＝右から攻撃助走（おとり）。Sが前衛のときは上の id==='S' で処理済み
      const ra = A.rightAttack
      playerSeqs[id] = pkf([
        { t: 0.0, x: rb.x, z: rb.z },
        { t: fakeReady, x: rb.x, z: rb.z },
        { t: fakeApproach, x: ra.x, z: ra.z },
        { t: spikeHit, x: ra.x, z: ra.z, jump: fakeJump },
        { t: spikeHit + spikerLandDelay, x: ra.x, z: ra.z },
        { t: ballLands, x: ra.x, z: ra.z },
        { t: endTime, x: rb.x, z: rb.z },
      ])
    } else {
      // 後衛（OH/MB/OP）は役割ベースの定位置でカバー
      playerSeqs[id] = pkf([
        { t: 0.0, x: rb.x, z: rb.z },
        { t: ballLands, x: rb.x, z: rb.z },
        { t: endTime, x: rb.x, z: rb.z },
      ])
    }
  }

  return { duration: endTime, ball: ballSeq, players: playerSeqs }
}
