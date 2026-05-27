/**
 * DEVモード専用 ドラッグコントローラー
 * Canvas内に配置。選手/ボールのpointerDown後、window経由でポインター追跡して位置を更新する。
 */

import { useEffect, useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../store/sceneStore'
import type { PlayerId } from '../data/rotations'

// ファイル先頭で store にアクセスできるよう直接インポート（コンポーネント外で使用）

export default function DragController() {
  const { camera, gl } = useThree()
  const setPlayerPos = useSceneStore((s) => s.setPlayerPos)
  const setBallPos = useSceneStore((s) => s.setBallPos)
  const setDraggedId = useSceneStore((s) => s.setDraggedId)
  const setPositionOverride = useSceneStore((s) => s.setPositionOverride)

  const draggedIdRef = useRef<PlayerId | 'ball' | null>(null)
  const dragPlaneY = useRef(0)
  const raycaster = useRef(new THREE.Raycaster())
  const dragPlane = useRef(new THREE.Plane())
  const intersection = useRef(new THREE.Vector3())

  /** スクリーン座標 → ドラッグ平面上のワールド座標 */
  const getWorldPos = useCallback(
    (clientX: number, clientY: number): THREE.Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      return raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current)
        ? intersection.current.clone()
        : null
    },
    [camera, gl],
  )

  /** ドラッグ開始を外部（Player/Ball）から呼ぶ */
  const startDrag = useCallback(
    (id: PlayerId | 'ball', planeY: number) => {
      draggedIdRef.current = id
      dragPlaneY.current = planeY
      // 水平ドラッグ平面を設定
      dragPlane.current.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, planeY, 0),
      )
    },
    [],
  )

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const id = draggedIdRef.current
      if (!id) return
      const pos = getWorldPos(e.clientX, e.clientY)
      if (!pos) return
      if (id === 'ball') {
        setBallPos({ x: pos.x, y: dragPlaneY.current, z: pos.z })
      } else {
        setPlayerPos(id, { x: pos.x, y: 0, z: pos.z })
      }
    }

    const handleUp = () => {
      const id = draggedIdRef.current
      if (!id) return

      // ドロップ時点の位置をオーバーライドとして保存
      const state = useSceneStore.getState()
      const finalPos = id === 'ball' ? state.ballPos : state.playerPos[id]
      if (finalPos) setPositionOverride(id, finalPos)

      draggedIdRef.current = null
      setDraggedId(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [getWorldPos, setPlayerPos, setBallPos, setDraggedId])

  // startDrag を window に公開（Player/Ball から参照）
  useEffect(() => {
    ;(window as Window & { __dragController?: typeof startDrag }).__dragController = startDrag
    return () => {
      delete (window as Window & { __dragController?: typeof startDrag }).__dragController
    }
  }, [startDrag])

  return null
}

/** Player/Ball から呼ぶドラッグ開始ヘルパー */
export function triggerDrag(
  id: PlayerId | 'ball',
  planeY: number,
  setDraggedId: (id: PlayerId | 'ball' | null) => void,
) {
  // ドラッグ開始時に自動ポーズ（再生中でも位置調整できるよう）
  useSceneStore.getState().setPlaying(false)
  setDraggedId(id)
  const ctrl = (window as Window & { __dragController?: (id: PlayerId | 'ball', y: number) => void }).__dragController
  ctrl?.(id, planeY)
}
