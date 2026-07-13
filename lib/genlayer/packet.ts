import "server-only"
import { sha256Hex } from "@/lib/utils/hash"

export interface GovernancePacket {
  caseId: string
  datasetName: string
  datasetPurpose: string
  dataDomain: string
  downstreamConsumer: string
  businessCriticality: string
  issueType: string
  affectedColumns: string
  missingnessSummary: string
  duplicationSummary: string
  schemaDriftSummary: string
  freshnessSummary: string
  validitySummary: string
  volumeSummary: string
  historicalBaselineSummary: string
  proposedFix: string
  rollbackPlan: string
  dataContractSummary: string
  sampleRowsHash: string
  schemaSnapshotHash: string
  evidenceHash: string
  evidenceManifestHash: string
  publicEvidenceUrls: string
  analystNotes: string
  candidateOutcomeA: string
  candidateOutcomeB: string
  candidateOutcomeC: string
}

export interface ProfileHashes {
  sampleRowsHash?: string | null
  schemaSnapshotHash?: string | null
  evidenceManifestHash?: string | null
}

export function buildPacket(
  caseRow: Record<string, string | null>,
  datasetRow: Record<string, string | null>,
  evidenceHashes: string[],
  publicEvidenceUrls: string[] = [],
  profileHashes: ProfileHashes = {}
): GovernancePacket {
  assertCandidateOutcomesSafe([
    caseRow.candidate_outcome_a,
    caseRow.candidate_outcome_b,
    caseRow.candidate_outcome_c,
  ])

  const evidenceHash = sha256Hex(evidenceHashes.join(",") || "no_evidence")
  const fallbackEvidenceManifestHash = sha256Hex(JSON.stringify(evidenceHashes))
  const fallbackSampleRowsHash = sha256Hex(JSON.stringify({
    issueType: caseRow.issue_type,
    dataset: datasetRow.name,
    columns: caseRow.affected_columns,
  }))
  const fallbackSchemaSnapshotHash = sha256Hex(JSON.stringify({
    schema: datasetRow.schema_summary,
    domain: datasetRow.domain,
    name: datasetRow.name,
  }))

  return {
    caseId:                     caseRow.id ?? "",
    datasetName:                datasetRow.name ?? "",
    datasetPurpose:             datasetRow.quality_expectations ?? datasetRow.schema_summary ?? "",
    dataDomain:                 datasetRow.domain ?? "",
    downstreamConsumer:         datasetRow.downstream_consumers ?? "",
    businessCriticality:        datasetRow.business_criticality ?? "medium",
    issueType:                  caseRow.issue_type ?? "",
    affectedColumns:            caseRow.affected_columns ?? "",
    missingnessSummary:         caseRow.missingness_summary ?? "",
    duplicationSummary:         caseRow.duplication_summary ?? "",
    schemaDriftSummary:         caseRow.schema_drift_summary ?? "",
    freshnessSummary:           caseRow.freshness_summary ?? "",
    validitySummary:            caseRow.validity_summary ?? "",
    volumeSummary:              caseRow.volume_summary ?? "",
    historicalBaselineSummary:  caseRow.historical_baseline_summary ?? "",
    proposedFix:                caseRow.proposed_fix ?? "",
    rollbackPlan:               caseRow.rollback_plan ?? "",
    dataContractSummary:        datasetRow.quality_expectations ?? "",
    sampleRowsHash:             profileHashes.sampleRowsHash ?? fallbackSampleRowsHash,
    schemaSnapshotHash:         profileHashes.schemaSnapshotHash ?? fallbackSchemaSnapshotHash,
    evidenceHash,
    evidenceManifestHash:       profileHashes.evidenceManifestHash ?? fallbackEvidenceManifestHash,
    publicEvidenceUrls:         normalizePublicEvidenceUrls(publicEvidenceUrls),
    analystNotes:               caseRow.analyst_notes ?? "",
    candidateOutcomeA:          caseRow.candidate_outcome_a ?? "",
    candidateOutcomeB:          caseRow.candidate_outcome_b ?? "",
    candidateOutcomeC:          caseRow.candidate_outcome_c ?? "",
  }
}

export function normalizePublicEvidenceUrls(publicEvidenceUrls: string[] = []): string {
  const normalized = publicEvidenceUrls.map((url) => url.trim()).filter(Boolean)
  const invalid = normalized.find((descriptor) => {
    const marker = "#sha256="
    const markerIndex = descriptor.lastIndexOf(marker)
    if (markerIndex <= 0) return true
    const urlText = descriptor.slice(0, markerIndex)
    const digest = descriptor.slice(markerIndex + marker.length)
    if (!/^[0-9a-f]{64}$/.test(digest)) return true
    try {
      const url = new URL(urlText)
      if (url.protocol !== "https:" || url.username || url.password) return true
      if (url.port && url.port !== "443") return true
      const host = url.hostname.toLowerCase()
      if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true
      if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return true
      const allowed = host === "raw.githubusercontent.com" || host.endsWith(".vercel.app") || host.endsWith(".supabase.co")
      return !allowed
    } catch {
      return true
    }
  })
  if (invalid) {
    throw new Error("Evidence references must use an allowed HTTPS host and end in #sha256=<64 lowercase hex characters>.")
  }
  return normalized.slice(0, 3).join("|")
}

export function assertCandidateOutcomesSafe(outcomes: Array<string | null | undefined>) {
  const forbidden = /\b(verdict|dataset_action|severity|confidence_label|selected_outcome|reasoning_summary|final_status|consensus_status|transaction_hash|contract_address)\b\s*[:=]/i
  const bad = outcomes.find((outcome) => outcome && forbidden.test(outcome))
  if (bad) {
    throw new Error("Candidate outcomes must not include caller-supplied verdict fields.")
  }
}
