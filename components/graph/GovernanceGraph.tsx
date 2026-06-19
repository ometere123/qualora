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
  proposed_fix?: string | null
  evidence_files?: { id: string }[] | null
  genlayer_governance_verdicts: { verdict: string }[] | { verdict: string } | null
}

function getVerdict(raw: Case["genlayer_governance_verdicts"]): string | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0]?.verdict ?? null
  return raw.verdict ?? null
}

function evidenceCount(raw: Case["evidence_files"]): number {
  if (!raw) return 0
  if (Array.isArray(raw)) return raw.length
  return 0
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

  const CARD_W = 160
  const CARD_H = 64
  const ROW_H = 90
  const COLS = {
    dataset:  80,
    case:     310,
    evidence: 530,
    fix:      720,
    verdict:  910,
  }

  const datasetPositions = datasets.map((d, i) => ({ ...d, x: COLS.dataset,  y: 60 + i * ROW_H }))
  const casePositions    = cases.map((c, i)    => ({ ...c, x: COLS.case,     y: 60 + i * ROW_H }))

  const svgH = Math.max(datasets.length * ROW_H + 100, cases.length * ROW_H + 100, 400)
  const svgW = COLS.verdict + CARD_W + 80

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "auto", background: "var(--ledger-mist)" }}>
      {/* Legend */}
      <div style={{ position: "absolute", top: 16, right: 20, zIndex: 10 }}>
        <GraphLegend />
      </div>

      <svg width={svgW} height={svgH} style={{ display: "block", minWidth: svgW }}>

        {/* ── Edges: dataset → case ── */}
        {casePositions.map((c) => {
          const ds = datasetPositions.find((d) => d.id === c.dataset_id)
          if (!ds) return null
          const x1 = ds.x + CARD_W, y1 = ds.y + CARD_H / 2
          const x2 = c.x,           y2 = c.y  + CARD_H / 2
          const mx = (x1 + x2) / 2
          return (
            <path key={`e-ds-${c.id}`} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none" stroke="var(--schema-line)" strokeWidth={1.5} strokeDasharray="4 3" />
          )
        })}

        {/* ── Edges: case → evidence (if has files) ── */}
        {casePositions.filter((c) => evidenceCount(c.evidence_files) > 0).map((c) => {
          const x1 = c.x + CARD_W, y1 = c.y + CARD_H / 2
          const x2 = COLS.evidence, y2 = c.y + CARD_H / 2
          return (
            <line key={`e-ev-${c.id}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(6,182,212,0.35)" strokeWidth={1.5} />
          )
        })}

        {/* ── Edges: case → fix (if has fix, no evidence) OR evidence → fix ── */}
        {casePositions.filter((c) => c.proposed_fix).map((c) => {
          const hasEvidence = evidenceCount(c.evidence_files) > 0
          const x1 = hasEvidence ? COLS.evidence + CARD_W : c.x + CARD_W
          const y1 = c.y + CARD_H / 2
          const x2 = COLS.fix, y2 = c.y + CARD_H / 2
          return (
            <line key={`e-fx-${c.id}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(217,119,6,0.35)" strokeWidth={1.5} />
          )
        })}

        {/* ── Edges: → verdict ── */}
        {casePositions.filter((c) => getVerdict(c.genlayer_governance_verdicts) !== null).map((c) => {
          const hasFix = !!c.proposed_fix
          const hasEvidence = evidenceCount(c.evidence_files) > 0
          const x1 = hasFix ? COLS.fix + CARD_W : hasEvidence ? COLS.evidence + CARD_W : c.x + CARD_W
          const y1 = c.y + CARD_H / 2
          return (
            <line key={`e-vd-${c.id}`} x1={x1} y1={y1} x2={COLS.verdict} y2={y1}
              stroke="rgba(124,58,237,0.40)" strokeWidth={1.5} />
          )
        })}

        {/* ── Dataset nodes ── */}
        {datasetPositions.map((d) => {
          const color = DATASET_COLOR[d.governance_status] ?? "var(--data-steel)"
          const isSel = selected === d.id
          return (
            <g key={d.id} onClick={() => setSelected(isSel ? null : d.id)} style={{ cursor: "pointer" }}>
              <rect x={d.x} y={d.y} width={CARD_W} height={CARD_H} rx={10}
                fill="white"
                stroke={isSel ? "var(--validation-cyan)" : color}
                strokeWidth={isSel ? 2 : 1}
                filter={isSel ? "drop-shadow(0 2px 8px rgba(6,182,212,0.15))" : "drop-shadow(0 1px 3px rgba(10,16,32,0.06))"} />
              <text x={d.x+10} y={d.y+18} fontSize={9} fontFamily="var(--font-source-sans)" fontWeight={600} fill={color} letterSpacing={0.8}>DATASET</text>
              <text x={d.x+10} y={d.y+36} fontSize={12} fontFamily="var(--font-archivo)" fontWeight={600} fill="var(--control-ink)">{truncate(d.name, 17)}</text>
              <text x={d.x+10} y={d.y+52} fontSize={10} fontFamily="var(--font-source-sans)" fill="var(--metadata-grey)">{d.business_criticality} criticality</text>
            </g>
          )
        })}

        {/* ── Case nodes ── */}
        {casePositions.map((c) => {
          const color = CASE_COLOR[c.status] ?? "var(--dormant-slate)"
          const isPending = c.status === "pending_consensus" || c.status === "submitted_to_genlayer"
          const isSel = selected === c.id
          return (
            <g key={c.id}
              onClick={() => setSelected(isSel ? null : c.id)}
              onDoubleClick={() => setDocketCaseId(c.id)}
              style={{ cursor: "pointer" }}>
              <rect x={c.x} y={c.y} width={CARD_W} height={CARD_H} rx={10}
                fill="white"
                stroke={isSel ? "var(--validation-cyan)" : isPending ? "rgba(124,58,237,0.4)" : color}
                strokeWidth={isSel ? 2 : isPending ? 1.5 : 1}
                filter={isPending ? "drop-shadow(0 2px 8px rgba(124,58,237,0.12))" : "drop-shadow(0 1px 3px rgba(10,16,32,0.06))"} />
              <text x={c.x+10} y={c.y+18} fontSize={9} fontFamily="var(--font-source-sans)" fontWeight={600} fill={color} letterSpacing={0.8}>
                {isPending ? "PENDING CONSENSUS" : "CASE"}
              </text>
              <text x={c.x+10} y={c.y+36} fontSize={12} fontFamily="var(--font-archivo)" fontWeight={600} fill="var(--control-ink)">{truncate(c.issue_type.replace(/_/g, " "), 19)}</text>
              <text x={c.x+10} y={c.y+52} fontSize={10} fontFamily="var(--font-roboto-mono)" fill="var(--metadata-grey)">{c.id.slice(0,8).toUpperCase()}</text>
            </g>
          )
        })}

        {/* ── Evidence nodes ── */}
        {casePositions.filter((c) => evidenceCount(c.evidence_files) > 0).map((c) => {
          const count = evidenceCount(c.evidence_files)
          return (
            <g key={`ev-${c.id}`}>
              <rect x={COLS.evidence} y={c.y} width={CARD_W} height={CARD_H} rx={10}
                fill="rgba(6,182,212,0.04)" stroke="rgba(6,182,212,0.30)" strokeWidth={1}
                filter="drop-shadow(0 1px 3px rgba(10,16,32,0.06))" />
              <text x={COLS.evidence+10} y={c.y+18} fontSize={9} fontFamily="var(--font-source-sans)" fontWeight={600} fill="var(--validation-cyan)" letterSpacing={0.8}>EVIDENCE</text>
              <text x={COLS.evidence+10} y={c.y+36} fontSize={12} fontFamily="var(--font-archivo)" fontWeight={600} fill="var(--control-ink)">{count} file{count !== 1 ? "s" : ""} attached</text>
              <text x={COLS.evidence+10} y={c.y+52} fontSize={10} fontFamily="var(--font-source-sans)" fill="var(--metadata-grey)">SHA-256 hashed</text>
            </g>
          )
        })}

        {/* ── Fix Proposal nodes ── */}
        {casePositions.filter((c) => c.proposed_fix).map((c) => (
          <g key={`fx-${c.id}`}>
            <rect x={COLS.fix} y={c.y} width={CARD_W} height={CARD_H} rx={10}
              fill="rgba(217,119,6,0.04)" stroke="rgba(217,119,6,0.30)" strokeWidth={1}
              filter="drop-shadow(0 1px 3px rgba(10,16,32,0.06))" />
            <text x={COLS.fix+10} y={c.y+18} fontSize={9} fontFamily="var(--font-source-sans)" fontWeight={600} fill="var(--policy-amber)" letterSpacing={0.8}>FIX PROPOSAL</text>
            <text x={COLS.fix+10} y={c.y+36} fontSize={12} fontFamily="var(--font-archivo)" fontWeight={600} fill="var(--control-ink)">{truncate(c.proposed_fix!, 19)}</text>
            <text x={COLS.fix+10} y={c.y+52} fontSize={10} fontFamily="var(--font-source-sans)" fill="var(--metadata-grey)">awaiting verdict</text>
          </g>
        ))}

        {/* ── Verdict seal nodes ── */}
        {casePositions.filter((c) => getVerdict(c.genlayer_governance_verdicts) !== null).map((c) => {
          const verdict = getVerdict(c.genlayer_governance_verdicts)!
          const vColor = verdictColor(verdict)
          return (
            <g key={`vd-${c.id}`}>
              <rect x={COLS.verdict} y={c.y} width={CARD_W} height={CARD_H} rx={10}
                fill="rgba(124,58,237,0.05)" stroke="rgba(124,58,237,0.25)" strokeWidth={1} />
              <text x={COLS.verdict+10} y={c.y+18} fontSize={9} fontFamily="var(--font-source-sans)" fontWeight={600} fill="var(--consensus-violet)" letterSpacing={0.8}>GENLAYER VERDICT</text>
              <text x={COLS.verdict+10} y={c.y+36} fontSize={11} fontFamily="var(--font-archivo)" fontWeight={700} fill={vColor}>
                {truncate(verdict.replace(/_/g, " ").toUpperCase(), 21)}
              </text>
            </g>
          )
        })}

        {/* ── Column labels ── */}
        {[
          { label: "DATASETS",          x: COLS.dataset  + CARD_W / 2 },
          { label: "CASES",             x: COLS.case     + CARD_W / 2 },
          { label: "EVIDENCE",          x: COLS.evidence + CARD_W / 2 },
          { label: "FIX PROPOSAL",      x: COLS.fix      + CARD_W / 2 },
          { label: "GENLAYER VERDICTS", x: COLS.verdict  + CARD_W / 2 },
        ].map((col) => (
          <text key={col.label} x={col.x} y={28} textAnchor="middle"
            fontSize={9} fontFamily="var(--font-source-sans)" fontWeight={600}
            fill="var(--dormant-slate)" letterSpacing={1.2}>
            {col.label}
          </text>
        ))}
      </svg>

      {/* Case Docket Drawer */}
      {docketCaseId && (
        <CaseDocketDrawer caseId={docketCaseId} onClose={() => setDocketCaseId(null)} />
      )}

      <div style={{ position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
        <span style={{ fontSize: 11, color: "var(--metadata-grey)", fontFamily: "var(--font-source-sans)" }}>
          Click to select · Double-click a case to open docket
        </span>
      </div>
    </div>
  )
}

function EmptyGraph() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--ledger-mist)", padding: 40 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--audit-white)", border: "1px solid var(--schema-line)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Info size={22} color="var(--dormant-slate)" />
      </div>
      <h2 className="text-panel-title mb-2" style={{ color: "var(--control-ink)", textAlign: "center" }}>No governance cases yet</h2>
      <p style={{ fontSize: 14, color: "var(--metadata-grey)", textAlign: "center", maxWidth: 380, lineHeight: 1.7, marginBottom: 28 }}>
        Register a dataset, then create a governance case to send to the GenLayer contract for consensus-backed adjudication.
      </p>
      <div className="flex gap-3">
        <Link href="/app/datasets/new" className="btn-secondary">Register dataset</Link>
        <Link href="/app/cases/new" className="btn-primary"><Plus size={14} /> New governance case</Link>
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
    { color: "var(--validation-cyan)",  label: "Evidence attached" },
    { color: "var(--policy-amber)",     label: "Fix proposal" },
  ]
  return (
    <div className="audit-panel" style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
      <p className="text-badge-label" style={{ color: "var(--metadata-grey)", marginBottom: 4 }}>LEGEND</p>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--metadata-grey)", fontFamily: "var(--font-source-sans)" }}>{item.label}</span>
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
    approved:              "var(--governance-green)",
    approved_with_warning: "var(--policy-amber)",
    quarantine_dataset:    "var(--quarantine-red)",
    reject_proposed_fix:   "var(--quarantine-red)",
    requires_human_review: "var(--review-indigo)",
    needs_more_evidence:   "var(--metadata-grey)",
  }
  return map[verdict] ?? "var(--metadata-grey)"
}
