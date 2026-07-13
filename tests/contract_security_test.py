import ast
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "QualoraDataQualityOracle.py"


def load_contract_policy():
    source = CONTRACT.read_text(encoding="utf-8")
    tree = ast.parse(source)
    selected = []
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            continue
        if isinstance(node, ast.ImportFrom) and node.module == "genlayer":
            continue
        if isinstance(node, (ast.Import, ast.ImportFrom, ast.Assign, ast.AnnAssign, ast.FunctionDef)):
            selected.append(node)
    module = ast.Module(body=selected, type_ignores=[])
    ast.fix_missing_locations(module)
    namespace = {}
    exec(compile(module, str(CONTRACT), "exec"), namespace)
    return namespace


POLICY = load_contract_policy()


class EvidenceDescriptorTests(unittest.TestCase):
    def test_accepts_digest_bound_allowed_https_source(self):
        digest = "a" * 64
        parsed = POLICY["_parse_evidence_descriptor"](
            f"https://raw.githubusercontent.com/ometere123/qualora/master/evidence.json#sha256={digest}"
        )
        self.assertEqual(parsed["sha256"], digest)
        self.assertEqual(parsed["host"], "raw.githubusercontent.com")

    def test_rejects_missing_or_malformed_digest(self):
        parse = POLICY["_parse_evidence_descriptor"]
        self.assertEqual(parse("https://raw.githubusercontent.com/example/evidence.json"), {})
        self.assertEqual(parse("https://raw.githubusercontent.com/example/evidence.json#sha256=abc"), {})

    def test_rejects_insecure_private_and_unapproved_sources(self):
        digest = "b" * 64
        parse = POLICY["_parse_evidence_descriptor"]
        blocked = [
            f"http://raw.githubusercontent.com/file#sha256={digest}",
            f"https://localhost/file#sha256={digest}",
            f"https://127.0.0.1/file#sha256={digest}",
            f"https://10.0.0.4/file#sha256={digest}",
            f"https://192.168.1.9/file#sha256={digest}",
            f"https://169.254.169.254/latest/meta-data#sha256={digest}",
            f"https://example.com/file#sha256={digest}",
            f"https://user@example.vercel.app/file#sha256={digest}",
            f"https://example.vercel.app:444/file#sha256={digest}",
        ]
        for descriptor in blocked:
            with self.subTest(descriptor=descriptor):
                self.assertEqual(parse(descriptor), {})


class DeterministicEvidencePolicyTests(unittest.TestCase):
    def base_decision(self):
        return POLICY["_normalise_consensus_json"]("""{
          "verdict":"approved",
          "severity":"low",
          "confidence_label":"high",
          "evidence_grade":"strong",
          "fix_safety":"safe",
          "data_contract_alignment":"aligned",
          "downstream_risk_level":"low"
        }""")

    def test_no_verified_evidence_forces_needs_more_evidence(self):
        result = POLICY["_apply_evidence_policy"](self.base_decision(), [], "No descriptor supplied")
        self.assertEqual(result["verdict"], "needs_more_evidence")
        self.assertEqual(result["governance_class"], "evidence")
        self.assertEqual(result["confidence_label"], "insufficient_evidence")
        self.assertEqual(result["evidence_grade"], "insufficient")
        self.assertFalse(result["evidence_verified"])

    def test_verified_digest_preserves_operational_verdict(self):
        digest = "c" * 64
        result = POLICY["_apply_evidence_policy"](self.base_decision(), [digest], "1 of 1 verified")
        self.assertEqual(result["verdict"], "approved")
        self.assertTrue(result["evidence_verified"])
        self.assertEqual(result["verified_evidence_digests"], digest)


class SubstantiveConsensusTests(unittest.TestCase):
    def decision(self, verdict="quarantine_dataset", evidence_grade="adequate"):
        return {
            "verdict": verdict,
            "severity": "high",
            "evidence_grade": evidence_grade,
            "fix_safety": "safe_with_controls",
            "data_contract_alignment": "violated",
            "evidence_verified": True,
            "verified_evidence_digests": "d" * 64,
        }

    def test_exact_operational_outcome_matches(self):
        self.assertTrue(POLICY["_substantive_match"](self.decision(), self.decision()))

    def test_quarantine_and_reject_fix_are_not_equivalent(self):
        self.assertFalse(
            POLICY["_substantive_match"](
                self.decision("quarantine_dataset"),
                self.decision("reject_proposed_fix"),
            )
        )

    def test_evidence_grade_disagreement_is_not_consensus(self):
        self.assertFalse(
            POLICY["_substantive_match"](
                self.decision(evidence_grade="adequate"),
                self.decision(evidence_grade="weak"),
            )
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
