"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Info } from "lucide-react"
import CaseDocketDrawer from "@/components/shell/CaseDocketDrawer"

interface Dataset {
  id: string
  name: string
  governance_status: string
  business_criticality: string
}

interface Case {
  id: string
  issue_type: string
  status: string
  dataset_id: string
  genlayer_governance_verdicts: { verdict: string }[] | { verdict: string } | null
}

function getVerdict(raw: Case["genlayer_governance_verdicts"]): string | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0]?.verdict ?? null
  return raw.verdict ?? null
}

interface Props {
  datasets: Dataset[]
  cases: Case[]
}

const DATASET_COLOR: Record<string, string> = {
  active: "var(--data-steel)",
  quarantined: "var(--quarantine-red)",
  approved: "var(--governance-green)",
}

const CASE_COLOR: Record<string, string> = {
  draft: "var(--dormant-slate)",
  evidence_attached: "var(--metadata-grey)",
  submitted_to_genlayer: "var(--consensus-violet)",
  pending_consensus: "var(--consensus-violet)",
  verdict_received: "var(--governance-green)",
  closed: "var(--governance-green)",
}

export default function GovernanceGraph({ datasets, cases }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [docketCaseId, setDocketCaseId] = useState<string | null>(null)

  if (datasets.length === 0 && cases.length === 0) {
    return <EmptyGraph />
  }

  // Layout: datasets as column 1, cases as column 2
  const COLS = { dataset: 120, case: 460, verdict: 720 }
  const ROW_H = 90
  const CARD_W = 180
  const CARD_H = 64

  const datasetPositions = datasets.map((d, i) => ({
    ...d,
    x: COLS.dataset,
    y: 60 + i * ROW_H,
  }))

  const casePositions = cases.map((c, i) => ({
    ...c,
    x: COLS.case,
    y: 60 + i * ROW_H,
  }))

  const svgH = Math.max(
    datasets.length * ROW_H + 100,
    cases.length * ROW_H + 100,
    400
  )

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "auto", background: "var(--ledger-mist)" }}>
      {/* Legend */}
      <div style={{ position: "absolute", top: 16, right: 20, zIndex: 10 }}>
        <GraphLegend />
      </div>

      <svg
        width="100%"
        height={svgH}
        style={{ display: "block", minWidth: 900, padding: "0 40px" }}
      >
        {/* Edges: dataset → case */}
        {casePositions.map((c) => {
          const ds = datasetPositions.find((d) => d.id === c.dataset_id)
          if (!ds) return null
          const x1 = ds.x + CARD_W
          const y1 = ds.y + CARD_H / 2
          const x2 = c.x
          const y2 = c.y + CARD_H / 2
          const mx = (x1 + x2) / 2
          return (
            <path
              key={c.id}
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="var(--schema-line)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )
        })}

        {/* Edges: case → verdict (if exists) */}
        {casePositions
          .filter((c) => getVerdict(c.genlayer_governance_verdicts) !== null)
          .map((c) => {
            const x1 = c.x + CARD_W
            const y1 = c.y + CARD_H / 2
            const x2 = COLS.verdict
            const y2 = c.y + CARD_H / 2
            return (
              <path
                key={`v-${c.id}`}
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                fill="none"
                stroke="rgba(124,58,237,0.35)"
                strokeWidth={1.5}
              />
            )
          })}

        {/* Dataset nodes */}
        {datasetPositions.map((d) => {
          const color = DATASET_COLOR[d.governance_status] ?? "var(--data-steel)"
          const isSelected = selected === d.id
          return (
            <g key={d.id} onClick={() => setSelected(isSelected ? null : d.id)} style={{ cursor: "pointer" }}>
              <rect
                x={d.x}
                y={d.y}
                width={CARD_W}
                height={CARD_H}
                rx={10}
                fill="white"
                stroke={isSelected ? "var(--validation-cyan)" : color}
                strokeWidth={isSelected ? 2 : 1}
                filter={isSelected ? "drop-shadow(0 2px 8px rgba(6,182,212,0.15))" : "drop-shadow(0 1px 3px rgba(10,16,32,0.06))"}
              />
              <text
                x={d.x + 10}
                y={d.y + 18}
                fontSize={9}
                fontFamily="var(--font-source-sans)"
                fontWeight={600}
                fill={color}
                letterSpacing={0.8}
              >
                DATASET
              </text>
              <text
                x={d.x + 10}
                y={d.y + 36}
                fontSize={13}
                fontFamily="var(--font-archivo)"
                fontWeight={600}
                fill="var(--control-ink)"
              >
                {truncate(d.name, 18)}
              </text>
              <text
                x={d.x + 10}
                y={d.y + 52}
                fontSize={10}
                fontFamily="var(--font-source-sans)"
                fill="var(--metadata-grey)"
              >
                {d.business_criticality} criticality
              </text>
            </g>
          )
        })}

        {/* Case nodes */}
        {casePositions.map((c) => {
          const color = CASE_COLOR[c.status] ?? "var(--dormant-slate)"
          const isPending = c.status === "pending_consensus"
          const isSelected = selected === c.id
          return (
            <g key={c.id} onClick={() => setSelected(isSelected ? null : c.id)} onDoubleClick={() => setDocketCaseId(c.id)} style={{ cursor: "pointer" }}>
              <rect
                x={c.x}
                y={c.y}
                width={CARD_W}
                height={CARD_H}
                rx={10}
                fill="white"
                stroke={isSelected ? "var(--validation-cyan)" : isPending ? "rgba(124,58,237,0.4)" : color}
                strokeWidth={isSelected ? 2 : isPending ? 1.5 : 1}
                filter={isPending ? "drop-shadow(0 2px 8px rgba(124,58,237,0.12))" : "drop-shadow(0 1px 3px rgba(10,16,32,0.06))"}
              />
              <text
                x={c.x + 10}
                y={c.y + 18}
                fontSize={9}
                fontFamily="var(--font-source-sans)"
                fontWeight={600}
                fill={color}
                letterSpacing={0.8}
              >
                {isPending ? "PENDING CONSENSUS" : "CASE"}
              </text>
              <text
                x={c.x + 10}
                y={c.y + 36}
                fontSize={13}
                fontFamily="var(--font-archivo)"
                fontWeight={600}
                fill="var(--control-ink)"
              >
                {truncate(c.issue_type.replace(/_/g, " "), 20)}
              </text>
              <text
                x={c.x + 10}
                y={c.y + 52}
                fontSize={10}
                fontFamily="var(--font-roboto-mono)"
                fill="var(--metadata-grey)"
              >
                {c.id.slice(0, 8).toUpperCase()}
              </text>
            </g>
          )
        })}

        {/* Verdict seal nodes */}
        {casePositions
          .filter((c) => getVerdict(c.genlayer_governance_verdicts) !== null)
          .map((c) => {
            const verdict = getVerdict(c.genlayer_governance_verdicts)!
            const vColor = verdictColor(verdict)
            return (
              <g key={`vseal-${c.id}`}>
                <rect
                  x={COLS.verdict}
                  y={c.y}
                  width={CARD_W}
                  height={CARD_H}
                  rx={10}
                  fill="rgba(124,58,237,0.05)"
                  stroke="rgba(124,58,237,0.25)"
                  strokeWidth={1}
                />
                <text
                  x={COLS.verdict + 10}
                  y={c.y + 18}
                  fontSize={9}
                  fontFamily="var(--font-source-sans)"
                  fontWeight={600}
                  fill="var(--consensus-violet)"
                  letterSpacing={0.8}
                >
                  GENLAYER VERDICT
                </text>
                <text
                  x={COLS.verdict + 10}
                  y={c.y + 36}
                  fontSize={12}
                  fontFamily="var(--font-archivo)"
                  fontWeight={700}
                  fill={vColor}
                >
                  {truncate((verdict ?? "").replace(/_/g, " ").toUpperCase(), 22)}
                </text>
              </g>
            )
          })}

        {/* Column labels */}
        {[
          { label: "DATASETS", x: COLS.dataset + CARD_W / 2 },
          { label: "GOVERNANCE CASES", x: COLS.case + CARD_W / 2 },
          { label: "GENLAYER VERDICTS", x: COLS.verdict + CARD_W / 2 },
        ].map((col) => (
          <text
            key={col.label}
            x={col.x}
            y={28}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-source-sans)"
            fontWeight={600}
            fill="var(--dormant-slate)"
            letterSpacing={1.2}
          >
            {col.label}
          </text>
        ))}
      </svg>

      {/* Case Docket Drawer — opens on double-click of any case node */}
      {docketCaseId && (
        <CaseDocketDrawer caseId={docketCaseId} onClose={() => setDocketCaseId(null)} />
      )}

      {/* Hint */}
      <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
        <span style={{ fontSize: 11, color: "var(--metadata-grey)", fontFamily: "var(--font-source-sans)" }}>
          Click to select · Double-click a case to open docket
        </span>
      </div>
    </div>
  )
}

function EmptyGraph() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ledger-mist)",
        padding: 40,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--audit-white)",
          border: "1px solid var(--schema-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Info size={22} color="var(--dormant-slate)" />
      </div>
      <h2
        className="text-panel-title mb-2"
        style={{ color: "var(--control-ink)", textAlign: "center" }}
      >
        No governance cases yet
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--metadata-grey)",
          textAlign: "center",
          maxWidth: 380,
          lineHeight: 1.7,
          marginBottom: 28,
        }}
      >
        Register a dataset, then create a governance case to send to the
        GenLayer contract for consensus-backed adjudication.
      </p>
      <div className="flex gap-3">
        <Link href="/app/datasets/new" className="btn-secondary">
          Register dataset
        </Link>
        <Link href="/app/cases/new" className="btn-primary">
          <Plus size={14} /> New governance case
        </Link>
      </div>
    </div>
  )
}

function GraphLegend() {
  const items = [
    { color: "var(--data-steel)",       label: "Dataset" },
    { color: "var(--consensus-violet)", label: "Pending consensus" },
    { color: "var(--governance-green)", label: "Verdict received" },
    { color: "var(--quarantine-red)",   label: "Quarantined" },
  ]
  return (
    <div
      className="audit-panel"
      style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}
    >
      <p className="text-badge-label" style={{ color: "var(--metadata-grey)", marginBottom: 4 }}>
        LEGEND
      </p>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--metadata-grey)", fontFamily: "var(--font-source-sans)" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s
}

function verdictColor(verdict: string): string {
  const map: Record<string, string> = {
    approved: "var(--governance-green)",
    approved_with_warning: "var(--policy-amber)",
    quarantine_dataset: "var(--quarantine-red)",
    reject_proposed_fix: "var(--quarantine-red)",
    requires_human_review: "var(--review-indigo)",
    needs_more_evidence: "var(--metadata-grey)",
  }
  return map[verdict] ?? "var(--metadata-grey)"
}
