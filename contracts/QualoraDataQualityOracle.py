# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing
import hashlib


# ---------------------------------------------------------------------------
# Protocol constants
# ---------------------------------------------------------------------------

PROTOCOL_NAME = "Qualora Data Quality Governance Oracle"
PROTOCOL_VERSION = "2.0.2"
CONSENSUS_SCHEMA_VERSION = "qualora.consensus.v2"

MAX_SHORT_TEXT = 280
MAX_MEDIUM_TEXT = 1200
MAX_LONG_TEXT = 3200
MAX_PUBLIC_URLS = 3
MAX_PUBLIC_URL_CHARS = 260
MAX_FETCHED_EVIDENCE_CHARS = 3600
MAX_REASONING_CHARS = 900
MAX_ACTION_CHARS = 420
MAX_RECHECK_REASON_CHARS = 900
MAX_REGISTRY_PAGE = 50
SHA256_HEX_CHARS = 64

ALLOWED_EVIDENCE_HOSTS = [
    "raw.githubusercontent.com",
]

ALLOWED_EVIDENCE_HOST_SUFFIXES = [
    ".vercel.app",
    ".supabase.co",
]

STATUS_OPEN = "open"
STATUS_FINALIZED = "finalized"
STATUS_RECHECKED = "rechecked"
STATUS_SUPERSEDED = "superseded"
STATUS_ADMIN_PAUSED = "admin_paused"

VERDICT_APPROVED = "approved"
VERDICT_APPROVED_WITH_WARNING = "approved_with_warning"
VERDICT_QUARANTINE = "quarantine_dataset"
VERDICT_REJECT_FIX = "reject_proposed_fix"
VERDICT_HUMAN_REVIEW = "requires_human_review"
VERDICT_MORE_EVIDENCE = "needs_more_evidence"

GOVERNANCE_ALLOW = "allow"
GOVERNANCE_WARN = "warn"
GOVERNANCE_BLOCK = "block"
GOVERNANCE_REVIEW = "review"
GOVERNANCE_EVIDENCE = "evidence"

SEVERITY_LOW = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH = "high"
SEVERITY_CRITICAL = "critical"

CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"
CONFIDENCE_INSUFFICIENT = "insufficient_evidence"

EVIDENCE_STRONG = "strong"
EVIDENCE_ADEQUATE = "adequate"
EVIDENCE_WEAK = "weak"
EVIDENCE_INSUFFICIENT = "insufficient"

FIX_SAFE = "safe"
FIX_SAFE_WITH_CONTROLS = "safe_with_controls"
FIX_UNSAFE = "unsafe"
FIX_UNKNOWN = "unknown"

CONTRACT_ALIGNED = "aligned"
CONTRACT_PARTIAL = "partially_aligned"
CONTRACT_VIOLATED = "violated"
CONTRACT_UNKNOWN = "unknown"

RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"
RISK_CRITICAL = "critical"

ALLOWED_BUSINESS_CRITICALITY = [
    "low",
    "medium",
    "high",
    "critical",
    "unknown",
]

ALLOWED_ISSUE_TYPES = [
    "missingness",
    "duplication",
    "schema_drift",
    "freshness",
    "validity",
    "volume_anomaly",
    "referential_integrity",
    "distribution_shift",
    "data_contract_breach",
    "mixed_quality",
    "other",
]

ALLOWED_VERDICTS = [
    VERDICT_APPROVED,
    VERDICT_APPROVED_WITH_WARNING,
    VERDICT_QUARANTINE,
    VERDICT_REJECT_FIX,
    VERDICT_HUMAN_REVIEW,
    VERDICT_MORE_EVIDENCE,
]

ALLOWED_SEVERITIES = [
    SEVERITY_LOW,
    SEVERITY_MEDIUM,
    SEVERITY_HIGH,
    SEVERITY_CRITICAL,
]

ALLOWED_CONFIDENCE = [
    CONFIDENCE_HIGH,
    CONFIDENCE_MEDIUM,
    CONFIDENCE_LOW,
    CONFIDENCE_INSUFFICIENT,
]

ALLOWED_EVIDENCE_GRADES = [
    EVIDENCE_STRONG,
    EVIDENCE_ADEQUATE,
    EVIDENCE_WEAK,
    EVIDENCE_INSUFFICIENT,
]

ALLOWED_FIX_SAFETY = [
    FIX_SAFE,
    FIX_SAFE_WITH_CONTROLS,
    FIX_UNSAFE,
    FIX_UNKNOWN,
]

ALLOWED_CONTRACT_ALIGNMENT = [
    CONTRACT_ALIGNED,
    CONTRACT_PARTIAL,
    CONTRACT_VIOLATED,
    CONTRACT_UNKNOWN,
]

ALLOWED_RISK = [
    RISK_LOW,
    RISK_MEDIUM,
    RISK_HIGH,
    RISK_CRITICAL,
]

FORBIDDEN_CALLER_RESULT_KEYS = [
    '"verdict"',
    "'verdict'",
    '"support_level"',
    "'support_level'",
    '"final_status"',
    "'final_status'",
    '"confidence_label"',
    "'confidence_label'",
    '"severity"',
    "'severity'",
    '"dataset_action"',
    "'dataset_action'",
]


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

def _strip(value: str) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _limit(value: str, max_len: int) -> str:
    text = _strip(value)
    if len(text) <= max_len:
        return text
    return text[:max_len]


def _lower_token(value: str) -> str:
    return _strip(value).lower().replace(" ", "_").replace("-", "_")


def _is_blank(value: str) -> bool:
    return _strip(value) == ""


def _contains_forbidden_result_key(value: str) -> bool:
    text = _strip(value).lower()
    for key in FORBIDDEN_CALLER_RESULT_KEYS:
        if key in text:
            return True
    return False


def _bool_text(value: bool) -> str:
    if value:
        return "true"
    return "false"


def _stringify(value: typing.Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, sort_keys=True)
    except Exception:
        return str(value)


def _json_dumps(value: typing.Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _json_loads_or_empty(value: str) -> typing.Dict[str, typing.Any]:
    try:
        parsed = json.loads(_strip(value))
        if isinstance(parsed, dict):
            return parsed
        return {}
    except Exception:
        return {}


def _json_array_loads_or_empty(value: str) -> typing.List[typing.Any]:
    try:
        parsed = json.loads(_strip(value))
        if isinstance(parsed, list):
            return parsed
        return []
    except Exception:
        return []


def _split_pipe(value: str, max_items: int) -> typing.List[str]:
    text = _strip(value)
    if text == "":
        return []
    raw_parts = text.split("|")
    parts: typing.List[str] = []
    for raw in raw_parts:
        item = _strip(raw)
        if item != "":
            parts.append(item)
        if len(parts) >= max_items:
            break
    return parts


def _is_sha256_hex(value: str) -> bool:
    text = _strip(value).lower()
    if len(text) != SHA256_HEX_CHARS:
        return False
    for char in text:
        if char not in "0123456789abcdef":
            return False
    return True


def _parse_evidence_descriptor(value: str) -> typing.Dict[str, str]:
    """Parse HTTPS evidence references bound to an expected SHA-256 digest."""
    text = _strip(value)
    marker = "#sha256="
    if marker not in text:
        return {}

    parts = text.rsplit(marker, 1)
    if len(parts) != 2:
        return {}

    url = _strip(parts[0])
    digest = _strip(parts[1]).lower()
    if len(url) > MAX_PUBLIC_URL_CHARS or not _is_sha256_hex(digest):
        return {}
    if not url.startswith("https://"):
        return {}

    authority_and_path = url[len("https://"):]
    authority = authority_and_path.split("/", 1)[0].lower()
    if authority == "" or "@" in authority:
        return {}

    host = authority
    if ":" in authority:
        host_parts = authority.rsplit(":", 1)
        if len(host_parts) != 2 or host_parts[1] != "443":
            return {}
        host = host_parts[0]

    if host == "localhost" or host.endswith(".localhost") or host.endswith(".local"):
        return {}
    if host.startswith("127.") or host.startswith("10.") or host.startswith("192.168."):
        return {}
    if host.startswith("169.254.") or host == "0.0.0.0" or host == "::1":
        return {}
    if host.startswith("172."):
        octets = host.split(".")
        if len(octets) == 4:
            try:
                second = int(octets[1])
                if second >= 16 and second <= 31:
                    return {}
            except Exception:
                return {}

    allowed = False
    for allowed_host in ALLOWED_EVIDENCE_HOSTS:
        if host == allowed_host:
            allowed = True
    for suffix in ALLOWED_EVIDENCE_HOST_SUFFIXES:
        if host.endswith(suffix) and host != suffix[1:]:
            allowed = True
    if not allowed:
        return {}

    return {"url": url, "sha256": digest, "host": host}


def _looks_like_public_url(value: str) -> bool:
    return len(_parse_evidence_descriptor(value)) > 0


def _sha256_hex_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest().lower()


def _enum(value: str, allowed: typing.List[str], fallback: str) -> str:
    token = _lower_token(value)
    for allowed_item in allowed:
        if token == allowed_item:
            return allowed_item
    return fallback


def _severity_rank(value: str) -> int:
    token = _enum(value, ALLOWED_SEVERITIES, SEVERITY_MEDIUM)
    if token == SEVERITY_LOW:
        return 1
    if token == SEVERITY_MEDIUM:
        return 2
    if token == SEVERITY_HIGH:
        return 3
    if token == SEVERITY_CRITICAL:
        return 4
    return 2


def _risk_rank(value: str) -> int:
    token = _enum(value, ALLOWED_RISK, RISK_MEDIUM)
    if token == RISK_LOW:
        return 1
    if token == RISK_MEDIUM:
        return 2
    if token == RISK_HIGH:
        return 3
    if token == RISK_CRITICAL:
        return 4
    return 2


def _confidence_rank(value: str) -> int:
    token = _enum(value, ALLOWED_CONFIDENCE, CONFIDENCE_LOW)
    if token == CONFIDENCE_INSUFFICIENT:
        return 0
    if token == CONFIDENCE_LOW:
        return 1
    if token == CONFIDENCE_MEDIUM:
        return 2
    if token == CONFIDENCE_HIGH:
        return 3
    return 1


def _evidence_rank(value: str) -> int:
    token = _enum(value, ALLOWED_EVIDENCE_GRADES, EVIDENCE_WEAK)
    if token == EVIDENCE_INSUFFICIENT:
        return 0
    if token == EVIDENCE_WEAK:
        return 1
    if token == EVIDENCE_ADEQUATE:
        return 2
    if token == EVIDENCE_STRONG:
        return 3
    return 1


def _verdict_to_governance_class(verdict: str) -> str:
    token = _enum(verdict, ALLOWED_VERDICTS, VERDICT_HUMAN_REVIEW)
    if token == VERDICT_APPROVED:
        return GOVERNANCE_ALLOW
    if token == VERDICT_APPROVED_WITH_WARNING:
        return GOVERNANCE_WARN
    if token == VERDICT_QUARANTINE:
        return GOVERNANCE_BLOCK
    if token == VERDICT_REJECT_FIX:
        return GOVERNANCE_BLOCK
    if token == VERDICT_HUMAN_REVIEW:
        return GOVERNANCE_REVIEW
    if token == VERDICT_MORE_EVIDENCE:
        return GOVERNANCE_EVIDENCE
    return GOVERNANCE_REVIEW


def _is_blocking_verdict(verdict: str) -> bool:
    cls = _verdict_to_governance_class(verdict)
    return cls == GOVERNANCE_BLOCK


def _is_review_verdict(verdict: str) -> bool:
    cls = _verdict_to_governance_class(verdict)
    return cls == GOVERNANCE_REVIEW or cls == GOVERNANCE_EVIDENCE


def _selected_outcome(candidate: str) -> str:
    token = _strip(candidate)
    if token == "":
        return "none"
    lowered = token.lower()
    if lowered in ["a", "b", "c", "none"]:
        return lowered
    if "candidate_a" in lowered or "outcome_a" in lowered:
        return "a"
    if "candidate_b" in lowered or "outcome_b" in lowered:
        return "b"
    if "candidate_c" in lowered or "outcome_c" in lowered:
        return "c"
    return "none"


def _decision_key(case_id: str, version: str) -> str:
    return _strip(case_id) + "::v" + _strip(version)


def _append_audit(existing: str, item: typing.Dict[str, typing.Any]) -> str:
    arr = _json_array_loads_or_empty(existing)
    arr.append(item)
    if len(arr) > 40:
        arr = arr[-40:]
    return _json_dumps(arr)


def _normalise_consensus_json(raw: str) -> typing.Dict[str, typing.Any]:
    parsed = _json_loads_or_empty(raw)

    verdict = _enum(
        _stringify(parsed.get("verdict", "")),
        ALLOWED_VERDICTS,
        VERDICT_HUMAN_REVIEW,
    )
    severity = _enum(
        _stringify(parsed.get("severity", "")),
        ALLOWED_SEVERITIES,
        SEVERITY_MEDIUM,
    )
    confidence = _enum(
        _stringify(parsed.get("confidence_label", "")),
        ALLOWED_CONFIDENCE,
        CONFIDENCE_LOW,
    )
    evidence_grade = _enum(
        _stringify(parsed.get("evidence_grade", "")),
        ALLOWED_EVIDENCE_GRADES,
        EVIDENCE_WEAK,
    )
    fix_safety = _enum(
        _stringify(parsed.get("fix_safety", "")),
        ALLOWED_FIX_SAFETY,
        FIX_UNKNOWN,
    )
    contract_alignment = _enum(
        _stringify(parsed.get("data_contract_alignment", "")),
        ALLOWED_CONTRACT_ALIGNMENT,
        CONTRACT_UNKNOWN,
    )
    downstream_risk_level = _enum(
        _stringify(parsed.get("downstream_risk_level", "")),
        ALLOWED_RISK,
        RISK_MEDIUM,
    )

    result: typing.Dict[str, typing.Any] = {
        "schema_version": CONSENSUS_SCHEMA_VERSION,
        "verdict": verdict,
        "governance_class": _verdict_to_governance_class(verdict),
        "severity": severity,
        "confidence_label": confidence,
        "evidence_grade": evidence_grade,
        "fix_safety": fix_safety,
        "data_contract_alignment": contract_alignment,
        "downstream_risk_level": downstream_risk_level,
        "selected_outcome": _selected_outcome(_stringify(parsed.get("selected_outcome", ""))),
        "dataset_action": _limit(_stringify(parsed.get("dataset_action", "")), MAX_ACTION_CHARS),
        "fix_assessment": _limit(_stringify(parsed.get("fix_assessment", "")), MAX_ACTION_CHARS),
        "downstream_risk": _limit(_stringify(parsed.get("downstream_risk", "")), MAX_ACTION_CHARS),
        "reasoning_summary": _limit(_stringify(parsed.get("reasoning_summary", "")), MAX_REASONING_CHARS),
        "required_controls": _limit(_stringify(parsed.get("required_controls", "")), MAX_ACTION_CHARS),
        "required_next_steps": _limit(_stringify(parsed.get("required_next_steps", "")), MAX_ACTION_CHARS),
        "expiry_condition": _limit(_stringify(parsed.get("expiry_condition", "")), MAX_ACTION_CHARS),
        "appeal_recommendation": _limit(_stringify(parsed.get("appeal_recommendation", "")), MAX_ACTION_CHARS),
        "evidence_verified": bool(parsed.get("evidence_verified", False)),
        "verified_evidence_digests": _limit(_stringify(parsed.get("verified_evidence_digests", "")), MAX_MEDIUM_TEXT),
        "evidence_verification_summary": _limit(_stringify(parsed.get("evidence_verification_summary", "")), MAX_ACTION_CHARS),
    }

    if result["dataset_action"] == "":
        if verdict == VERDICT_APPROVED:
            result["dataset_action"] = "Dataset may remain available under normal monitoring."
        elif verdict == VERDICT_APPROVED_WITH_WARNING:
            result["dataset_action"] = "Dataset may remain available, but warnings and controls must be applied."
        elif verdict == VERDICT_QUARANTINE:
            result["dataset_action"] = "Dataset must be quarantined from downstream use until a safe remediation is approved."
        elif verdict == VERDICT_REJECT_FIX:
            result["dataset_action"] = "The proposed fix must not be executed; submit a safer remediation plan."
        elif verdict == VERDICT_MORE_EVIDENCE:
            result["dataset_action"] = "Additional evidence is required before a governance action can be finalized."
        else:
            result["dataset_action"] = "Human governance review is required before downstream use continues."

    if result["reasoning_summary"] == "":
        result["reasoning_summary"] = "The consensus result did not include a sufficient reasoning summary, so the record is treated conservatively."

    if result["fix_assessment"] == "":
        result["fix_assessment"] = "The proposed fix requires controls or human review before execution."

    if result["downstream_risk"] == "":
        result["downstream_risk"] = "Downstream risk could not be fully established from the available evidence."

    if result["required_controls"] == "":
        result["required_controls"] = "Maintain monitoring, preserve evidence, and document owner approval before release."

    if result["required_next_steps"] == "":
        result["required_next_steps"] = "Record the decision, notify downstream owners, and follow the dataset action."

    if result["expiry_condition"] == "":
        result["expiry_condition"] = "Decision remains valid until evidence, schema, data contract, or proposed fix changes."

    if result["appeal_recommendation"] == "":
        result["appeal_recommendation"] = "Appeal only if material evidence was missing or misrepresented."

    return result


def _apply_evidence_policy(
    decision: typing.Dict[str, typing.Any],
    verified_digests: typing.List[str],
    verification_summary: str,
) -> typing.Dict[str, typing.Any]:
    """Bind operative verdicts to evidence verified inside validator execution."""
    verified = len(verified_digests) > 0
    decision["evidence_verified"] = verified
    decision["verified_evidence_digests"] = "|".join(verified_digests)
    decision["evidence_verification_summary"] = _limit(verification_summary, MAX_ACTION_CHARS)

    if not verified:
        decision["verdict"] = VERDICT_MORE_EVIDENCE
        decision["governance_class"] = GOVERNANCE_EVIDENCE
        decision["confidence_label"] = CONFIDENCE_INSUFFICIENT
        decision["evidence_grade"] = EVIDENCE_INSUFFICIENT
        decision["data_contract_alignment"] = CONTRACT_UNKNOWN
        decision["selected_outcome"] = "none"
        decision["dataset_action"] = "No operative governance action is authorized until fetched evidence passes digest verification."
        decision["fix_assessment"] = "The proposed fix cannot be approved or rejected without digest-verified evidence."
        decision["required_controls"] = "Preserve the dataset, prevent irreversible remediation, and provide an allowed HTTPS evidence descriptor with a matching SHA-256 digest."
        decision["required_next_steps"] = "Publish a canonical evidence manifest, submit its HTTPS URL and SHA-256 digest, then request a recheck."
        decision["reasoning_summary"] = "The contract could not bind fetched evidence to the submitted digest. Caller summaries and unverified hashes cannot support an operative governance verdict."

    return decision


def _substantive_match(leader: typing.Dict[str, typing.Any], validator: typing.Dict[str, typing.Any]) -> bool:
    """
    Consensus match on the exact operative outcome and verified foundations.

    Long-form prose remains outside the equality gate because it varies across
    independent models. The fields below are stable governance facts; a
    disagreement on any of them is a disagreement about the actual outcome.
    """
    leader_verdict = _enum(_stringify(leader.get("verdict", "")), ALLOWED_VERDICTS, VERDICT_HUMAN_REVIEW)
    validator_verdict = _enum(_stringify(validator.get("verdict", "")), ALLOWED_VERDICTS, VERDICT_HUMAN_REVIEW)
    if leader_verdict != validator_verdict:
        return False

    if bool(leader.get("evidence_verified", False)) != bool(validator.get("evidence_verified", False)):
        return False
    if _stringify(leader.get("verified_evidence_digests", "")) != _stringify(validator.get("verified_evidence_digests", "")):
        return False

    leader_evidence = _enum(_stringify(leader.get("evidence_grade", "")), ALLOWED_EVIDENCE_GRADES, EVIDENCE_INSUFFICIENT)
    validator_evidence = _enum(_stringify(validator.get("evidence_grade", "")), ALLOWED_EVIDENCE_GRADES, EVIDENCE_INSUFFICIENT)
    if leader_evidence != validator_evidence:
        return False

    leader_alignment = _enum(_stringify(leader.get("data_contract_alignment", "")), ALLOWED_CONTRACT_ALIGNMENT, CONTRACT_UNKNOWN)
    validator_alignment = _enum(_stringify(validator.get("data_contract_alignment", "")), ALLOWED_CONTRACT_ALIGNMENT, CONTRACT_UNKNOWN)
    if leader_alignment != validator_alignment:
        return False

    leader_fix = _enum(_stringify(leader.get("fix_safety", "")), ALLOWED_FIX_SAFETY, FIX_UNKNOWN)
    validator_fix = _enum(_stringify(validator.get("fix_safety", "")), ALLOWED_FIX_SAFETY, FIX_UNKNOWN)
    if leader_fix != validator_fix:
        return False

    if abs(_severity_rank(_stringify(leader.get("severity", ""))) - _severity_rank(_stringify(validator.get("severity", "")))) > 1:
        return False

    return True


def _summary_presence_score(
    missingness_summary: str,
    duplication_summary: str,
    schema_drift_summary: str,
    freshness_summary: str,
    validity_summary: str,
    volume_summary: str,
    historical_baseline_summary: str,
    data_contract_summary: str,
    proposed_fix: str,
    evidence_hash: str,
) -> int:
    score = 0
    fields = [
        missingness_summary,
        duplication_summary,
        schema_drift_summary,
        freshness_summary,
        validity_summary,
        volume_summary,
        historical_baseline_summary,
        data_contract_summary,
        proposed_fix,
        evidence_hash,
    ]
    for item in fields:
        if not _is_blank(item):
            score += 1
    return score


def _case_packet_json(
    case_id: str,
    dataset_name: str,
    dataset_purpose: str,
    data_domain: str,
    downstream_consumer: str,
    business_criticality: str,
    issue_type: str,
    affected_columns: str,
    missingness_summary: str,
    duplication_summary: str,
    schema_drift_summary: str,
    freshness_summary: str,
    validity_summary: str,
    volume_summary: str,
    historical_baseline_summary: str,
    proposed_fix: str,
    rollback_plan: str,
    data_contract_summary: str,
    sample_rows_hash: str,
    schema_snapshot_hash: str,
    evidence_hash: str,
    evidence_manifest_hash: str,
    public_evidence_urls: str,
    analyst_notes: str,
    candidate_outcome_a: str,
    candidate_outcome_b: str,
    candidate_outcome_c: str,
    submitter: str,
    version: str,
    recheck_reason: str,
) -> str:
    packet = {
        "schema_version": "qualora.case_packet",
        "case_id": _limit(case_id, MAX_SHORT_TEXT),
        "dataset": {
            "name": _limit(dataset_name, MAX_SHORT_TEXT),
            "purpose": _limit(dataset_purpose, MAX_MEDIUM_TEXT),
            "domain": _limit(data_domain, MAX_SHORT_TEXT),
            "downstream_consumer": _limit(downstream_consumer, MAX_SHORT_TEXT),
            "business_criticality": _enum(business_criticality, ALLOWED_BUSINESS_CRITICALITY, "unknown"),
        },
        "issue": {
            "type": _enum(issue_type, ALLOWED_ISSUE_TYPES, "other"),
            "affected_columns": _limit(affected_columns, MAX_MEDIUM_TEXT),
            "missingness_summary": _limit(missingness_summary, MAX_LONG_TEXT),
            "duplication_summary": _limit(duplication_summary, MAX_LONG_TEXT),
            "schema_drift_summary": _limit(schema_drift_summary, MAX_LONG_TEXT),
            "freshness_summary": _limit(freshness_summary, MAX_LONG_TEXT),
            "validity_summary": _limit(validity_summary, MAX_LONG_TEXT),
            "volume_summary": _limit(volume_summary, MAX_LONG_TEXT),
            "historical_baseline_summary": _limit(historical_baseline_summary, MAX_LONG_TEXT),
        },
        "governance": {
            "proposed_fix": _limit(proposed_fix, MAX_LONG_TEXT),
            "rollback_plan": _limit(rollback_plan, MAX_LONG_TEXT),
            "data_contract_summary": _limit(data_contract_summary, MAX_LONG_TEXT),
            "analyst_notes": _limit(analyst_notes, MAX_LONG_TEXT),
            "candidate_outcome_a": _limit(candidate_outcome_a, MAX_MEDIUM_TEXT),
            "candidate_outcome_b": _limit(candidate_outcome_b, MAX_MEDIUM_TEXT),
            "candidate_outcome_c": _limit(candidate_outcome_c, MAX_MEDIUM_TEXT),
        },
        "evidence": {
            "sample_rows_hash": _limit(sample_rows_hash, MAX_SHORT_TEXT),
            "schema_snapshot_hash": _limit(schema_snapshot_hash, MAX_SHORT_TEXT),
            "evidence_hash": _limit(evidence_hash, MAX_SHORT_TEXT),
            "evidence_manifest_hash": _limit(evidence_manifest_hash, MAX_SHORT_TEXT),
            "public_evidence_urls": _limit(public_evidence_urls, MAX_MEDIUM_TEXT),
        },
        "meta": {
            "submitter": submitter,
            "version": version,
            "recheck_reason": _limit(recheck_reason, MAX_RECHECK_REASON_CHARS),
        },
    }
    return _json_dumps(packet)


def _compact_case_summary_for_prompt(case_packet_json: str) -> str:
    packet = _json_loads_or_empty(case_packet_json)
    return json.dumps(packet, sort_keys=True, indent=2)


def _build_consensus_prompt(case_packet_json: str, public_evidence_context: str, role: str) -> str:
    return f"""
You are a GenLayer validator acting inside the Qualora Data Quality Governance Oracle.

Role: {role}

You are not a frontend assistant. You are not a Supabase worker.
You are deciding a governance action for a data quality case.

The caller is not allowed to decide the verdict. Candidate outcomes are only analyst hypotheses.
Your job is to independently decide the correct governance action based on:
- dataset purpose and downstream use,
- business criticality,
- issue summaries,
- data contract expectations,
- historical baseline,
- proposed fix and rollback plan,
- evidence hashes and public evidence excerpts,
- risk to downstream consumers if the dataset remains in use,
- risk introduced if the proposed fix is executed.

Evidence boundary:
- PUBLIC EVIDENCE CONTEXT contains only evidence whose fetched bytes matched the SHA-256 digest bound to its URL.
- Caller summaries, analyst notes, candidate outcomes, and standalone hashes are claims, not verified facts.
- Never approve, warn, quarantine, or reject a fix solely from caller claims.
- When no digest-verified evidence is available, the contract will deterministically force "needs_more_evidence".

Return ONLY valid JSON. No markdown. No prose before or after the JSON.

Allowed enum values:
verdict:
- "approved"
- "approved_with_warning"
- "quarantine_dataset"
- "reject_proposed_fix"
- "requires_human_review"
- "needs_more_evidence"

severity:
- "low"
- "medium"
- "high"
- "critical"

confidence_label:
- "high"
- "medium"
- "low"
- "insufficient_evidence"

evidence_grade:
- "strong"
- "adequate"
- "weak"
- "insufficient"

fix_safety:
- "safe"
- "safe_with_controls"
- "unsafe"
- "unknown"

data_contract_alignment:
- "aligned"
- "partially_aligned"
- "violated"
- "unknown"

downstream_risk_level:
- "low"
- "medium"
- "high"
- "critical"

selected_outcome:
- "a"
- "b"
- "c"
- "none"

Decision policy:
1. Choose "approved" only when issue impact is low, evidence is adequate/strong, and downstream risk is low.
2. Choose "approved_with_warning" when use can continue only with monitoring, flags, or controls.
3. Choose "quarantine_dataset" when downstream use is unsafe or business-critical outputs may be materially wrong.
4. Choose "reject_proposed_fix" when the proposed fix is unsafe, destructive, unvalidated, non-reversible, or likely to hide the root cause.
5. Choose "requires_human_review" when the case requires owner judgment, regulatory/business approval, or policy interpretation.
6. Choose "needs_more_evidence" when evidence is insufficient to determine issue severity, fix safety, or downstream blast radius.
7. If data contract is violated and the downstream consumer is business-critical, bias toward quarantine, human review, or rejection of unsafe fixes.
8. If evidence is weak, do not claim high confidence.
9. If the proposed fix lacks a rollback plan, do not mark fix_safety as "safe".
10. Do not copy analyst candidate outcomes blindly. Use them only to label which candidate is closest.

Return exactly this JSON shape:
{{
  "verdict": "...",
  "severity": "...",
  "confidence_label": "...",
  "evidence_grade": "...",
  "fix_safety": "...",
  "data_contract_alignment": "...",
  "downstream_risk_level": "...",
  "selected_outcome": "...",
  "dataset_action": "One sentence instruction for the dataset.",
  "fix_assessment": "One sentence assessment of the proposed fix.",
  "downstream_risk": "One sentence about downstream risk.",
  "reasoning_summary": "Two or three concise sentences explaining the main decision.",
  "required_controls": "Controls required before use/fix/release.",
  "required_next_steps": "Specific next steps for the data owner.",
  "expiry_condition": "When this decision should no longer be relied upon.",
  "appeal_recommendation": "When an appeal or recheck is justified."
}}

CASE PACKET:
{_compact_case_summary_for_prompt(case_packet_json)}

PUBLIC EVIDENCE CONTEXT:
{public_evidence_context}
"""


def _safe_error_decision(reason: str) -> str:
    decision = {
        "schema_version": CONSENSUS_SCHEMA_VERSION,
        "verdict": VERDICT_HUMAN_REVIEW,
        "governance_class": GOVERNANCE_REVIEW,
        "severity": SEVERITY_MEDIUM,
        "confidence_label": CONFIDENCE_LOW,
        "evidence_grade": EVIDENCE_INSUFFICIENT,
        "fix_safety": FIX_UNKNOWN,
        "data_contract_alignment": CONTRACT_UNKNOWN,
        "downstream_risk_level": RISK_MEDIUM,
        "selected_outcome": "none",
        "dataset_action": "Human governance review is required before downstream use continues.",
        "fix_assessment": "Automatic assessment failed, so the proposed fix must not be treated as approved.",
        "downstream_risk": "Downstream risk cannot be reliably determined from the automatic adjudication result.",
        "reasoning_summary": _limit(reason, MAX_REASONING_CHARS),
        "required_controls": "Freeze irreversible changes, preserve evidence, and route the case to a human data owner.",
        "required_next_steps": "Review the case packet and resubmit with clearer evidence if automatic consensus is required.",
        "expiry_condition": "This fallback decision expires when a valid consensus adjudication is completed.",
        "appeal_recommendation": "Recheck is justified because automatic consensus could not safely complete.",
        "evidence_verified": False,
        "verified_evidence_digests": "",
        "evidence_verification_summary": "Consensus failed before evidence could support an operative decision.",
    }
    return _json_dumps(decision)


def _fetch_verified_evidence(public_evidence_urls: str) -> typing.Dict[str, typing.Any]:
    descriptor_texts = _split_pipe(public_evidence_urls, MAX_PUBLIC_URLS)
    if len(descriptor_texts) == 0:
        return {
            "context": "No digest-bound public evidence descriptor was supplied. Caller claims are unverified.",
            "verified_digests": [],
            "summary": "No evidence descriptor supplied.",
        }

    chunks: typing.List[str] = []
    verified_digests: typing.List[str] = []
    for idx, descriptor_text in enumerate(descriptor_texts):
        descriptor = _parse_evidence_descriptor(descriptor_text)
        if len(descriptor) == 0:
            chunks.append("Evidence descriptor " + str(idx + 1) + " rejected by the deterministic source policy.")
            continue

        cleaned = descriptor.get("url", "")
        expected_digest = descriptor.get("sha256", "")

        try:
            response = gl.nondet.web.request(cleaned, method="GET")
            status = getattr(response, "status_code", getattr(response, "status", 200))
            excerpt = ""
            if status >= 200 and status < 400:
                actual_digest = _sha256_hex_bytes(response.body)
                if actual_digest == expected_digest:
                    verified_digests.append(actual_digest)
                    try:
                        excerpt = response.body.decode("utf-8")
                    except Exception:
                        excerpt = "Verified binary evidence; no UTF-8 excerpt available."
                    excerpt = _limit(excerpt, MAX_FETCHED_EVIDENCE_CHARS)
                    chunks.append(
                        "VERIFIED EVIDENCE " + str(idx + 1)
                        + "\nURL: " + cleaned
                        + "\nSHA-256: " + actual_digest
                        + "\nExcerpt:\n" + excerpt
                    )
                else:
                    chunks.append(
                        "Evidence descriptor " + str(idx + 1)
                        + " failed digest verification. Expected " + expected_digest
                        + " but fetched " + actual_digest + "."
                    )
            else:
                chunks.append("Evidence descriptor " + str(idx + 1) + " returned HTTP status " + str(status) + ".")
        except Exception as exc:
            chunks.append(
                "Evidence descriptor " + str(idx + 1)
                + " fetch failed: " + _limit(str(exc), 240)
            )

    summary = str(len(verified_digests)) + " of " + str(len(descriptor_texts)) + " evidence descriptors passed SHA-256 verification."
    if len(verified_digests) != len(descriptor_texts):
        summary = _limit(summary + " Diagnostics: " + " | ".join(chunks), 900)
    return {
        "context": "\n\n---\n\n".join(chunks),
        "verified_digests": verified_digests,
        "summary": summary,
    }


def _analyse_case_with_verified_evidence(
    case_packet_json: str,
    public_evidence_urls: str,
    role: str,
) -> str:
    evidence_result = _fetch_verified_evidence(public_evidence_urls)
    evidence_context = _stringify(evidence_result.get("context", ""))
    prompt = _build_consensus_prompt(case_packet_json, evidence_context, role)
    raw = gl.nondet.exec_prompt(prompt)
    normalised = _normalise_consensus_json(raw)
    normalised = _apply_evidence_policy(
        normalised,
        evidence_result.get("verified_digests", []),
        _stringify(evidence_result.get("summary", "")),
    )
    return _json_dumps(normalised)


# ---------------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------------

class QualoraDataQualityOracle(gl.Contract):
    """
    Qualora's canonical GenLayer governance contract.

    Persistent state is stored as JSON strings and storage-safe maps/arrays.
    This keeps the ABI simple for Next.js while avoiding raw dict/list storage
    problems in GenVM.
    """

    owner: Address
    paused: bool
    protocol_version: str

    total_cases: u256
    total_decisions: u256
    total_rechecks: u256

    case_exists: TreeMap[str, bool]
    case_versions: TreeMap[str, u256]
    case_submitters: TreeMap[str, Address]
    case_status: TreeMap[str, str]
    case_latest_decision_key: TreeMap[str, str]
    case_records: TreeMap[str, str]
    decision_records: TreeMap[str, str]
    case_audit_trails: TreeMap[str, str]
    evidence_to_case: TreeMap[str, str]

    case_registry: DynArray[str]
    decision_registry: DynArray[str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.paused = False
        self.protocol_version = PROTOCOL_VERSION

        self.total_cases = u256(0)
        self.total_decisions = u256(0)
        self.total_rechecks = u256(0)

    # -----------------------------------------------------------------------
    # Internal guards
    # -----------------------------------------------------------------------

    def _only_owner(self):
        if gl.message.sender_address != self.owner:
            raise gl.vmUserError("Only the Qualora contract owner can perform this action.")

    def _not_paused(self):
        if self.paused:
            raise gl.vmUserError("Qualora adjudication is paused by the contract owner.")

    def _require_case_id(self, case_id: str):
        if _is_blank(case_id):
            raise gl.vmUserError("case_id is required.")
        if len(_strip(case_id)) > 96:
            raise gl.vmUserError("case_id is too long.")

    def _require_case_submitter(self, case_id: str):
        """Restrict decision-replacing actions to the case's original party."""
        submitter = self.case_submitters[case_id]
        if gl.message.sender_address != submitter:
            raise gl.vmUserError("Only the original case submitter can request a recheck.")

    def _require_hash_or_reference(self, evidence_hash: str, evidence_manifest_hash: str):
        if _is_blank(evidence_hash) and _is_blank(evidence_manifest_hash):
            raise gl.vmUserError("At least one evidence hash or evidence manifest hash is required.")

    def _require_evidence_descriptors(self, public_evidence_urls: str, evidence_manifest_hash: str):
        descriptors = _split_pipe(public_evidence_urls, MAX_PUBLIC_URLS)
        if len(descriptors) == 0:
            return

        for descriptor_text in descriptors:
            descriptor = _parse_evidence_descriptor(descriptor_text)
            if len(descriptor) == 0:
                raise gl.vmUserError("Evidence references must be allowed HTTPS URLs ending in #sha256=<64 lowercase hex characters>.")

        first = _parse_evidence_descriptor(descriptors[0])
        if _strip(evidence_manifest_hash).lower() != first.get("sha256", ""):
            raise gl.vmUserError("evidence_manifest_hash must match the digest bound to the primary evidence descriptor.")

    def _require_no_frontend_verdict(
        self,
        candidate_outcome_a: str,
        candidate_outcome_b: str,
        candidate_outcome_c: str,
    ):
        if _contains_forbidden_result_key(candidate_outcome_a):
            raise gl.vmUserError("candidate_outcome_a must not contain a caller-supplied verdict object.")
        if _contains_forbidden_result_key(candidate_outcome_b):
            raise gl.vmUserError("candidate_outcome_b must not contain a caller-supplied verdict object.")
        if _contains_forbidden_result_key(candidate_outcome_c):
            raise gl.vmUserError("candidate_outcome_c must not contain a caller-supplied verdict object.")

    def _require_submit_quality(
        self,
        dataset_name: str,
        issue_type: str,
        missingness_summary: str,
        duplication_summary: str,
        schema_drift_summary: str,
        freshness_summary: str,
        validity_summary: str,
        volume_summary: str,
        historical_baseline_summary: str,
        data_contract_summary: str,
        proposed_fix: str,
        evidence_hash: str,
    ):
        if _is_blank(dataset_name):
            raise gl.vmUserError("dataset_name is required.")
        if _enum(issue_type, ALLOWED_ISSUE_TYPES, "other") == "other" and _is_blank(issue_type):
            raise gl.vmUserError("issue_type is required.")

        score = _summary_presence_score(
            missingness_summary,
            duplication_summary,
            schema_drift_summary,
            freshness_summary,
            validity_summary,
            volume_summary,
            historical_baseline_summary,
            data_contract_summary,
            proposed_fix,
            evidence_hash,
        )
        if score < 3:
            raise gl.vmUserError("Case packet is too thin. Provide issue evidence, baseline/context, and proposed governance/fix details.")

    # -----------------------------------------------------------------------
    # Admin
    # -----------------------------------------------------------------------

    @gl.public.write
    def set_paused(self, paused: bool):
        self._only_owner()
        self.paused = paused

    @gl.public.write
    def transfer_ownership(self, new_owner: str):
        self._only_owner()
        if _is_blank(new_owner):
            raise gl.vmUserError("new_owner is required.")
        self.owner = Address(new_owner)

    @gl.public.write
    def mark_case_superseded(self, case_id: str, reason: str):
        self._only_owner()
        self._require_case_id(case_id)
        if case_id not in self.case_exists:
            raise gl.vmUserError("Case not found.")
        self.case_status[case_id] = STATUS_SUPERSEDED
        audit_item = {
            "event": "case_superseded",
            "actor": str(gl.message.sender_address),
            "reason": _limit(reason, MAX_RECHECK_REASON_CHARS),
        }
        existing = self.case_audit_trails.get(case_id, "[]")
        self.case_audit_trails[case_id] = _append_audit(existing, audit_item)

    # -----------------------------------------------------------------------
    # Compatibility submit method
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_case(
        self,
        case_id: str,
        dataset_name: str,
        dataset_purpose: str,
        data_domain: str,
        downstream_consumer: str,
        business_criticality: str,
        issue_type: str,
        affected_columns: str,
        missingness_summary: str,
        duplication_summary: str,
        schema_drift_summary: str,
        freshness_summary: str,
        historical_baseline_summary: str,
        proposed_fix: str,
        data_contract_summary: str,
        sample_rows_hash: str,
        evidence_hash: str,
        analyst_notes: str,
        candidate_outcome_a: str,
        candidate_outcome_b: str,
        candidate_outcome_c: str,
    ):
        """
        Compatibility wrapper for the first Qualora frontend contract call.

        It still runs full GenLayer consensus. Fields not available in the old
        form are passed as empty strings.
        """
        self._submit_case_internal(
            case_id=case_id,
            dataset_name=dataset_name,
            dataset_purpose=dataset_purpose,
            data_domain=data_domain,
            downstream_consumer=downstream_consumer,
            business_criticality=business_criticality,
            issue_type=issue_type,
            affected_columns=affected_columns,
            missingness_summary=missingness_summary,
            duplication_summary=duplication_summary,
            schema_drift_summary=schema_drift_summary,
            freshness_summary=freshness_summary,
            validity_summary="",
            volume_summary="",
            historical_baseline_summary=historical_baseline_summary,
            proposed_fix=proposed_fix,
            rollback_plan="",
            data_contract_summary=data_contract_summary,
            sample_rows_hash=sample_rows_hash,
            schema_snapshot_hash="",
            evidence_hash=evidence_hash,
            evidence_manifest_hash=evidence_hash,
            public_evidence_urls="",
            analyst_notes=analyst_notes,
            candidate_outcome_a=candidate_outcome_a,
            candidate_outcome_b=candidate_outcome_b,
            candidate_outcome_c=candidate_outcome_c,
            recheck_reason="",
            is_recheck=False,
        )

    # -----------------------------------------------------------------------
    # Full submit method for the real product
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_case(
        self,
        case_id: str,
        dataset_name: str,
        dataset_purpose: str,
        data_domain: str,
        downstream_consumer: str,
        business_criticality: str,
        issue_type: str,
        affected_columns: str,
        missingness_summary: str,
        duplication_summary: str,
        schema_drift_summary: str,
        freshness_summary: str,
        validity_summary: str,
        volume_summary: str,
        historical_baseline_summary: str,
        proposed_fix: str,
        rollback_plan: str,
        data_contract_summary: str,
        sample_rows_hash: str,
        schema_snapshot_hash: str,
        evidence_hash: str,
        evidence_manifest_hash: str,
        public_evidence_urls: str,
        analyst_notes: str,
        candidate_outcome_a: str,
        candidate_outcome_b: str,
        candidate_outcome_c: str,
    ):
        """
        Primary MVP entrypoint.

        public_evidence_urls is a pipe-separated list of up to 3 public URLs.
        Example:
        https://.../profile.json|https://.../data-contract.md|https://.../dbt-run.html

        Do not pass private datasets. Use hashes, profile summaries, and public
        docs/evidence pages.
        """
        self._submit_case_internal(
            case_id=case_id,
            dataset_name=dataset_name,
            dataset_purpose=dataset_purpose,
            data_domain=data_domain,
            downstream_consumer=downstream_consumer,
            business_criticality=business_criticality,
            issue_type=issue_type,
            affected_columns=affected_columns,
            missingness_summary=missingness_summary,
            duplication_summary=duplication_summary,
            schema_drift_summary=schema_drift_summary,
            freshness_summary=freshness_summary,
            validity_summary=validity_summary,
            volume_summary=volume_summary,
            historical_baseline_summary=historical_baseline_summary,
            proposed_fix=proposed_fix,
            rollback_plan=rollback_plan,
            data_contract_summary=data_contract_summary,
            sample_rows_hash=sample_rows_hash,
            schema_snapshot_hash=schema_snapshot_hash,
            evidence_hash=evidence_hash,
            evidence_manifest_hash=evidence_manifest_hash,
            public_evidence_urls=public_evidence_urls,
            analyst_notes=analyst_notes,
            candidate_outcome_a=candidate_outcome_a,
            candidate_outcome_b=candidate_outcome_b,
            candidate_outcome_c=candidate_outcome_c,
            recheck_reason="",
            is_recheck=False,
        )

    # -----------------------------------------------------------------------
    # Recheck method
    # -----------------------------------------------------------------------

    @gl.public.write
    def request_recheck(
        self,
        case_id: str,
        recheck_reason: str,
        missingness_summary: str,
        duplication_summary: str,
        schema_drift_summary: str,
        freshness_summary: str,
        validity_summary: str,
        volume_summary: str,
        historical_baseline_summary: str,
        proposed_fix: str,
        rollback_plan: str,
        data_contract_summary: str,
        sample_rows_hash: str,
        schema_snapshot_hash: str,
        evidence_hash: str,
        evidence_manifest_hash: str,
        public_evidence_urls: str,
        analyst_notes: str,
        candidate_outcome_a: str,
        candidate_outcome_b: str,
        candidate_outcome_c: str,
    ):
        """
        Re-adjudicate an existing case when material evidence changes.

        The immutable original case is not deleted. A new version and new
        decision record are created, and latest_decision points to the new
        consensus result.
        """
        self._not_paused()
        self._require_case_id(case_id)

        if case_id not in self.case_exists:
            raise gl.vmUserError("Case not found.")

        self._require_case_submitter(case_id)

        if _is_blank(recheck_reason):
            raise gl.vmUserError("recheck_reason is required.")

        base_case = _json_loads_or_empty(self.case_records.get(case_id, "{}"))
        dataset = base_case.get("dataset", {})
        issue = base_case.get("issue", {})
        governance = base_case.get("governance", {})

        self._submit_case_internal(
            case_id=case_id,
            dataset_name=_stringify(dataset.get("name", "")),
            dataset_purpose=_stringify(dataset.get("purpose", "")),
            data_domain=_stringify(dataset.get("domain", "")),
            downstream_consumer=_stringify(dataset.get("downstream_consumer", "")),
            business_criticality=_stringify(dataset.get("business_criticality", "")),
            issue_type=_stringify(issue.get("type", "")),
            affected_columns=_stringify(issue.get("affected_columns", "")),
            missingness_summary=missingness_summary,
            duplication_summary=duplication_summary,
            schema_drift_summary=schema_drift_summary,
            freshness_summary=freshness_summary,
            validity_summary=validity_summary,
            volume_summary=volume_summary,
            historical_baseline_summary=historical_baseline_summary,
            proposed_fix=proposed_fix,
            rollback_plan=rollback_plan,
            data_contract_summary=data_contract_summary,
            sample_rows_hash=sample_rows_hash,
            schema_snapshot_hash=schema_snapshot_hash,
            evidence_hash=evidence_hash,
            evidence_manifest_hash=evidence_manifest_hash,
            public_evidence_urls=public_evidence_urls,
            analyst_notes=analyst_notes,
            candidate_outcome_a=candidate_outcome_a if not _is_blank(candidate_outcome_a) else _stringify(governance.get("candidate_outcome_a", "")),
            candidate_outcome_b=candidate_outcome_b if not _is_blank(candidate_outcome_b) else _stringify(governance.get("candidate_outcome_b", "")),
            candidate_outcome_c=candidate_outcome_c if not _is_blank(candidate_outcome_c) else _stringify(governance.get("candidate_outcome_c", "")),
            recheck_reason=recheck_reason,
            is_recheck=True,
        )

    # -----------------------------------------------------------------------
    # Core adjudication
    # -----------------------------------------------------------------------

    def _submit_case_internal(
        self,
        case_id: str,
        dataset_name: str,
        dataset_purpose: str,
        data_domain: str,
        downstream_consumer: str,
        business_criticality: str,
        issue_type: str,
        affected_columns: str,
        missingness_summary: str,
        duplication_summary: str,
        schema_drift_summary: str,
        freshness_summary: str,
        validity_summary: str,
        volume_summary: str,
        historical_baseline_summary: str,
        proposed_fix: str,
        rollback_plan: str,
        data_contract_summary: str,
        sample_rows_hash: str,
        schema_snapshot_hash: str,
        evidence_hash: str,
        evidence_manifest_hash: str,
        public_evidence_urls: str,
        analyst_notes: str,
        candidate_outcome_a: str,
        candidate_outcome_b: str,
        candidate_outcome_c: str,
        recheck_reason: str,
        is_recheck: bool,
    ):
        self._not_paused()
        self._require_case_id(case_id)
        self._require_hash_or_reference(evidence_hash, evidence_manifest_hash)
        self._require_evidence_descriptors(public_evidence_urls, evidence_manifest_hash)
        self._require_no_frontend_verdict(candidate_outcome_a, candidate_outcome_b, candidate_outcome_c)
        self._require_submit_quality(
            dataset_name,
            issue_type,
            missingness_summary,
            duplication_summary,
            schema_drift_summary,
            freshness_summary,
            validity_summary,
            volume_summary,
            historical_baseline_summary,
            data_contract_summary,
            proposed_fix,
            evidence_hash,
        )

        exists = case_id in self.case_exists
        if exists and not is_recheck:
            raise gl.vmUserError("Case already exists. Use request_recheck for new evidence or changed remediation.")

        if not exists and is_recheck:
            raise gl.vmUserError("Cannot recheck a case that does not exist.")

        current_version = u256(0)
        if exists:
            current_version = self.case_versions.get(case_id, u256(0))

        next_version = u256(int(current_version) + 1)
        version_text = str(int(next_version))
        submitter_text = str(gl.message.sender_address)

        case_json = _case_packet_json(
            case_id=case_id,
            dataset_name=dataset_name,
            dataset_purpose=dataset_purpose,
            data_domain=data_domain,
            downstream_consumer=downstream_consumer,
            business_criticality=business_criticality,
            issue_type=issue_type,
            affected_columns=affected_columns,
            missingness_summary=missingness_summary,
            duplication_summary=duplication_summary,
            schema_drift_summary=schema_drift_summary,
            freshness_summary=freshness_summary,
            validity_summary=validity_summary,
            volume_summary=volume_summary,
            historical_baseline_summary=historical_baseline_summary,
            proposed_fix=proposed_fix,
            rollback_plan=rollback_plan,
            data_contract_summary=data_contract_summary,
            sample_rows_hash=sample_rows_hash,
            schema_snapshot_hash=schema_snapshot_hash,
            evidence_hash=evidence_hash,
            evidence_manifest_hash=evidence_manifest_hash,
            public_evidence_urls=public_evidence_urls,
            analyst_notes=analyst_notes,
            candidate_outcome_a=candidate_outcome_a,
            candidate_outcome_b=candidate_outcome_b,
            candidate_outcome_c=candidate_outcome_c,
            submitter=submitter_text,
            version=version_text,
            recheck_reason=recheck_reason,
        )

        consensus_json = self._run_consensus(case_json, public_evidence_urls)
        consensus = _normalise_consensus_json(consensus_json)

        decision_key = _decision_key(case_id, version_text)
        decision_record = {
            "schema_version": "qualora.decision_record",
            "protocol": PROTOCOL_NAME,
            "protocol_version": PROTOCOL_VERSION,
            "case_id": case_id,
            "version": version_text,
            "decision_key": decision_key,
            "submitter": submitter_text,
            "is_recheck": is_recheck,
            "case_packet": _json_loads_or_empty(case_json),
            "consensus": consensus,
            "integrity": {
                "sample_rows_hash": _limit(sample_rows_hash, MAX_SHORT_TEXT),
                "schema_snapshot_hash": _limit(schema_snapshot_hash, MAX_SHORT_TEXT),
                "evidence_hash": _limit(evidence_hash, MAX_SHORT_TEXT),
                "evidence_manifest_hash": _limit(evidence_manifest_hash, MAX_SHORT_TEXT),
            },
            "final_status": STATUS_FINALIZED,
        }

        self.case_exists[case_id] = True
        self.case_versions[case_id] = next_version
        if not exists:
            self.case_submitters[case_id] = gl.message.sender_address
        self.case_status[case_id] = STATUS_FINALIZED
        self.case_latest_decision_key[case_id] = decision_key
        self.case_records[case_id] = case_json
        self.decision_records[decision_key] = _json_dumps(decision_record)

        evidence_key = _strip(evidence_hash)
        if evidence_key != "":
            if evidence_key not in self.evidence_to_case:
                self.evidence_to_case[evidence_key] = case_id

        self.decision_registry.append(decision_key)

        audit_event = {
            "event": "case_rechecked" if is_recheck else "case_submitted",
            "actor": submitter_text,
            "decision_key": decision_key,
            "version": version_text,
            "verdict": consensus.get("verdict", VERDICT_HUMAN_REVIEW),
            "governance_class": consensus.get("governance_class", GOVERNANCE_REVIEW),
            "severity": consensus.get("severity", SEVERITY_MEDIUM),
            "evidence_hash": _limit(evidence_hash, MAX_SHORT_TEXT),
            "recheck_reason": _limit(recheck_reason, MAX_RECHECK_REASON_CHARS),
        }
        existing_audit = self.case_audit_trails.get(case_id, "[]")
        self.case_audit_trails[case_id] = _append_audit(existing_audit, audit_event)

        if not exists:
            self.case_registry.append(case_id)
            self.total_cases = u256(int(self.total_cases) + 1)
        else:
            self.total_rechecks = u256(int(self.total_rechecks) + 1)

        self.total_decisions = u256(int(self.total_decisions) + 1)

    def _run_consensus(self, case_packet_json: str, public_evidence_urls: str) -> str:
        """
        Custom GenLayer consensus.

        Leader:
        - fetches optional public evidence,
        - asks the governance LLM for a structured decision,
        - normalizes to canonical JSON.

        Validator:
        - independently fetches the same evidence,
        - independently asks the same governance question,
        - normalizes its own decision,
        - accepts only if stable governance fields are substantively equivalent.

        This avoids the weak pattern where validators only check if the leader
        returned parseable JSON.
        """

        try:
            # Use GenLayer's native EqComparative template for rich LLM output.
            # Validators independently analyze the same verified evidence, then
            # the network compares operative governance fields while allowing
            # reasoning prose and advisory wording to differ.
            result = gl.eq_principle.prompt_comparative(
                lambda: _analyse_case_with_verified_evidence(
                    case_packet_json, public_evidence_urls, "LEADER_OR_VALIDATOR"
                ),
                principle=(
                    "The following fields must agree exactly: verdict, evidence_verified, "
                    "verified_evidence_digests, data_contract_alignment, and downstream_risk_level. "
                    "Severity may differ by at most one level. Evidence must be digest-verified. "
                    "Reasoning, dataset_action, required_next_steps, fix_assessment, and other "
                    "explanatory wording may differ when they support the same operative outcome."
                ),
            )
            return _json_dumps(_normalise_consensus_json(_stringify(result)))
        except Exception as exc:
            return _safe_error_decision("Automatic GenLayer consensus failed safely: " + _limit(str(exc), 420))

    # -----------------------------------------------------------------------
    # Views
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_protocol_meta(self) -> str:
        data = {
            "name": PROTOCOL_NAME,
            "version": self.protocol_version,
            "consensus_schema_version": CONSENSUS_SCHEMA_VERSION,
            "owner": str(self.owner),
            "paused": self.paused,
            "total_cases": str(int(self.total_cases)),
            "total_decisions": str(int(self.total_decisions)),
            "total_rechecks": str(int(self.total_rechecks)),
            "source_of_truth": "GenLayer Intelligent Contract",
        }
        return _json_dumps(data)

    @gl.public.view
    def has_case(self, case_id: str) -> bool:
        return case_id in self.case_exists

    @gl.public.view
    def get_case_packet(self, case_id: str) -> str:
        if case_id not in self.case_exists:
            return _json_dumps({
                "found": False,
                "case_id": case_id,
                "status": "not_found",
            })
        return self.case_records.get(case_id, "{}")

    @gl.public.view
    def get_latest_decision(self, case_id: str) -> str:
        if case_id not in self.case_exists:
            return _json_dumps({
                "found": False,
                "case_id": case_id,
                "status": "not_found",
                "verdict": VERDICT_MORE_EVIDENCE,
                "governance_class": GOVERNANCE_EVIDENCE,
                "dataset_action": "Case not found on-chain.",
            })

        key = self.case_latest_decision_key.get(case_id, "")
        if key == "":
            return _json_dumps({
                "found": False,
                "case_id": case_id,
                "status": "missing_decision",
                "verdict": VERDICT_HUMAN_REVIEW,
                "governance_class": GOVERNANCE_REVIEW,
                "dataset_action": "Case exists but latest decision pointer is missing.",
            })

        return self.decision_records.get(key, "{}")

    @gl.public.view
    def get_decision_by_version(self, case_id: str, version: str) -> str:
        key = _decision_key(case_id, version)
        if key not in self.decision_records:
            return _json_dumps({
                "found": False,
                "case_id": case_id,
                "version": version,
                "status": "not_found",
            })
        return self.decision_records.get(key, "{}")

    @gl.public.view
    def get_case_audit_trail(self, case_id: str) -> str:
        if case_id not in self.case_exists:
            return "[]"
        return self.case_audit_trails.get(case_id, "[]")

    @gl.public.view
    def get_case_status(self, case_id: str) -> str:
        if case_id not in self.case_exists:
            return "not_found"
        return self.case_status.get(case_id, "unknown")

    @gl.public.view
    def get_case_version(self, case_id: str) -> str:
        if case_id not in self.case_exists:
            return "0"
        return str(int(self.case_versions.get(case_id, u256(0))))

    @gl.public.view
    def get_case_count(self) -> str:
        return str(int(self.total_cases))

    @gl.public.view
    def get_decision_count(self) -> str:
        return str(int(self.total_decisions))

    @gl.public.view
    def get_recheck_count(self) -> str:
        return str(int(self.total_rechecks))

    @gl.public.view
    def get_case_ids(self) -> str:
        result: typing.List[str] = []
        for idx in range(len(self.case_registry)):
            result.append(self.case_registry[idx])
        return _json_dumps(result)

    @gl.public.view
    def get_case_ids_page(self, offset: str, limit: str) -> str:
        start = 0
        count = 20
        try:
            start = int(offset)
        except Exception:
            start = 0
        try:
            count = int(limit)
        except Exception:
            count = 20

        if start < 0:
            start = 0
        if count < 1:
            count = 1
        if count > MAX_REGISTRY_PAGE:
            count = MAX_REGISTRY_PAGE

        end = start + count
        total = len(self.case_registry)
        if end > total:
            end = total

        result: typing.List[str] = []
        for idx in range(start, end):
            result.append(self.case_registry[idx])

        return _json_dumps({
            "offset": str(start),
            "limit": str(count),
            "total": str(total),
            "items": result,
        })

    @gl.public.view
    def get_decision_keys_page(self, offset: str, limit: str) -> str:
        start = 0
        count = 20
        try:
            start = int(offset)
        except Exception:
            start = 0
        try:
            count = int(limit)
        except Exception:
            count = 20

        if start < 0:
            start = 0
        if count < 1:
            count = 1
        if count > MAX_REGISTRY_PAGE:
            count = MAX_REGISTRY_PAGE

        end = start + count
        total = len(self.decision_registry)
        if end > total:
            end = total

        result: typing.List[str] = []
        for idx in range(start, end):
            result.append(self.decision_registry[idx])

        return _json_dumps({
            "offset": str(start),
            "limit": str(count),
            "total": str(total),
            "items": result,
        })

    @gl.public.view
    def get_case_summary_card(self, case_id: str) -> str:
        if case_id not in self.case_exists:
            return _json_dumps({
                "found": False,
                "case_id": case_id,
                "status": "not_found",
            })

        case_packet = _json_loads_or_empty(self.case_records.get(case_id, "{}"))
        decision_key = self.case_latest_decision_key.get(case_id, "")
        decision = _json_loads_or_empty(self.decision_records.get(decision_key, "{}"))
        consensus = decision.get("consensus", {})

        dataset = case_packet.get("dataset", {})
        issue = case_packet.get("issue", {})
        integrity = decision.get("integrity", {})

        card = {
            "found": True,
            "case_id": case_id,
            "version": self.get_case_version(case_id),
            "status": self.case_status.get(case_id, "unknown"),
            "dataset_name": _stringify(dataset.get("name", "")),
            "data_domain": _stringify(dataset.get("domain", "")),
            "downstream_consumer": _stringify(dataset.get("downstream_consumer", "")),
            "business_criticality": _stringify(dataset.get("business_criticality", "")),
            "issue_type": _stringify(issue.get("type", "")),
            "verdict": _stringify(consensus.get("verdict", "")),
            "governance_class": _stringify(consensus.get("governance_class", "")),
            "severity": _stringify(consensus.get("severity", "")),
            "confidence_label": _stringify(consensus.get("confidence_label", "")),
            "evidence_grade": _stringify(consensus.get("evidence_grade", "")),
            "evidence_verified": bool(consensus.get("evidence_verified", False)),
            "verified_evidence_digests": _stringify(consensus.get("verified_evidence_digests", "")),
            "evidence_verification_summary": _stringify(consensus.get("evidence_verification_summary", "")),
            "fix_safety": _stringify(consensus.get("fix_safety", "")),
            "downstream_risk_level": _stringify(consensus.get("downstream_risk_level", "")),
            "dataset_action": _stringify(consensus.get("dataset_action", "")),
            "evidence_hash": _stringify(integrity.get("evidence_hash", "")),
            "latest_decision_key": decision_key,
        }
        return _json_dumps(card)

    @gl.public.view
    def find_case_by_evidence_hash(self, evidence_hash: str) -> str:
        key = _strip(evidence_hash)
        if key == "":
            return ""
        return self.evidence_to_case.get(key, "")
