import { create } from 'zustand'
import rawJson from '../data/sequenceConstants.json'
import type { SequenceConstants } from '../data/sequenceConstants'

interface ConstantsState {
  constants: SequenceConstants
  isDirty: boolean
  setConstants: (c: SequenceConstants) => void
  updatePath: (path: string, value: number) => void
  reset: () => void
}

/** パス文字列 "a.b.c" でネストしたオブジェクトの値を取得 */
export function getByPath(obj: unknown, path: string): number {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj) as number
}

/** パス文字列 "a.b.c" でネストしたオブジェクトをイミュータブルに更新 */
function setByPath(obj: unknown, path: string, value: number): unknown {
  const keys = path.split('.')
  if (keys.length === 1) {
    return { ...(obj as object), [keys[0]]: value }
  }
  const [head, ...rest] = keys
  const child = (obj as Record<string, unknown>)[head]
  return {
    ...(obj as object),
    [head]: setByPath(child, rest.join('.'), value),
  }
}

const initialConstants = rawJson as SequenceConstants

export const useConstantsStore = create<ConstantsState>((set) => ({
  constants: initialConstants,
  isDirty: false,

  setConstants: (constants) => set({ constants, isDirty: true }),

  updatePath: (path, value) =>
    set((state) => ({
      constants: setByPath(state.constants, path, value) as SequenceConstants,
      isDirty: true,
    })),

  reset: () => set({ constants: initialConstants, isDirty: false }),
}))
