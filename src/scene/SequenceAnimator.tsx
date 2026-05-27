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
  const constants = useConstantsStore((s) => s.constants)

  const seqRef = useRef<Sequence | null>(null)

  useEffect(() => {
    const seq = buildSequence(rotation, phaseToIndex(phase), constants)
    seqRef.current = seq
    useSceneStore.getState().setDuration(seq.duration)
    const state = sampleSequence(seq, 0)
    useSceneStore.getState().applySampled(state.ball, state.players)
    useSceneStore.getState().setTime(0)
  }, [phase, rotation, constants])

  useFrame((_, delta) => {
    // DEVドラッグ中はアニメーターによる位置上書きをスキップ
    if (useSceneStore.getState().draggedId !== null) return

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
