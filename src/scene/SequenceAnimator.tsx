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
    const seq = seqRef.current
    if (!seq) return

    let t = useSceneStore.getState().time
    if (playing) {
      t += delta * playbackSpeed
      useSceneStore.getState().setTime(t)
    }

    const state = sampleSequence(seq, t)
    useSceneStore.getState().applySampled(state.ball, state.players)
  })

  return null
}
