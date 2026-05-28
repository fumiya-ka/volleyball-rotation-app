import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { buildSequence, phaseToIndex, sampleSequence } from '../data/sequences'
import { useSceneStore } from '../store/sceneStore'
import { useConstantsStore } from '../store/constantsStore'
import type { Sequence } from '../data/sequences'

export default function SequenceAnimator() {
  const phase = useSceneStore((s) => s.phase)
  const rotation = useSceneStore((s) => s.rotation)
  const playing = useSceneStore((s) => s.playing)
  const playbackSpeed = useSceneStore((s) => s.playbackSpeed)

  const seqRef = useRef<Sequence | null>(null)
  // useEffect では phase/rotation 変化を、useFrame では constants 変化をそれぞれ検出する
  const lastConstantsRef = useRef(useConstantsStore.getState().constants)

  useEffect(() => {
    const constants = useConstantsStore.getState().constants
    const seq = buildSequence(rotation, phaseToIndex(phase), constants)
    seqRef.current = seq
    lastConstantsRef.current = constants
    useSceneStore.getState().setDuration(seq.duration)
    const state = sampleSequence(seq, 0)
    useSceneStore.getState().applySampled(state.ball, state.players)
    useSceneStore.getState().setTime(0)
  }, [phase, rotation])

  useFrame((_, delta) => {
    // DEVドラッグ中はアニメーターによる位置上書きをスキップ
    if (useSceneStore.getState().draggedId !== null) return

    // constants が変わっていたら useFrame 内で即座に再ビルド（DEVパネルのリアルタイム反映）
    const currentConstants = useConstantsStore.getState().constants
    if (currentConstants !== lastConstantsRef.current) {
      const { phase: p, rotation: r } = useSceneStore.getState()
      const seq = buildSequence(r, phaseToIndex(p), currentConstants)
      seqRef.current = seq
      lastConstantsRef.current = currentConstants
      useSceneStore.getState().setDuration(seq.duration)
    }

    const seq = seqRef.current
    if (!seq) return

    let t = useSceneStore.getState().time
    if (playing) {
      t += delta * playbackSpeed
      useSceneStore.getState().setTime(t)
    }

    const state = sampleSequence(seq, t)
    const { positionOverrides } = useSceneStore.getState()

    // オーバーライドは再生中・ポーズ中ともに適用
    const ball = positionOverrides['ball'] ?? state.ball
    const players = { ...state.players }
    for (const [key, pos] of Object.entries(positionOverrides)) {
      if (key !== 'ball' && pos) players[key as keyof typeof players] = pos
    }
    useSceneStore.getState().applySampled(ball, players)
  })

  return null
}
