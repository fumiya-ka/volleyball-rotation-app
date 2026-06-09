/**
 * UI 状態ストア（オンボーディングなど 3Dシーンに依存しない画面状態）
 */

import { create } from 'zustand'

const ONBOARDED_KEY = 'vb-onboarded'

/** 初回訪問かどうかを localStorage から判定 */
function readHasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

interface UiState {
  /** オンボーディング表示中か */
  onboardingOpen: boolean
  /** オンボーディングを開く（ヘルプボタン用） */
  openOnboarding: () => void
  /** オンボーディングを閉じて既訪問を記録 */
  closeOnboarding: () => void
}

export const useUiStore = create<UiState>((set) => ({
  // 初回訪問時のみ自動表示
  onboardingOpen: !readHasOnboarded(),
  openOnboarding: () => set({ onboardingOpen: true }),
  closeOnboarding: () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // localStorage 不可環境でも動作継続
    }
    set({ onboardingOpen: false })
  },
}))
