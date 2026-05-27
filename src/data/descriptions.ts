/**
 * 全体解説の型定義とヘルパー関数
 * テキストデータは descriptions.json で管理 → DevPanel の解説エディタで編集可能
 */

import rawData from './descriptions.json'

export type RotationKey = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
export type PhaseKey = 'reception' | 'serve' | 'defense' | 'attack'
export type AttackTempoKey = '1st' | '2nd' | '3rd'

export interface RotInfo {
  server: string
  frontRow: string
  backRow: string
  sFront: boolean
  reception: string
  serve: string
  defense: string
  attack: string
}

export interface TempoInfo {
  badge: string
  title: string
  desc: string
}

export interface TelopContent {
  badge: string
  title: string
  desc: string
}

export interface DescriptionsData {
  rotations: Record<RotationKey, RotInfo>
  tempos: Record<AttackTempoKey, TempoInfo>
}

/** JSON から読み込んだ初期データ */
export const DEFAULT_DESCRIPTIONS: DescriptionsData = rawData as DescriptionsData

/** フェーズ × ローテーション から全体解説テロップを生成（ストアのデータを使用） */
export function getOverallDescription(
  data: DescriptionsData,
  phase: PhaseKey,
  rotation: RotationKey,
  tempo: AttackTempoKey,
): TelopContent {
  const info = data.rotations[rotation]
  if (!info) return { badge: '', title: rotation, desc: '' }

  if (phase === 'reception') {
    return {
      badge: '① 相手サーブ時 / レセプション',
      title: `${rotation}: レセプション陣形`,
      desc: info.reception,
    }
  }
  if (phase === 'serve') {
    return {
      badge: '② 自陣サーブ時',
      title: `${rotation}: サーブ陣形 — サーバー: ${info.server}`,
      desc: info.serve,
    }
  }
  if (phase === 'defense') {
    return {
      badge: '③ 被スパイク時 / ブロック＋ディグ',
      title: `${rotation}: ブロック＋ディグ陣形`,
      desc: info.defense,
    }
  }
  // attack
  const tempoInfo = data.tempos[tempo]
  return {
    badge: tempoInfo.badge,
    title: `${rotation}: ${tempoInfo.title}`,
    desc: `${info.attack}\n\n${tempoInfo.desc}`,
  }
}
