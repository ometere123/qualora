# Qualora v2.0.2 Security and Stack Validation

Validated on StudioNet on July 13, 2026. This report records observed behavior; it is not a guarantee of a reward or of future validator behavior.

## Three-column review

| Team recommendation / ideal GenLayer fit | Qualora v2.0.2 implementation | Verified result and residual risk |
| --- | --- | --- |
| One serious project, not thin variations | One data-quality governance product joins profiling, evidence publication, case governance, remediation controls, audit history, and GenLayer consensus. | Strong fit. The repository is a single integrated product, not a set of renamed demos. |
| GenLayer must be necessary, not AI attached to an ordinary app | GenLayer resolves an operative multi-party governance decision: allow, warn, quarantine, reject a fix, require review, or require evidence. The decision and recheck history are contract state. | Strong fit. Consensus controls a consequential shared outcome; the product is not an advice or summary wrapper. |
| Validators must check the actual outcome, not JSON formatting | Validators independently fetch evidence, bind bytes to SHA-256, independently analyse the case, and compare verdict, governance class, evidence verification, digest set, evidence grade, contract alignment, fix safety, and severity tolerance. | Strong fit. `quarantine_dataset` and `reject_proposed_fix` are deliberately non-equivalent. Residual: LLM judgment can still vary, so non-substantive severity variation is limited to one rank. |
| Decisions must use real verifiable evidence, not user claims alone | Evidence must be an allowlisted HTTPS descriptor ending in `#sha256=<digest>`. Leader and validators fetch it independently. Without a verified digest, deterministic policy forces `needs_more_evidence` and forbids an operative action. | Passed live. Production evidence digest `b4df2823…77bc2` verified on-chain and produced a substantive quarantine decision. Availability of the public host remains an operational dependency; failures are fail-closed and diagnostic. |
| Only an authorized case party may replace the latest governance decision | The original submitter is stored immutably. `request_recheck` requires `gl.message.sender_address` to match that submitter. | Passed live with a funded attacker: the unauthorized transaction finalized but case version and latest decision remained unchanged. Authorized recheck advanced version 1 to 2 and preserved the original party. |
| Evidence should be privacy-safe and reproducible | The app publishes a canonical summary-only manifest, never raw rows or credentials, using an unguessable public token. The exact manifest JSON is hashed and served through a public immutable endpoint. | Migration `0004_verified_evidence_manifests.sql` is applied. Residual: deployment operators must keep the Vercel/Supabase evidence endpoint available. |
| Contract behavior should be observable and recover safely | Evidence summaries report the verified count and sanitized failure diagnostics. No-evidence, fetch failure, digest mismatch, and consensus failure cannot authorize an operative decision. | Passed unit, linter, build, and live fail-closed tests. The StudioNet `Response.status` compatibility issue was found live and fixed in v2.0.2. |

## Final deployment

- Contract: `0xa45FD2E0A4a4858279872454fa592Aee1FAB87e1`
- Deployment transaction: `0x20e64f66c6551a54516668e002233758ba641b29187eae2e8da890ad7a776f1a`
- Protocol: `2.0.2`; consensus schema: `qualora.consensus.v2`
- Production app: <https://qualoraa.vercel.app>
- Production evidence smoke artifact: <https://qualoraa.vercel.app/api/evidence/smoke>

## Conclusive live matrix

Case `qa-v2-live-1783961864275` passed every assertion:

1. No evidence forced `needs_more_evidence`, `evidence_verified=false`, and `evidence_grade=insufficient`.
2. Funded unauthorized recheck transaction `0x4623bc67ad0749158bce9467d6e6d75f8cee563f343df73b41e58c3fe911c3dd` left version 1 and the latest decision unchanged.
3. Authorized recheck transaction `0x271f01ceb767066d59f7acbdf677a4192c4788c09d078bfda19fa7e752c2134d` advanced the case to version 2.
4. The original case party remained immutable.
5. Validators fetched and verified the exact production digest `b4df2823725c6d39c014362425d7b8f94ef095f3b1dc947f7c148c7a81277bc2`.
6. The public summary exposed the same verified digest and verification state.

The final live verdict was `quarantine_dataset` with strong evidence. This demonstrates actual evidence-based outcome validation, not output-format validation.

## Automated validation

- Official `genvm-linter` 0.11.0: 3/3 checks passed.
- Contract behavioral tests: 8/8 passed.
- App/wiring QA tests: 13/13 passed.
- TypeScript: passed with no errors.
- Next.js production build and Vercel deployment: passed; existing non-blocking lint warnings remain in unrelated UI files.

## Database reset

Migration 0004 was applied to the Qualora Supabase project. Application data and Qualora evidence objects were reset for a clean v2 start. Verification returned 11 preserved `auth.users` and zero app profiles, workspaces, governance cases, dataset profiles, mirrored verdicts, and evidence objects.

## Honest rating

Qualora v2.0.2 is a defensible **9/10 submission** against the stated recommendations and an approximately **9.5/10 architectural fit** for GenLayer. A 10/10 or a reward cannot be guaranteed because scoring is subjective and external availability and nondeterministic model behavior cannot be eliminated. The previously material weaknesses—unauthorized replacement, caller-only evidence, format-only equivalence, and fail-open evidence handling—are resolved and live-tested.
