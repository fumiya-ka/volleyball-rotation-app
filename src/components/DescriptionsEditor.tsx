/**
 * 解説テキストエディタ（DevPanel内で使用）
 * descriptions.json / playerDescriptions.json をインメモリ編集 → Download JSON で書き出し
 */

import { useState, useCallback } from 'react'
import {
  useDescriptionsStore,
  downloadOverallJson,
  downloadPlayersJson,
} from '../store/descriptionsStore'
import type { RotationKey, PhaseKey } from '../data/descriptions'
import type { PlayerId } from '../data/rotations'

const ROTATIONS: RotationKey[] = ['S1', 'S6', 'S5', 'S4', 'S3', 'S2']
const PHASES: { key: PhaseKey; label: string }[] = [
  { key: 'reception', label: '① 相手サーブ' },
  { key: 'serve',     label: '② 自陣サーブ' },
  { key: 'defense',   label: '③ 被スパイク' },
  { key: 'attack',    label: '④ 攻撃' },
]
const PLAYERS: PlayerId[] = ['S', 'OP', 'OH1', 'OH2', 'MB1', 'MB2']

// ────────────────────────────────────────────
// 全体解説エディタ
// ────────────────────────────────────────────
function OverallEditor() {
  const [rotation, setRotation] = useState<RotationKey>('S1')
  const [phase, setPhase] = useState<PhaseKey>('reception')
  const { overall, setOverallText, setOverallMeta, setTempoText, resetOverall } = useDescriptionsStore()

  const rotInfo = overall.rotations[rotation]
  const phaseText = rotInfo[phase]

  return (
    <div className="space-y-3 p-3">
      {/* セレクタ */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={rotation}
          onChange={(e) => setRotation(e.target.value as RotationKey)}
          className="font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1 focus:border-[#ff5436] focus:outline-none"
        >
          {ROTATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value as PhaseKey)}
          className="font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1 focus:border-[#ff5436] focus:outline-none"
        >
          {PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {/* サーバー/前衛/後衛フィールド（serveフェーズのみ表示） */}
      {phase === 'serve' && (
        <div className="space-y-1.5">
          {(['server', 'frontRow', 'backRow'] as const).map((field) => (
            <div key={field}>
              <label className="font-mono text-[9px] text-[#6b7280] block mb-0.5">
                {field === 'server' ? 'サーバー' : field === 'frontRow' ? '前衛3人' : '後衛3人'}
              </label>
              <input
                type="text"
                value={rotInfo[field] as string}
                onChange={(e) => setOverallMeta(rotation, field, e.target.value)}
                className="w-full font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1 focus:border-[#ff5436] focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* メイン解説テキスト */}
      <div>
        <label className="font-mono text-[9px] text-[#6b7280] block mb-0.5">
          解説テキスト — {rotation} / {PHASES.find(p => p.key === phase)?.label}
        </label>
        <textarea
          value={phaseText}
          onChange={(e) => setOverallText(rotation, phase, e.target.value)}
          rows={5}
          className="w-full font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1.5 focus:border-[#ff5436] focus:outline-none resize-y leading-relaxed"
          placeholder="解説テキストを入力..."
        />
      </div>

      {/* 攻撃テンポ解説 */}
      {phase === 'attack' && (
        <div className="border-t border-[#1e2840] pt-3 space-y-2">
          <p className="font-mono text-[9px] text-[#6b7280]">攻撃テンポ解説（全ローテーション共通）</p>
          {(['1st', '2nd', '3rd'] as const).map((tempo) => (
            <div key={tempo} className="space-y-1">
              <p className="font-mono text-[9px] text-[#ff5436]">{tempo} テンポ</p>
              <textarea
                value={overall.tempos[tempo].desc}
                onChange={(e) => setTempoText(tempo, 'desc', e.target.value)}
                rows={3}
                className="w-full font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1.5 focus:border-[#ff5436] focus:outline-none resize-y leading-relaxed"
              />
            </div>
          ))}
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(overall, null, 2))}
          className="flex-1 font-mono text-[10px] py-1.5 bg-[#1a2035] border border-[#2d3340] text-[#c9cdd4] hover:border-[#ff5436] hover:text-white transition-colors"
        >
          Copy JSON
        </button>
        <button
          onClick={() => downloadOverallJson(overall)}
          className="flex-1 font-mono text-[10px] py-1.5 bg-[#ff5436] text-[#0a0e1a] font-bold hover:bg-[#ff6b52] transition-colors"
        >
          Download
        </button>
      </div>
      <button
        onClick={() => { if (confirm('全体解説をリセットしますか？')) resetOverall() }}
        className="w-full font-mono text-[10px] py-1 border border-[#2d3340] text-[#4b5563] hover:border-[#6b7280] hover:text-[#8892a4] transition-colors"
      >
        Reset to default
      </button>
      <p className="font-mono text-[9px] text-[#4b5563] leading-relaxed">
        Download → <code className="text-[#8892a4]">src/data/descriptions.json</code> に上書き保存
      </p>
    </div>
  )
}

// ────────────────────────────────────────────
// 個人別解説エディタ
// ────────────────────────────────────────────
function PlayerEditor() {
  const [rotation, setRotation] = useState<RotationKey>('S1')
  const [phase, setPhase] = useState<PhaseKey>('reception')
  const [playerId, setPlayerId] = useState<PlayerId>('S')
  const { players, setPlayerText, resetPlayers } = useDescriptionsStore()

  const desc = players[rotation]?.[phase]?.[playerId]

  return (
    <div className="space-y-3 p-3">
      {/* セレクタ */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={rotation}
          onChange={(e) => setRotation(e.target.value as RotationKey)}
          className="font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1 focus:border-[#ff5436] focus:outline-none"
        >
          {ROTATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value as PhaseKey)}
          className="font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1 focus:border-[#ff5436] focus:outline-none"
        >
          {PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value as PlayerId)}
          className="font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1 focus:border-[#ff5436] focus:outline-none"
        >
          {PLAYERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {desc ? (
        <>
          {/* ポジション */}
          <div>
            <label className="font-mono text-[9px] text-[#6b7280] block mb-0.5">
              ポジション（例: 右後衛 Pos1）
            </label>
            <input
              type="text"
              value={desc.position}
              onChange={(e) => setPlayerText(rotation, phase, playerId, 'position', e.target.value)}
              className="w-full font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1 focus:border-[#ff5436] focus:outline-none"
            />
          </div>
          {/* 解説アクション */}
          <div>
            <label className="font-mono text-[9px] text-[#6b7280] block mb-0.5">
              役割・動き — {playerId} / {rotation} / {PHASES.find(p => p.key === phase)?.label}
            </label>
            <textarea
              value={desc.action}
              onChange={(e) => setPlayerText(rotation, phase, playerId, 'action', e.target.value)}
              rows={5}
              className="w-full font-mono text-[10px] bg-[#0d1424] border border-[#2d3340] text-[#c9cdd4] px-2 py-1.5 focus:border-[#ff5436] focus:outline-none resize-y leading-relaxed"
              placeholder="役割・動きを入力..."
            />
          </div>
        </>
      ) : (
        <p className="font-mono text-[10px] text-[#4b5563]">データが見つかりません</p>
      )}

      {/* ボタン */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(players, null, 2))}
          className="flex-1 font-mono text-[10px] py-1.5 bg-[#1a2035] border border-[#2d3340] text-[#c9cdd4] hover:border-[#ff5436] hover:text-white transition-colors"
        >
          Copy JSON
        </button>
        <button
          onClick={() => downloadPlayersJson(players)}
          className="flex-1 font-mono text-[10px] py-1.5 bg-[#ff5436] text-[#0a0e1a] font-bold hover:bg-[#ff6b52] transition-colors"
        >
          Download
        </button>
      </div>
      <button
        onClick={() => { if (confirm('個人別解説をリセットしますか？')) resetPlayers() }}
        className="w-full font-mono text-[10px] py-1 border border-[#2d3340] text-[#4b5563] hover:border-[#6b7280] hover:text-[#8892a4] transition-colors"
      >
        Reset to default
      </button>
      <p className="font-mono text-[9px] text-[#4b5563] leading-relaxed">
        Download → <code className="text-[#8892a4]">src/data/playerDescriptions.json</code> に上書き保存
      </p>
    </div>
  )
}

// ────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────
export default function DescriptionsEditor() {
  const [subTab, setSubTab] = useState<'overall' | 'player'>('overall')
  const isDirty = useDescriptionsStore((s) => s.isDirty)

  return (
    <div className="flex flex-col h-full">
      {/* サブタブ */}
      <div className="flex border-b border-[#1e2840] flex-shrink-0">
        {([
          { key: 'overall', label: '全体解説' },
          { key: 'player',  label: '個人別解説' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 font-mono text-[10px] py-2 transition-colors ${
              subTab === key
                ? 'bg-[#1a2035] text-[#ff5436] border-b border-[#ff5436]'
                : 'text-[#4b5563] hover:text-[#8892a4]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isDirty && (
        <div className="px-3 py-1 bg-[#1a2035] border-b border-[#1e2840]">
          <span className="font-mono text-[9px] text-[#fbbf24]">● 未保存の変更あり — Download で JSON を書き出してください</span>
        </div>
      )}

      {/* コンテンツ（スクロール可） */}
      <div className="flex-1 overflow-y-auto">
        {subTab === 'overall' ? <OverallEditor /> : <PlayerEditor />}
      </div>
    </div>
  )
}
