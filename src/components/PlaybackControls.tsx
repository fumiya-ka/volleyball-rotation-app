import { useCallback, useRef, useState } from 'react'
import { useSceneStore } from '../store/sceneStore'

const SPEEDS = [0.5, 1, 1.5, 2] as const

export default function PlaybackControls() {
  const { time, duration, playing, playbackSpeed, setTime, setPlaying, setPlaybackSpeed } =
    useSceneStore()
  const [scrubbing, setScrubbing] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const wasPlaying = useRef(false)

  const progress = duration > 0 ? ((time % duration) / duration) * 100 : 0
  const displayTime = duration > 0 ? time % duration : 0

  const scrubTo = useCallback(
    (clientX: number) => {
      const bar = barRef.current
      if (!bar || duration <= 0) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      setTime(duration * ratio)
    },
    [duration, setTime],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setScrubbing(true)
    wasPlaying.current = playing
    if (playing) setPlaying(false)
    barRef.current?.setPointerCapture(e.pointerId)
    scrubTo(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (scrubbing) scrubTo(e.clientX)
  }

  const endScrub = () => {
    if (!scrubbing) return
    setScrubbing(false)
    if (wasPlaying.current) setPlaying(true)
  }

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(playbackSpeed as (typeof SPEEDS)[number])
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setPlaybackSpeed(next)
  }

  return (
    <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 sm:gap-3 w-[min(520px,94vw)]">
      <div className="flex items-center gap-2 sm:gap-2.5 w-full px-1">
        <span className="font-mono text-[16.5px] sm:text-[18px] text-[#c9cdd4] tracking-wider min-w-[57px] sm:min-w-[66px] text-center tabular-nums">
          {displayTime.toFixed(2)}s
        </span>
        <div
          ref={barRef}
          className="flex-1 relative h-7 cursor-pointer touch-none select-none flex items-center"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-white/15 rounded-full" />
          <div
            className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#ff5436] rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-[#ff5436] shadow-[0_0_8px_rgba(255,84,54,0.6)] pointer-events-none"
            style={{ left: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-[16.5px] sm:text-[18px] text-[#c9cdd4] tracking-wider min-w-[57px] sm:min-w-[66px] text-center tabular-nums">
          {duration.toFixed(2)}s
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 bg-[#0a0e1a]/88 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5">
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          className="px-[18px] py-[9px] sm:px-[21px] sm:py-3 border border-[#2d3340] font-mono text-[16.5px] sm:text-[18px] tracking-widest uppercase text-[#f0f0f0] hover:border-[#ff5436] hover:text-[#ff5436] transition-colors active:border-[#ff5436] active:text-[#ff5436]"
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-[18px] py-[9px] sm:px-[21px] sm:py-3 border border-[#2d3340] font-mono text-[16.5px] sm:text-[18px] tracking-widest text-[#f0f0f0] hover:border-[#ff5436] hover:text-[#ff5436] transition-colors active:border-[#ff5436] active:text-[#ff5436]"
        >
          {playbackSpeed}x
        </button>
      </div>
    </div>
  )
}
