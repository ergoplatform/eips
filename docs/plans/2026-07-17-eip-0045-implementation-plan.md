# EIP-0045 Native STARK Verification Implementation Plan

**Status:** Active execution; corrected B1-B3 closed for the preactivation candidate, B4-B8 remain activation blockers
**Updated:** 2026-07-20
**Author:** A. Shannon
**Normative source:** [eip-0045.md](../../eip-0045.md)
**Non-normative design history:** `2026-07-17-eip-0045-activatable-design.md`

## 1. Objective

Deliver an independently implementable, directly usable, consensus-native
STARK verifier for one normal Ergo transaction. The first activatable profile
is the exact bounded RISC Zero v3.0.5 succinct receipt profile with only the
reviewed terminal `lift`, `join`, and `resolve` controls.

The work is complete only when the prose, content-addressed profile package,
SigmaState implementation, node integration, independent oracle, transaction
fixtures, metering evidence, and activation package agree byte-for-byte on all
deterministic content and archived KAT files, and invariant-for-invariant on
fresh randomized shipping proofs.

The reproducible single-lift B1-B3 candidate is retained as superseded
evidence. Corrected B1-B3 now bind the outermost `lift`/`join`/`resolve` policy;
B2 is unchanged. This plan still does not freeze `dispatchJit` or
`fixedJit`; those remain outputs of B5, not inputs to be guessed in prose.
Artifact kinds are fixed as `1` for canonical algorithm ASCII and `2` for
binary verifier data.

The preactivation implementation PR becomes review-ready when the four-child
wire/compiler surface, unavailable-by-default host capability, v4 whole-input
preflight API, and B1-B3 candidate resources are inspectable without a
selectable schedule or transition. This milestone is distinct from activation
readiness, which requires B4-B8 and the resulting network package to close.

## 2. Non-negotiable execution rules

1. Correct the cryptographic rationale before changing the normative EIP.
2. Stabilize the normative EIP before presenting implementation code as the
   implementation of EIP-0045.
3. Reproduce the pinned shipping prover before freezing profile artifacts.
4. Freeze the verifier predicate before calibrating its fixed consensus cost.
5. Never use wall-clock time or one machine multiplier as a consensus formula.
6. Keep profile validity, cost, lifecycle, and admission policy as separate
   authorities.
7. Do not activate from placeholder vectors, a placeholder verifier, or a
   manifest whose referenced artifact bytes and resulting identity remain
   incomplete or unreproduced.
8. Treat every serializer, hash preimage, lifecycle transition, exception path,
   and validation purpose as consensus- or security-critical.
9. Keep node production integration in its own repository and review series;
   do not mix it into the SigmaState wire-format patch.
10. Use dedicated clean branches and preserve unrelated work in every
    repository.

## 3. Cross-repository delivery sequence

| Phase | Deliverable | May proceed in parallel with |
|---:|---|---|
| 0 | Baseline and traceability ledger | Nothing |
| 1 | Rewritten cryptographic rationale | Upstream source inventory |
| 2 | Rewritten normative EIP | Reproduction harness preparation |
| 3 | Pinned RISC Zero reproduction package | Sigma wire/compiler preparation |
| 4 | Frozen algorithm and binary-data artifacts | Transaction fixture generator |
| 5 | Final profile manifest and `profileId` | Sigma host-capability scaffolding |
| 6 | Shipping-prover KATs and serialized transaction fixtures | Sigma parser/serializer tests |
| 7 | SigmaState wire and compiler | Independent profile decoder |
| 8 | SigmaState host capability and verifier | Independent verifier |
| 9 | Whole-input activation/fallback semantics | Node manifest parser tests |
| 10 | Ergo node activation binding | Cost-census preparation |
| 11 | Admission and candidate protection | Cost census and benchmarks |
| 12 | Frozen cost schedules and transition snapshots | Cross-implementation testing |
| 13 | Full compatibility, differential, and end-to-end tests | Nothing |
| 14 | Activation package and release gates | Nothing |

No phase may consume a provisional value as if it were frozen. A later phase
may build scaffolding against named placeholders only when its tests prove that
the placeholder cannot be selected by an activation snapshot.

## 4. Phase 0 - Baseline and traceability

### Task 0.1 - Record immutable source pins

**Repository:** EIPs

**Files:**

- `docs/plans/2026-07-17-eip-0045-activatable-design.md`
- `docs/plans/2026-07-17-eip-0045-implementation-plan.md`

**Work:**

- Record the EIPs, SigmaState, RISC Zero, and future node base commits used by
  the implementation campaign.
- Record `730c6c15a8da4d882cf24f849a1f230debfd3662` only as the original #1116
  head audited before the four-child/profile rewrite. The final audited
  implementation is `9372697f789619999a21baf42b7656719eb26d47`, based on
  SigmaState `61ddfac896857aa7da578a68be27792558d1023b`.
- Confirm RISC Zero v3.0.5 commit
  `8eb06ab020a92dc5b63ba6dd0836d432aba6d890`.
- Record the exact initial opcode byte `0xB9` and four-child ABI.
- Record every open output and every closed construction output in one explicit
  blocker table.

**Exit criteria:**

- No normative value is sourced only from a branch name or moving tag.
- The ledger distinguishes frozen B1-B3 artifact/identity values from open
  `dispatchJit`, `fixedJit`, schedule, transition, and activation values.

### Task 0.2 - Create a requirement-to-evidence matrix

**Repository:** EIPs

**File:**

- `docs/eip-0045-traceability.md`

**Work:**

For every architecture requirement, assign exactly one normative owner and at
least one evidence owner:

```text
requirement -> rationale -> EIP rule -> artifact/manifest field
            -> implementation site -> positive fixture -> negative fixture
```

The matrix must distinguish global opcode rules from profile rules. It must
also distinguish conformance evidence from normative material.

**Exit criteria:**

- Every activation gate has an evidence row.
- No profile-specific acceptance rule is owned only by prose outside the
  content-addressed profile package. Global opcode rules remain owned by the
  normative EIP.

## 5. Phase 1 - Correct the public reasoning first

### Task 1.1 - Replace the cryptographic rationale

**Repository:** EIPs

**File:**

- `eip-0045-cryptographic-rationale.md`

**Work:**

Rewrite the document rather than extending the obsolete bespoke profile. The
new structure must cover:

1. the bounded problem and direct-transaction objective;
2. why the first profile follows a pinned shipping prover;
3. separation of global ABI, immutable profile, artifacts, metering, lifecycle,
   transition, and admission policy;
4. chain, profile, program, contract, and application-payload binding;
5. the actual RISC Zero v3 succinct outermost `lift`/`join`/`resolve` boundary,
   including private child-control and assumption-root semantics;
6. the approximately 95.2-bit conjectured diagnostic estimate and its limits;
7. fixed precharge plus admission-layer CPU and memory protection;
8. the 256 KiB node-policy envelope for one direct transaction;
9. activation, irreversible quarantine, stale-node fallback, and reorg safety;
10. rejected alternatives, activation blockers, and pinned primary sources.

Retain the useful discipline from the previous draft: do not infer JIT units
from milliseconds, do not turn component estimates into an end-to-end claim,
do not swallow cost exceptions, and do not let transaction-declared values
select verifier work.

Remove the obsolete initial-activation architecture: Ext16, Poseidon1,
Blake2b transcript, `Q=35`, `B=2048`, radix-8 DEEP-FRI, `vmType`,
`costParams`, declared-versus-actual metering, and any 128-bit or
post-quantum guarantee.

**Checks:**

```text
rg -n "costParams|vmType|Ext16|Poseidon1|Q ?= ?35|B ?= ?2048|2\^-129|zero-conf|five-child" eip-0045-cryptographic-rationale.md
rg -n "128-bit|post-quantum|never throws|maxTransactionSize" eip-0045-cryptographic-rationale.md
git diff --check -- eip-0045-cryptographic-rationale.md
```

Any remaining hit must be an explicitly labelled rejected or historical
alternative. The document must be ASCII, LF-only, contain no BOM or NUL, and
end in exactly one LF.

**Exit criteria:**

- The rationale explains why the proposed architecture exists without
  pretending that provisional values are final.
- Security language is confidence-calibrated and profile-specific.
- The rationale does not duplicate byte-exact artifact grammars.

### Task 1.2 - Independent claim audit

Have a reviewer trace every numerical and security claim to a pinned primary
source, a reproducible calculation, or an explicit conjectural model. Mark any
unsupported claim as a blocker or remove it.

**Exit criteria:**

- No percentage, bit-security value, size, opcode cost, or proof dimension is
  presented without its scope and provenance.

## 6. Phase 2 - Rebuild the normative EIP

### Task 2.1 - Replace the five-child specification

**Repository:** EIPs

**File:**

- `eip-0045.md`

**Work:**

- Specify exactly four children in wire order:

```text
proofChunks, applicationPayload, programId, profileId
```

- Remove `vmType`, `costParams`, script-selected verifier parameters, and the
  conceptual dynamic zkVM registry.
- Keep raw opcode byte `0xB9`.
- Specify evaluation order: feature preflight, `profileId`, authenticated
  context, dispatch charge, lifecycle, fixed profile charge, remaining
  children, statement, claim, parser, verifier.
- Specify `Absent`, `Active`, `Quarantined`, `OpcodeUnavailable`, malformed
  proof, cost limit, and unknown-future-profile outcomes separately.

### Task 2.2 - Add byte-exact global rules

Specify normatively:

- `ErgoStatementV1` and its 159-byte fixed prefix;
- exact `chainDomainId` derivation from the decoded height-1 genesis header ID;
- `contractId = BLAKE2b-256(SELF.propositionBytes)`;
- exact RISC Zero claim construction and digest byte order;
- raw seal length 222,668 bytes;
- global canonical chunk derivation from manifest-owned `exactProofBytes`, with
  capacity 65,535, full non-final chunks, and one exact remainder chunk;
- the resulting first-profile partition
  65,535 / 65,535 / 65,535 / 26,063;
- little-endian raw words, reduced-BabyBear range checks and Montgomery decode
  for indices 0 through 31, raw zero at every odd padding index from 1 through
  15, decoded `u32 <= 0xffff` at every halfword index from 16 through 31, and
  strict EOF;
- 16,384-byte application-payload limit;
- direct-transaction serialization measurements and node-policy status.

### Task 2.3 - Add profile and lifecycle rules

Specify:

- normative algorithm artifact versus binary-data artifact ownership;
- strict profile-manifest decoding and domain-separated `profileId`;
- fixed schedule grammar and nondecreasing repricing;
- full-snapshot transition manifest and transition hash;
- exact validation-settings-update binding;
- authenticated protocol generation from the integer `BlockVersion` parameter;
- compiled historical tables, carry-forward, reorg behavior, and startup
  invariants;
- irreversible `Absent -> Active -> Quarantined` lifecycle;
- initial opcode activation and Rule 1002 update;
- whole-input future-generation preflight and purpose-dependent fallback.

### Task 2.4 - Add adversarial matrix and activation gates

Copy the architecture requirements into testable normative obligations, not
marketing prose. Include hidden features materialized by
`DeserializeContext` and `DeserializeRegister`, dead branches, Boolean
composition, malformed static IDs, delayed-cost wrappers, transition-update
mismatch, reorg, and admission exhaustion.

**Checks for Tasks 2.1-2.4:**

```text
rg -n "costParams|vmType|Ext16|Poseidon1|Q ?= ?35|B ?= ?2048|zero-conf|five-child" eip-0045.md
git diff --check -- eip-0045.md
```

**Exit criteria:**

- Two independent implementers can derive identical accepted bytes, statement,
  claim, lifecycle result, and cost-selection path from the EIP and frozen
  profile package.
- All remaining `TBD` values are activation outputs with explicit producers.

## 7. Phase 3 - Reproduce the pinned shipping profile

**Repository:** standalone `eip-0045-profile`

The reproduction harness, frozen profile package, and vector corpus use one
dedicated repository root named `eip-0045-profile`. Start it as a local
standalone repository under Apache-2.0 so the code license is compatible with
the pinned upstream implementation and includes an explicit patent grant. Fix
its public remote and release policy before first publication. All paths in
Phases 3 through 6 are relative to that root.

### Task 3.1 - Build the hermetic upstream lock generator

**Files:**

- `Cargo.toml`
- `Cargo.lock`
- `rust-toolchain.toml`
- `Dockerfile.reproduction`
- `.dockerignore`
- `reproduction/schema-v1.json`
- `reproduction/runs/<runId>/RunPrecommitV1.json`
- `reproduction/runs/<runId>/RunEvidenceV1.json`
- `reproduction/runs/<runId>/RunEvidenceV1.sig`
- `reproduction/runs/<runId>/proof-output/`
- `reproduction/README.md`
- `reproduction/run.ps1`
- `reproduction/run.sh`
- `reproduction/src/main.rs`
- `reproduction/src/lock.rs`
- `reproduction/src/oracle.rs`

Record host Rust 1.89, RISC Zero guest Rust 1.88.0, both target triples, the
guest-builder OCI image for platform `linux/amd64` as
`risczero/risc0-guest-builder@sha256:3e12f71bacd27527a61dea96fa0e53e468c99aa261d3a1019b593f6dbd943eb3`,
crate graph, feature flags, RISC Zero commit, local-prover and development-mode
settings, prover options, guest source/lock/ELF digests, image ID, and every
deterministic artifact digest. The harness must run offline after dependencies
and the pinned image are cached.
Use a machine-local or container volume for `CARGO_TARGET_DIR`; no build output
belongs in the synchronized workspace.

The exact Cargo feature set is part of the lock. It excludes `witgen_debug` and
every test/debug feature that substitutes deterministic witness values or
disables ZK noise. The final `LOCK.json` is immutable and frozen-only: it
contains deterministic sources, tools, profile data, archived KAT digests, and
`reproductionSchemaSha256`. Phase 3 builds and tests the lock generator against
ignored candidate outputs; it does not publish the final path. Task 6.1 creates
the final lock only after the archived KAT digests exist. Store
`schema-v1.json` as the exact UTF-8 RFC 8785 JCS serialization of its I-JSON
object and define
`reproductionSchemaSha256 = SHA-256(exact canonical schema-v1.json bytes)`.
Define `reproductionLockSha256` as `SHA-256` of the exact canonical `LOCK.json`
bytes. Precommits, challenges, fingerprints, fresh proof digests,
proof-dependent intermediates, and per-run results live only under
`reproduction/runs/<runId>/`; they never enter `LOCK.json` or its digest.
For reproduction evidence, `schema-v1.json` and its strict validator are the
authority for exact RFC 8785 JCS bytes; EIP Section 15.2 defines the B4 corpus
obligations but does not restate the JCS grammar.
`schema-v1.json` defines a finite ordered checkpoint set, names, exact digest
preimages and encodings, and the digest algorithm. Compare proof-dependent
Rust/JVM intermediates only for that checkpoint set and the same seal. This
schema is evidence-only and cannot redefine the verifier predicate.

Build a dedicated generation binary from a verified clean checkout of the
pinned commit. Require `git diff --exit-code`, an empty status, no Cargo
`[patch]`, replacement, or external path override of pinned source, and a
captured `cargo metadata` report proving the effective manifest/source paths.
Record the exact enabled features, effective cfg, and SHA-256 of the generation
binary. The separately built instrumented oracle may only consume seals that
the clean generation binary has already produced.

The schema also defines exact `RunPrecommitV1` and aggregate `RunEvidenceV1`
encodings, and the harness implements their strict validators, detached strict
pure-Ed25519 evidence-signature verification, and unsigned anchor preparation.
Phase 3 may use explicitly synthetic records and test keys to test those tools,
but it MUST NOT create, anchor, or claim a final B7 precommit: final `profileId`,
`contractId`, statement fixtures, and the frozen lock/schema are not all
available yet. The two independent final challenge runs are executed only in
Task 13.5 after those inputs and the JVM verifier are frozen. The harness never
signs or broadcasts an Ergo transaction; any mainnet transaction signing and
broadcast is a separately approved external governance action. Off-chain
`RunEvidenceV1` signatures use the separate evidence-signing path.

**Commands:**

```text
reproduction/run.ps1 build
reproduction/run.ps1 test
reproduction/run.ps1 reproduce-invariants
```

### Task 3.2 - Generate candidates for every required succinct family

Generate one candidate archive and at least one unmodified randomized candidate
receipt for each of these cases:

- eight one-segment normal `lift_rv32im_v2` receipts for `po2 = 15..22`;
- one real multi-segment receipt whose terminal control is `join`;
- one real assumption-bearing receipt whose terminal control is `resolve`;
- one receipt with resolve-then-join ancestry and terminal `join`;
- OK claim;
- empty final assumptions after any required resolution;
- direct `env::commit_slice(ErgoStatementV1)` journal;
- no terminal identity, union, unwrap, PoVW, or final identity normalization.

Record the complete available control/claim transcript needed to demonstrate
typed composition, while recognizing that child control IDs are private
witnesses. The allowlist filters only the reconstructed outermost code root.
An allowed join may contain children from excluded outermost families. A
terminal resolve may discharge a guest-committed assumption under any explicit
control root; zero denotes self-composition under the conditional receipt root.
Record the guest/application trust policy and prove `programId` binds it; do
not claim that Ergo silently authenticates arbitrary assumption roots.

Export the complete receipt, raw seal, journal, image ID, claim, control ID,
control root, verifier result, and a metadata report. The raw seal comes only
from `SuccinctReceipt::get_seal_bytes()`; upstream receipt serialization is a
separate oracle artifact and is never confused with the raw-seal consensus
input encoding. A particular randomized KAT seal is evidence, not a normative
proof value.

The v3.0.5 prover samples fresh ZK noise, so a new generation is expected to
produce different receipt bytes, raw seals, and proof digests. "Canonical"
describes strict per-proof encoding, not unique proof bytes. These Phase 3
receipts exercise upstream structure using inputs explicitly marked candidate;
they are not B7 evidence and are never promoted by renaming. After B3, Task 6.1
archives one immutable digest-bound final receipt and seal for every required
positive case, and Task 13.5 separately performs the final challenge-bound runs. Never patch or seed the
shipping prover, remove ZK noise, use development mode, or hand-assemble a seal
to make proof bytes repeat.

Exercise the complete statement, claim, receipt export, strict decoding, and
run-evidence validators with synthetic non-final identifiers and challenges.
Every generated record and output directory must be covered by a separate
machine-checked candidate-corpus manifest. Publication tooling rejects every
path named by that manifest from the frozen KAT and B7 evidence manifests.

Require an empty output directory before each candidate generation. Record
`candidateArchiveSealSha256 = SHA-256(candidateArchiveRawSealBytes)` and
`candidateGeneratedSealSha256 = SHA-256(candidateGeneratedRawSealBytes)` as
duplicate diagnostics. Never substitute a receipt, metadata, directory, or
aggregate-corpus digest. Digest inequality does not establish freshness. Digest
equality is investigated but is neither a B7 rule nor a consensus-invalid
proof.

**Command:**

```text
reproduction/run.ps1 generate-candidates --profile risc0-v3-succinct
reproduction/run.ps1 verify-candidates
reproduction/run.ps1 reproduce-invariants
```

### Task 3.3 - Instrument the upstream verifier as an oracle

Build the instrumented verifier separately from the clean generation binary.
It consumes immutable copies of already-generated seals and records every
checkpoint defined by `schema-v1.json` for comparison with the future JVM
implementation. It cannot generate, rewrite, or replace fresh-evidence
receipts. The oracle and schema are evidence and provenance, not consensus
authority.

**Exit criteria:**

- Two clean environments reproduce deterministic upstream and guest artifacts,
  metadata, candidate archived raw-seal and receipt digests, decoding, and
  verification byte-for-byte.
- Each environment independently generates and verifies an unmodified
  randomized candidate receipt for every required positive case with the same
  ELF/image, exact candidate statement/journal/claim construction,
  declared receipt family, selected typed terminal control, upstream root,
  seal word/byte counts, canonical field constraints, and EOF behavior.
- Randomized seal and receipt digests are recorded but are neither expected nor
  required to equal the candidate archive or one another.
- Upstream accepts all candidate fixtures and rejects isolated
  tampering.
- The observed raw-seal shape matches the proposed fixed envelope for all
  eleven positive cases.
- No Phase 3 record is accepted by the tooling as a final KAT or B7 run.

## 8. Phase 4 - Freeze the profile package

**Repository:** `eip-0045-profile`

### Task 4.1 - Write the canonical algorithm artifact

**Repository:** profile package

**File:**

- `profiles/risc0-v3-succinct/algorithm.txt`

Define all parsing, transcript, field arithmetic semantics, control flow,
indexing, rejection conditions, claim comparison, and EOF behavior. Use ASCII,
LF-only, no BOM/CR/NUL, and exactly one final LF.

B1 for the ten-entry terminal policy is exactly 29,773 bytes, with raw SHA-256
`90a884da420a09f2c1108d7388c2ac74db8dbdb195de704206e2bf8ec1ad0bee`
and domain-separated artifact digest
`6ed8a807a7b55177fa664de51c1d6f0daad81daf879e651da32367fed9d171c4`.
The old 28,670-byte algorithm and digest
`bef7f0feb313256882ca4859f4e07d076caf4ca1c4dd7ab324afc3d212990df3`
are superseded single-lift evidence only and must never enter the corrected
manifest.

### Task 4.2 - Define and generate the binary-data artifact

**Files:**

- `profiles/risc0-v3-succinct/binary-format.md`
- `profiles/risc0-v3-succinct/constants.bin`
- `profiles/risc0-v3-succinct/generate-constants.*`
- `profiles/risc0-v3-succinct/constants.json`

The binary artifact may own only numeric tables, dimensions, indices, and
constants consumed by the algorithm artifact. It must not encode verifier
control flow, duplicate rejection rules, or independently repeat or pre-absorb
manifest-owned values. Fix artifact kinds as `1` for canonical algorithm ASCII
and `2` for binary verifier data. A value derived from a manifest field must
have one specified deterministic derivation and a package-validity check.
B2 is closed for this preactivation candidate at exactly 65,119 bytes, raw
SHA-256 `8c4a92b7d354890481eefdef233d4ca43f6bcd9f7cb00e4dd9e709da47789ef3`,
and artifact digest
`dd8528a8621edc8dd24aadeed7bd7a2f0c1afd88dd563c5ec8f51cc7f75df0b1`.
Any later contradiction reopens B2 and necessarily produces a new downstream
manifest and `profileId`; it is not a conditional current value.

### Task 4.3 - Cross-generate both artifacts

Implement two independent generators or one generator plus an independent
strict decoder/re-encoder. Compare artifact bytes, not parsed objects.

**Exit criteria:**

- The fixed artifact kind assignments are enforced and both complete grammars
  are final.
- Every byte is consumed exactly once and has one semantic owner.
- Independent generation or decode/re-encode yields identical bytes.
- The artifact instruction census and all reference indices validate.

## 9. Phase 5 - Freeze manifest and identity

**Repository:** `eip-0045-profile`

### Task 5.1 - Minimize and justify every manifest field

**Files:**

- `profiles/risc0-v3-succinct/manifest-format.md`
- `profiles/risc0-v3-succinct/manifest.bin`
- `profiles/risc0-v3-succinct/manifest.json`

Implement the proposed exact 458-byte Manifest V1 layout:

| Offset | Size | Field |
|---:|---:|---|
| 0 | 1 | `manifestFormatVersion = 0x01` |
| 1 | 4 | `exactProofBytes = 222_668` as `u32le` |
| 5 | 4 | `maxApplicationPayloadBytes = 16_384` as `u32le` |
| 9 | 1 | `outerPo2 = 18` |
| 10 | 32 | inner control root |
| 42 | 340 | ten `controlKind:u8 || parameter:u8 || controlId[32]` entries |
| 382 | 38 | algorithm artifact reference, kind `1` |
| 420 | 38 | binary-data artifact reference, kind `2` |
| 458 | 0 | EOF |

Each artifact reference is
`artifactKind:u16le || artifactLength:u32le || artifactDigest[32]`.
Require the literal typed sequence `(1,15)..(1,22),(2,0),(3,0)`, exact control
IDs, and pairwise distinction of all ten raw `controlId` values, plus nonzero
artifact lengths equal to the compiled bytes, recomputed digest-envelope
agreement, checked offset arithmetic, and strict EOF. Reject reserved fields,
ambiguous aliases, noncanonical order, duplicate or relabeled typed entries,
reuse of one `controlId` under two different entries, wrong artifact kinds
or lengths, unknown versions, extensions, padding, and trailing bytes.

Kinds are fixed as `1 = normal lift`, `2 = join`, and `3 = resolve`.
Kind `1` uses its RV32IM segment `po2` parameter; kinds `2` and `3` require the
canonical reserved parameter zero. Manifest format `0x01` is the RISC Zero v3
succinct terminal grammar, not a generic
zkVM-family selector. A future profile that preserves every EIP Section 22
same-opcode invariant but cannot be represented by Manifest V1 uses a newly
specified manifest format and compiled verifier. A profile that violates any
global invariant requires a new opcode or separate EIP. Do not add redundant
family, suite, codec, provenance, security, chain, cost, or lifecycle fields.

The join ID is
`7a8f24092c34ed3eb81b3d0a0b796c588c615d3488ef9e61c21dbd1e4b83ea6e`;
the resolve ID is
`53a7b23d07f99e5d5685e85874f5181e8486aa267a0ae607ffe9ba47c8bdda4a`.
The eight lift IDs remain the exact `po2 = 15..22` values in EIP Section 15.3.
The decoded outer proof output must equal the pinned inner root, but that check
does not expose or restrict private child controls. The algorithm must restrict
only the reconstructed outermost code root. It must implement terminal-resolve
assumption semantics exactly, including explicit roots and zero-root
self-composition, while leaving application-specific trust policy bound by
`programId` and outside the opcode's guarantee.

The global chunk rule derives the unique partition from `exactProofBytes` with
capacity 65,535; do not duplicate chunk lengths in the manifest. Ensure the
global profile host consumes the manifest-owned proof length and payload bound.
Where verifier semantics require the outer `po2`, inner root, or control IDs,
the algorithm must reference those manifest fields instead of hardcoding
copies. The binary artifact must not independently own or pre-absorb any of
them.

Treat prose values as pre-B3 construction requirements and decoded review
targets only. Once artifact bytes, the raw manifest, and `profileId` are frozen,
the manifest and artifacts are the sole runtime authority. No runtime
comparison against a duplicate prose table is permitted.

### Task 5.2 - Compute final artifact digests and `profileId`

Publish:

- raw algorithm artifact and domain-separated digest preimage;
- raw binary artifact and domain-separated digest preimage;
- raw manifest and exact `profileId` preimage;
- all resulting digests in raw bytes and lowercase hex.

Assert `manifestBytes.length == 458` and publish the exact 485-byte preimage:

```text
ASCII("Ergo.StarkProfileId.v1") ||
0x00 ||
u32le(458) ||
manifestBytes
```

Keep construction acyclic: artifacts contain neither their own digest nor the
manifest, `profileId`, profile-dependent statement/claim/KAT values, schedules,
transition identifiers, or provenance prose.

This task now yields a 458-byte manifest with SHA-256
`deffb2cb231f98a348cbd166d5f1c43315661ccd8bd212099f16f238d0fe8946`,
a 485-byte profile-ID preimage, and `profileId`
`23c4a123ffb33a1c8db89436fe0e7972bd8e4e289459ee5fd71be5440607d383`.
The former 382-byte manifest and
`cd0493f887f84584cf325f0f7daaea9ba6a48fd92c6bbb3681921b2ed90a397d`
identity are superseded single-lift evidence only and must not enter corrected
statements, KATs, schedules, or activation material.

### Task 5.3 - Independent identity verification

Two implementations must parse the same raw files, reject every noncanonical
variant, and compute the same `profileId`.

**Exit criteria:**

- No `TBD` remains in profile identity.
- The final profile ID is used to regenerate all statement and claim vectors.

## 10. Phase 6 - Freeze conformance and transaction fixtures

**Repository:** `eip-0045-profile`

### Task 6.1 - Publish positive and isolated-negative KATs

**Files:**

- `contracts/reference-conformance.ergo`
- `contracts/reference-conformance.proposition.bin`
- `contracts/reference-conformance.json`
- `reproduction/LOCK.json`
- `vectors/risc0-v3-succinct/*.json`
- `vectors/risc0-v3-succinct/*.bin`
- `evidence/b7-freshness/*.json`
- `evidence/b7-freshness/*.bin`
- `vectors/README.md`

Before constructing final statements, freeze one minimal reference-conformance
contract as exact proposition bytes and compute
`contractId = BLAKE2b-256(propositionBytes)`. Two independent spec serializers
must produce identical bytes. The human-readable ErgoScript source is review
material until the Phase 7 compiler supports the opcode; Phase 7 must then
compile it to those already frozen bytes or fail the gate. Task 6.2 reuses the
same proposition bytes in every transaction fixture.

The current unpublished candidate B4 negative-plan foundation contains 63 ordered groups
and 254 executions: 131 `verifier-input`, 102 `artifact-validator`, and 21
`tree-validator`. Its four-field registry rows, implementation-neutral
materialization identities, and separate Rust/JVM validation results remain
fail-closed in the `expanded` lifecycle until all 254 materializations replay
and all 508 results agree at their declared boundaries. Structural validation
of that foundation is necessary but does not close B4. Its exact schemas must
be published and digest-bound before the plan can become canonical.

Publish positive KATs for all eight direct lifts at `po2 = 15..22`, one real
multi-segment terminal join, one real assumption-bearing terminal resolve, and
one resolve-then-join ancestry case. Cover at least these isolated failures:

- every statement-binding field;
- program/profile ID byte-order mistakes;
- wrong claim status or assumptions;
- the globally derived chunk count, every boundary, and alternate partitions
  with the same concatenated bytes;
- a single nonzero mutation at each odd padding index `1, 3, ..., 15`;
- halfword overflow at each index from 16 through 31;
- every truncated parse phase;
- trailing word/byte;
- wrong control ID/root/outer po2;
- the upstream `po2 = 14` control ID and another valid member of the broader
  upstream control root outside the ten-entry EIP terminal allowlist;
- invalid, duplicate, reordered, or relabeled kind/parameter entries and one
  control ID repeated under two different typed entries;
- identity, union, unwrap, PoVW, and every other stock family as terminal;
- claim/root mutations of the positive join, resolve, and
  resolve-then-join cases;
- terminal-resolve explicit-root and zero-root semantic branch vectors,
  including root, assumption claim, `programId`, and final-claim mutations;
- early, middle, and late cryptographic tampering.

Keep evidence-protocol fixtures in the separate `evidence/b7-freshness`
corpus. Isolate noncanonical JCS, duplicate keys, unknown fields, malformed
hexadecimal or decimal strings, wrong schema digest or digest preimage, leakage
of precommit/run evidence into frozen `LOCK.json`, wrong precommit bytes/digest,
duplicate run ID/precommit or evidence key, absent or false no-advance-access
declaration, missing/malformed/wrong-key or cross-run signature,
identity/small-order/mixed-torsion or noncanonically encoded public key or `R`,
`S >= L`, raw-evidence signing, wrong domain/length, Ed25519ctx/ph substitution,
changed signed run-evidence bytes or digest, absent/late or wrong-tag/register
anchor, creation-height substitution, anchor reorg, wrong challenge
height/block-ID byte order/case index, payload or claim mutation,
nonempty pre-generation root, noncanonical manifest path/order, forbidden
filesystem entry, omitted/extra file, wrong length or digest,
manifest/evidence/signature self-inclusion, missing/duplicate/reordered aggregate
proof entry, cross-environment proof reuse, challenge reorg, and incomplete run
closure.
Include one exact positive signature KAT. These fixtures include precommit,
detached signature, transaction, header, transaction-root proof, and
canonical-chain records; they are not negative proof KATs.

Vectors remain evidence. They do not override the frozen artifacts.
All ten typed terminal entries and all eleven required positive cases are
mandatory for Manifest V1; a missing archived positive KAT or fresh-generation
invariant report blocks the activation gate and cannot be handled by narrowing
the V1 entry set without an explicit EIP revision and a freshly reproduced B3
profile identity. A new format version is needed only for an incompatible
grammar change.

Each positive directory contains one immutable, digest-bound archived receipt
and raw seal plus deterministic statement, journal, claim, image, control, and
metadata files. The corpus manifest records that proof generation is randomized.
Both clean reproduction environments must verify each archive byte-for-byte and
Task 13.5 later publishes the separate final fresh-generation report for every
required positive case. Negative proof KATs include real digest-bound receipts
for excluded outermost stock families where the shipping prover can emit them,
plus isolated deterministic mutations of archived raw seals and metadata. Each
fixture changes only the targeted acceptance condition; evidence-protocol
fixtures use their separate chain-evidence corpus.

After all archived KAT digests are fixed, generate the final canonical
`reproduction/LOCK.json`, verify `reproductionSchemaSha256`, and make the lock
immutable. No precommit, challenge, run record, run digest, fresh-proof digest,
or proof-dependent checkpoint may enter it. Two independent serializers MUST
reproduce identical lock bytes, `reproductionLockSha256`, schema bytes, and
`reproductionSchemaSha256` before Task 13.5.

### Task 6.2 - Publish full transaction fixtures

Generate byte-exact signed transaction fixtures for zero and maximum payload,
with realistic IDs and a deliberately large successor box whose complete
serialized box remains within the 4,096-byte consensus limit. Treat the
existing row with an approximately 4,096-byte successor script as a
serializer-only stress diagnostic until that complete-box condition is
measured. Independently serialize the valid fixtures and record complete
transaction size and projected headroom
under a 262,144-byte node policy. At this phase, these are offline serialization
fixtures; node P2P/API acceptance and block inclusion are deferred until the
SigmaState and node implementations exist.

**Exit criteria:**

- Two independent serializers agree on every transaction byte.
- The large-successor fixture records the complete output-box bytes and proves
  that their length is at most 4,096 before its headroom is used as evidence.
- The fixtures identify the exact later node tests that will consume them.

## 11. Phase 7 - SigmaState wire and compiler

### Task 7.1 - Replace the AST and serializer shape

**Repository:** sigmastate-interpreter

**Files:**

- `data/shared/src/main/scala/sigma/ast/VerifyStark.scala`
- `data/shared/src/main/scala/sigma/serialization/VerifyStarkSerializer.scala`
- `data/shared/src/main/scala/sigma/serialization/OpCodes.scala`
- `data/shared/src/main/scala/sigma/serialization/ValueSerializer.scala`

Keep opcode slot 73/raw byte `0xB9`. Replace five children with the four
canonical children. Remove `vmType`, `costParams`, and Q/D cost constants.

### Task 7.2 - Add builder, compiler, and predef support

**Files:**

- `data/shared/src/main/scala/sigma/ast/SigmaBuilder.scala`
- `data/shared/src/main/scala/sigma/ast/SigmaPredef.scala`
- generated `data/shared/src/main/scala/sigma/ast/Operations.scala`
- `sc/shared/src/test/scala/sigmastate/utils/GenInfoObjects.scala`

Add the exact function type and generate operation metadata through the normal
generator.

### Task 7.3 - Replace obsolete wire/compiler tests

**Files:**

- `sc/shared/src/test/scala/sigma/VerifyStarkTest.scala`
- `sc/shared/src/test/scala/sigma/VerifyStarkExtendedTest.scala`
- new `data/shared/src/test/scala/sigma/serialization/VerifyStarkSerializerSpec.scala`
- `parsers/shared/src/test/scala/sigmastate/lang/SigmaParserTest.scala`
- `sc/shared/src/test/scala/sigmastate/lang/SigmaCompilerTest.scala`

Test raw opcode, exact child order, golden bytes, round trip, truncation, wrong
types, 3/5-argument rejection, and constant-placeholder profile IDs.

**Targeted command:**

```text
sbt -jvm-opts ci/ci.jvmopts ++2.13.16 "dataJVM/testOnly sigma.serialization.VerifyStarkSerializerSpec" "parsersJVM/testOnly sigmastate.lang.SigmaParserTest" "scJVM/testOnly sigmastate.lang.SigmaCompilerTest"
```

**Exit criteria:**

- Wire/compiler patch contains no placeholder verifier claim.
- JVM and Scala.js serialize the same AST bytes.

## 12. Phase 8 - SigmaState host capability and verifier

### Task 8.1 - Introduce typed host-only STARK context

**Files:**

- new `data/shared/src/main/scala/sigma/eval/StarkVerificationCapability.scala`
- `data/shared/src/main/scala/sigma/eval/ErgoTreeEvaluator.scala`
- `data/shared/src/main/scala/sigma/exceptions/SigmaExceptions.scala`
- `interpreter/shared/src/main/scala/sigmastate/interpreter/InterpreterContext.scala`
- `interpreter/shared/src/main/scala/sigmastate/interpreter/CErgoTreeEvaluator.scala`
- `interpreter/shared/src/main/scala/org/ergoplatform/ErgoLikeContext.scala`

Carry immutable chain domain, integer protocol generation, validation purpose,
compiled transition handle, and typed outcomes without exposing them through
the script-visible context. Preserve them through all copy/conversion paths.
Bind each purpose to one exact context: post-extension, post-`Parameters.update`,
pre-transaction context for full or historical blocks; tip-derived upcoming
context for mempool and submission APIs; proposed-extension, post-update,
pre-transaction context for candidates; and an explicitly selected concrete
consensus context for read-only diagnostic APIs. Recompute admission context
after every relevant tip change. Missing or inconsistent purpose/context pairs
are implementation invariants; no script, API argument, or mutable
configuration selects them.

### Task 8.2 - Implement profile package and historical transition tables

**Current implementation paths:**

- new verifier primitives under
  `core/shared/src/main/scala/sigma/stark/*.scala`
- new circuit-table support under
  `core/shared/src/main/scala/sigma/stark/circuit/*.scala`
- new profile package, statement/claim construction, raw-seal decoder, package
  loader, and verifier under
  `core/shared/src/main/scala/sigma/stark/profile/*.scala`
- profile resources under
  `core/jvm/src/test/resources/stark-kats/eip0045-profile-package/*`
- capability boundary under
  `data/shared/src/main/scala/sigma/eval/StarkVerificationCapability.scala`

The implementation must stay compatible with the repository's JVM,
Scala.js, Scala 2.11, 2.12, and 2.13 matrix. No JVM-only library belongs in a
shared consensus path.

For every active transition entry, derive `scheduleId` only from the exact
37-byte schedule under the canonical schedule-ID formula. Do not serialize a
second ID or substitute an implementation-local alias or registry key.

At startup, decode each compiled 458-byte Manifest V1 package structurally:
checked scalars, positive proof length, the exact ten-entry kind/parameter
sequence, ten pairwise-distinct control IDs, strict artifact envelopes, and EOF.
Recompute both artifact digests and `profileId`, then require the result to match
the compiled transition entry. Consume profile fields from those authenticated
raw bytes; do not compare them with a duplicate table copied from the EIP.

### Task 8.3 - Implement exact evaluation order and typed failures

In `VerifyStark.eval`:

1. evaluate only `profileId`;
2. obtain authenticated host context;
3. select the exact generation snapshot, or `Tmax` only after a successful
   future-generation whole-input preflight;
4. charge dispatch;
5. require `profileId.length == 32`;
6. resolve lifecycle;
7. precharge fixed profile cost for `Active`;
8. only then evaluate heavy children and verify.

`Absent` returns false without evaluating the other children. Quarantine,
cost-limit, opcode-unavailable, and unknown-future outcomes are not proof false.
Malformed profile IDs pay dispatch before returning false. Do not use
`catch (Throwable) => false`.
Separate deterministic ledger outcomes from host failures: OOM, allocation
failure, or missing verifier material aborts the validation attempt without
declaring the input or transaction ledger-invalid. Missing material must be
closed as a startup invariant in conforming releases.

### Task 8.4 - Add verifier and lifecycle tests

**Files:**

- `core/shared/src/test/scala/sigma/stark/*`
- `core/jvm/src/test/scala/sigma/stark/*`
- `core/jvm/src/test/resources/stark-kats/*`
- `data/shared/src/test/scala/sigma/eval/*`
- `data/shared/src/test/scala/sigma/serialization/*`
- `sc/shared/src/test/scala/sigma/VerifyStark*.scala`
- `sc/shared/src/test/scala/sigma/eval/*`
- `sc/shared/src/test/scala/sigmastate/LegacyVerifyStarkVersionSpecification.scala`
- `sc/shared/src/test/scala/sigmastate/ScriptVersionSwitchSpecification.scala`

Test strict parser canonicality, statement/claim KATs, every typed terminal,
all required positive ancestry cases, lifecycle,
historical lookup, startup invariants, all size limits, tampering, and exact
cost placement.

**Exit criteria:**

- The frozen shipping-prover vectors pass on JVM and Scala.js.
- No old bespoke vector is presented as RISC Zero activation evidence.

## 13. Phase 9 - Whole-input activation and future safety

### Task 9.1 - Preserve the legacy lane and implement v4+ feature closure

**Files:**

- `interpreter/shared/src/main/scala/sigmastate/interpreter/Interpreter.scala`
- `interpreter/shared/src/main/scala/org/ergoplatform/ErgoLikeInterpreter.scala`
- deserialization/materialization helpers reached by those files

Keep the ordinary outer-ErgoTree version check in its historical first position.
Make every public preflight entry point apply it directly and return an ordinary
future-version terminal without a continuation; do not rely on `verify` callers
to have gated the tree first.
For v0-v3, preserve the exact existing preparation and single bottom-up
`DeserializeContext`/`DeserializeRegister` substitution, including charging,
failure, dead-branch, and live nested-deserialization behavior. Scan the
prepared root to seed a monotone `seenVerifyStark` flag. During the exact pass,
structurally scan each successfully parsed and inserted subtree once and update
the flag without recursively substituting it. Ordinary deterministic pass
failures remain final. If a later occurrence produces an ordinary soft-fork
terminal result after the flag became true, return the typed
outer-language-version failure instead; the soft-fork result must not erase the
observed opcode. On normal completion, a true flag fails before JIT/user logic.
Do not iterate substitution or parse/charge bytes hidden behind a newly inserted
nested deserialization node.

Only for an outer v4+ tree already admitted by active language-version rules,
scan the outer AST plus every subtree materialized from context and registers,
including dead branches. Use a deterministic depth-first, left-to-right
worklist. Assign every deserialization occurrence in the initial root and every
occurrence introduced by parsed bytes a fresh identity, even for byte-identical
nodes, sources, types, or subtree digests. Equality, hashing, interning,
memoization, or cycle detection must never mark a fresh occurrence processed.
Define structural children from the serializable AST schema: serialized
`Value` child fields in schema order and ordered-sequence elements in index
order. Treat maps, sets, type-substitution tables, caches, and all other
non-serialized metadata as opaque. Host-language map or set iteration must not
affect occurrence order, observations, materialized bytes, outcomes, or cost.
Expose exhaustive child-enumeration and child-rebuild operations from each
registered consensus `ValueSerializer`; every serializer admitted to consensus
must declare its exact wire children. Do not use Scala `Product`, reflective
constructors, Kiama traversal, or collection builders as the consensus schema.
Preserve source and binary compatibility for legacy external subclasses with
concrete defaults for the new operations, but make those defaults fail closed:
an undeclared serializer must reject structural preflight, never be silently
treated as a leaf. Compatibility constructors and regression tests must pin
this behavior.
For each occurrence, add the complete ordinary checked byte charge before
parsing, apply the ordinary type and canonicality checks, replace it, assign
fresh identities inside the inserted subtree, and traverse that subtree before
the next sibling. A missing/wrong-type source is marked processed and retains
ordinary live-evaluation behavior. Repeated identical bytes are charged once
per fresh occurrence.

For `DeserializeRegister(default = Some(...))`, pin the sequence as selected
source resolve/charge/parse/type-check, then shadow-default preflight, then
selected-subtree preflight, retaining the selected subtree. A selected-source
failure wins before the default; a later default failure retains the selected
byte charge. With no correctly typed register source, materialize and retain the
default exactly once. Add failure-priority and exact cost-boundary fixtures.

Preserve the historical one-`Value` prefix parser. Charge the complete selected
source, parse one prefix from offset zero, and treat any remaining suffix as
opaque non-AST bytes. Add no EOF or whole-source reserialization check. Test a
hidden opcode only in a suffix, an opcode prefix with a suffix, context/register
parity, and a malformed or wrong-typed prefix followed by a valid suffix.

Continue until the v4+ worklist is empty or an ordinary consensus parser, type,
resource, arithmetic, or cost-limit failure occurs. A direct self-cycle and an
`A -> B -> A` cycle therefore create fresh occurrences until an ordinary
cost/resource failure; do not terminate on equality, a digest, or a local depth,
iteration, time, or memory cap. For `G <= Gmax`, do not expose an
implementation-selected unresolved result: empty the worklist or propagate the
ordinary deterministic failure. Only the `G > Gmax` stale-node path may
classify unknown materialization as a potential occurrence. Model the ordinary
materialization result as exactly one priority-ordered classification:

1. deterministic parse, type, canonicality, resource, arithmetic, or cost
   failure;
2. recognized ordinary whole-input soft-fork result; or
3. only for an EIP-aware stale binary, explicit
   `UnresolvedFutureMaterialization` without an ordinary soft-fork result.

Propagate the first classification. For `G <= Gmax`, the second terminates
unified whole-input preflight with the ordinary soft-fork result and current
cost. At `G > Gmax`, preserve that result only for full-block/historical
validation; admission/candidate returns unsupported rejection. It must never
also enter EIP-0045 fallback. Only the third may become a potential occurrence.
If the ordinary layer cannot distinguish the third, use the same
purpose-interpreted outcome and do not synthesize a STARK-specific unresolved
result.

The EIP denotes the sole successful semantic handoff as:

```text
ContinuePreflight(materializedRoot, preflightBlockCost)
```

Map that notation to the implemented Scala API exactly:

```text
preflightFullReduction(ergoTree, ctx)
  : Either[ReductionResult, StarkPreflightResult]

continueFullReduction(preflight: StarkPreflightResult)
  : ReductionResult
```

`Left` is an ordinary terminal reduction and exposes neither a structural plan
nor a continuation. `Right` contains a `StarkPreflightResult` with an immutable
`plan.occurrences`, public `preflightBlockCost`, and an opaque continuation that
binds the charged context and materialized AST to the interpreter instance.
`StaticStarkProfileId` must retain and return defensive byte-array copies, and
the plan must retain an immutable ordered collection.

`continueFullReduction` consumes that continuation exactly once. A second or
racing consumption fails before availability checks, evaluator entry, or any
cryptographic work. Callers cannot construct a replacement continuation,
substitute another materialized root, or resume a terminal `Left` result.

The continuation's `materializedRoot` is the result after the v4+ worklist is
empty. Pass it, not the original root, into normal evaluation through
`context.withInitCost(preflightBlockCost)`. Include outer-tree preparation and
substitution exactly once and charge every selected-byte syntactic occurrence
exactly once. Normal evaluation must not rerun substitution, reparse selected
bytes, or recharge a processed occurrence. Initialize the JIT evaluator exactly
once with `JitCost.fromBlockCost(preflightBlockCost)`, add subsequent ordinary
expression and native JIT costs, perform the ordinary final conversion, and do
not add `preflightBlockCost` again after reduction. Identical bytes selected by
multiple syntactic occurrences still pay once per occurrence; cache reuse is
never a discount.

Maintain one block-cost accumulator initialized from `context.initCost`. A
future-generation fallback returns its exact current value, including partial
materialization work; no exception or soft-fork handler may restore an earlier
captured value, and the result is not converted through `toBlockCost` again.
Checked consensus-arithmetic overflow and cost-limit exhaustion propagate as
deterministic validation failures that make the evaluated input ledger-invalid.
They are not Boolean `false`, fallback, or host-no-verdict outcomes. Cached and
uncached paths must cover identical features and produce identical lifecycle
observations, fallback or exception class, and consensus cost. A cache hit may
not suppress per-occurrence charging or any type, parser-version, canonicality,
bound, or outer-version check.

Add warm/cold-cache, repeated-subtree, same-bytes/different-type,
same-bytes/different-version, nested-materialization, malformed-parse,
partial-fallback, direct-self-cycle, and two-source-cycle fixtures. The cycle
fixtures assert fresh occurrence identities, no equality/digest deduplication,
and exact cost/resource failure. Add v0-v3 golden comparisons for a dead
first-level deserialization, a dead newly inserted nested malformed
deserialization, and a live newly inserted valid nested deserialization, plus
direct and one-pass-introduced `VerifyStark` version failures. Add original-root
versus `materializedRoot`, a v0-v3 fixture in which occurrence A inserts
`VerifyStark` and later occurrence B yields an ordinary soft-fork terminal
result (the typed version failure must survive), single `withInitCost`, single
`fromBlockCost`, no-reparse, and no-recharge fixtures, plus a fixture proving
the preflight cost is not re-added after reduction. Cover the public API
separately: terminal `Left` exposes no plan, a successful continuation is
single-use under sequential and racing calls, attempted mutation of caller
arrays cannot alter a static profile ID, and every reuse failure occurs before
availability, evaluator, or cryptographic execution.

### Task 9.2 - Implement version and purpose matrix

**Files:**

- `core/shared/src/main/scala/sigma/VersionContext.scala`
- `sc/shared/src/test/scala/sigmastate/ScriptVersionSwitchSpecification.scala`
- new `sc/shared/src/test/scala/sigma/eval/VerifyStarkCapabilitySpec.scala`

The Sigma layer owns the outer-version gate, complete preflight, continuation,
availability, and lifecycle semantics exercised by those suites. Selection of
`G > Gmax` behavior by validation purpose is node-owned and is exercised by the
Phase 10 and 11 integration suites; do not duplicate that controller in a
standalone Sigma test harness.

Apply the ordinary outer-tree language-version check first. V0-v3 then use only
the exact legacy one-pass lane and structural version guard from Task 9.1. An
admitted v4+ tree completes or terminates recursive preflight before selecting
the remaining gate outcome. Only a normal `ContinuePreflight` return proceeds
to `OpcodeUnavailable` and then profile lookup. An early explicit occurrence
must not skip later v4+ materialization when that would change consensus cost.

Test:

- outer-version rejection of a preactivation v4 spend and whole-input
  `OpcodeUnavailable` whenever the outer version is otherwise admitted but the
  opcode is unavailable;
- preactivation block acceptance and byte preservation for an output carrying
  future v4 proposition bytes, followed by rejection of its preactivation spend
  and successful postactivation spend when otherwise valid;
- v0-v3 rejection for direct and historical-one-pass-introduced occurrences,
  including dead branches, with no recursive inspection behind a newly inserted
  deserialization;
- block-only future-generation fallback with exact prefix cost;
- admission/candidate rejection before Boolean evaluation;
- known active/quarantined static-ID handling at `Tmax`;
- unknown, malformed, dynamic, or unresolved IDs;
- mutually exclusive ordinary failure, ordinary soft-fork, and explicit
  `UnresolvedFutureMaterialization` outcomes, with no double fallback;
- exact historical v0-v3 outcome/cost preservation before the EIP structural
  version failure, with recursive closure restricted to admitted v4+ trees;
- no-occurrence and last-known-ID continuation through all ordinary global
  version and validation-rule soft-fork logic;
- AND, OR, NOT, lambda, and delayed-cost wrapper composition;
- quarantine never becoming soft-fork fallback.

**Targeted command:**

```text
sbt -jvm-opts ci/ci.jvmopts ++2.13.16 "scJVM/testOnly sigmastate.ScriptVersionSwitchSpecification" "scJVM/testOnly sigma.eval.VerifyStarkCapabilitySpec"
```

**Exit criteria:**

- An admitted v4+ adversarial script cannot reset already accumulated cost or
  defer unknown feature discovery until after user Boolean logic starts; the
  separate v0-v3 lane remains byte-for-byte legacy-compatible.

## 14. Phase 10 - Ergo node activation binding

### Task 10.1 - Implement strict transition manifests

**Repository:** ergo

**Files:**

- new `ergo-core/src/main/scala/org/ergoplatform/settings/StarkTransitionManifest.scala`
- `ergo-core/src/main/scala/org/ergoplatform/settings/Parameters.scala`
- `ergo-core/src/main/scala/org/ergoplatform/settings/ErgoValidationSettingsUpdate.scala`
- `ergo-core/src/main/scala/org/ergoplatform/settings/ErgoValidationSettings.scala`
- `ergo-core/src/main/scala/org/ergoplatform/nodeView/state/ErgoStateContext.scala`
- `ergo-core/src/test/scala/org/ergoplatform/settings/VotingSpecification.scala`
- new `ergo-core/src/test/scala/org/ergoplatform/settings/StarkTransitionManifestSpecification.scala`
- `src/test/scala/org/ergoplatform/nodeView/state/ErgoStateContextSpec.scala`

Use the exact integer `parametersTable(Parameters.BlockVersion)` generation.
Let `priorG` be the authenticated generation in the parent state context and
`newG` the generation returned by the current block's canonical
`Parameters.update`. Only when `priorG != newG` and `newG` is an exact compiled
STARK-changing manifest generation, obtain `activatedUpdate` from that same
calculation and compare its canonical serialized bytes with the manifest before
validating transactions. Apply this identical pure old-context-to-new-context
calculation to state processing and candidate construction. Reject a generation
change that jumps over an unapplied compiled STARK manifest.

Preserve the existing trusted light/suffix bootstrap boundary: when the node
initializes an already authenticated state without replaying earlier parameter
updates, select and authenticate only the compiled STARK snapshot applicable to
that exact chain and generation. Do not synthesize comparisons for unobserved
historical updates. From the first subsequently processed canonical transition,
use the initialized generation as `priorG` and enforce the ordinary no-jump and
exact-update rules. Add full-replay, accepted-suffix, missing-runtime,
wrong-chain, and first-post-bootstrap transition fixtures.

For each chain, validate a strictly generation-ordered, unique manifest
sequence. The first predecessor is zero and every later predecessor is the
exact ID of the immediately prior STARK manifest. Define lookup at generation
`G` as the full snapshot with the greatest manifest generation `<= G`; no
manifest means `OpcodeUnavailable`, while an intervening non-STARK generation
carries the selected snapshot and transition ID forward unchanged. `Tmax` is
the last manifest applicable to `Gmax`. Missing required verifiers, artifacts,
or schedules are startup invariants, not absent profiles. Test duplicate and
out-of-order generations, broken predecessors, intervening generations, and
historical reorg lookup.

The initial snapshot must carry the exact canonical bytes of the cumulative
Rule 1002 `ChangedRule`: preserve all previously admitted opcodes under prefix
`0x02` and add raw opcode `0xB9`, with no `0x03` registry prefix. The tests must
decode those exact bytes and prove both preservation and addition.

Define `activatedUpdate` as the activated-update component returned by that
block's canonical `Parameters.update` call, not the raw proposed update or
cumulative `updateFromInitial`. Compare exactly
`ErgoValidationSettingsUpdateSerializer.toBytes(activatedUpdate)`. Physical
absence of a proposed-update extension field normalizes through existing state
parsing to `ErgoValidationSettingsUpdate.empty`; its exact serialized vector is
two bytes `00 00`. Test this vector independently, plus expected-empty,
unexpected-empty, wrong, extra, reordered, and noncanonical update bytes. A
manifest for any generation other than the exact old-to-new integer generation
must not activate. Later blocks with `priorG == newG`, and transitions that only
inherit a prior STARK snapshot, perform no synthetic STARK update comparison;
repeating earlier update bytes neither selects nor reactivates that manifest.

### Task 10.2 - Bind chain domain and startup invariants

**Files:**

- `ergo-core/src/main/scala/org/ergoplatform/settings/ChainSettings.scala`
- `src/main/scala/org/ergoplatform/settings/ErgoSettingsReader.scala`
- network configuration only when an activation package is final

Derive the domain only from the configured raw genesis block ID. Fail startup
on domain mismatch, duplicate/invalid snapshots, impossible lifecycle
transitions, bad bounds, or update-byte mismatch.

### Task 10.3 - Thread explicit validation purpose

**Files:**

- `ergo-core/src/main/scala/org/ergoplatform/nodeView/ErgoContext.scala`
- `ergo-core/src/main/scala/org/ergoplatform/modifiers/mempool/ErgoTransaction.scala`
- `src/main/scala/org/ergoplatform/nodeView/state/UtxoStateReader.scala`
- `src/main/scala/org/ergoplatform/nodeView/state/ErgoState.scala`
- `src/main/scala/org/ergoplatform/nodeView/state/UtxoState.scala`
- `src/main/scala/org/ergoplatform/nodeView/state/DigestState.scala`
- `ergo-wallet/src/main/scala/org/ergoplatform/wallet/interpreter/ErgoInterpreter.scala`

Require an explicit purpose at the whole-input boundary. Full block validation
must never consult a local admission budget. Test exact context assignment for
historical/full-block, tip-derived mempool/submission, proposed candidate, and
read-only diagnostic paths; purpose/context mismatch is fatal. Recompute
mempool context after reorg and every relevant tip transition. On reorg or
replay, full/historical validation reselects the replayed block's
post-extension, post-update, pre-transaction context; mempool/submission uses
the new tip-derived upcoming context; candidate construction uses its proposed
post-extension, post-update, pre-transaction context; diagnostics retain an
explicitly selected concrete consensus context.

**Exit criteria:**

- Correct and incorrect activation updates have isolated fixtures.
- State and candidate paths produce byte-identical `activatedUpdate` on exact
  `priorG -> newG` entry into every STARK-changing generation, while later
  same-generation and inherited-snapshot blocks compare nothing.
- Reorg/replay selects exact historical state and transition tables.
- State and digest validation paths agree.

## 15. Phase 11 - Admission and candidate protection

### Task 11.1 - Implement one bounded admission controller

**Repository:** ergo

**Files:**

- new `src/main/scala/org/ergoplatform/nodeView/mempool/StarkAdmissionController.scala`
- `src/main/scala/org/ergoplatform/settings/NodeConfigurationSettings.scala`
- `src/main/resources/application.conf`
- `src/main/scala/org/ergoplatform/ErgoApp.scala`

Acquire a coarse global CPU-and-memory permit and debit the applicable
per-source budget before recursive v4+ feature closure in admission, candidate,
or mempool-revalidation mode. After structural preflight, atomically upgrade to
deterministic profile work, concurrency, and aggregate-memory reservations for
every possible invocation, or a conservative aggregate bound, before native
proof parsing or cryptography. Enforce global and per-source budgets. Charge
valid and invalid work. Bound queueing and replay cache by count, bytes, and
time. Never use these local controls to invalidate a full block.

### Task 11.2 - Cover every admission entry point

**Files:**

- `src/main/scala/org/ergoplatform/nodeView/mempool/ErgoMemPool.scala`
- `src/main/scala/org/ergoplatform/network/ErgoNodeViewSynchronizer.scala`
- `src/main/scala/org/ergoplatform/nodeView/ErgoNodeViewHolder.scala`
- `src/main/scala/org/ergoplatform/modifiers/mempool/UnconfirmedTransaction.scala`
- `src/main/scala/org/ergoplatform/http/api/ErgoBaseApiRoute.scala`
- `src/main/scala/org/ergoplatform/http/api/TransactionsApiRoute.scala`
- `src/main/scala/org/ergoplatform/http/api/WalletApiRoute.scala`
- `src/main/scala/org/ergoplatform/local/CleanupWorker.scala`

Avoid double verification between API precheck and mempool insertion through a
bounded ticket or digest replay. Revalidation after transition, repricing,
quarantine, or reorg uses the same bounded controller and queue with an internal
attribution bucket. It must not charge an old remote peer as new work and must
not bypass global capacity. Add saturated-mempool transition, quarantine, and
reorg fixtures.

### Task 11.3 - Protect candidate construction

**Files:**

- `src/main/scala/org/ergoplatform/mining/CandidateGenerator.scala`
- `src/main/scala/org/ergoplatform/mining/ErgoMiner.scala`

Admission exhaustion skips or defers a candidate transaction; it does not
classify the transaction as consensus-invalid. Enforce the exact transition
update before candidate construction.

### Task 11.4 - Deploy the transaction-size policy before activation

**Files:**

- `src/main/resources/application.conf`
- `src/main/scala/org/ergoplatform/settings/NodeConfigurationSettings.scala`
- `src/main/scala/org/ergoplatform/network/ErgoNodeViewSynchronizer.scala`
- `src/main/scala/org/ergoplatform/http/api/TransactionsApiRoute.scala`
- `src/main/scala/org/ergoplatform/nodeView/mempool/ErgoMemPool.scala`
- `src/test/scala/org/ergoplatform/settings/ErgoSettingsSpecification.scala`
- `src/test/scala/org/ergoplatform/network/ErgoNodeViewSynchronizerSpecification.scala`
- API and mempool ingress tests selected by the implementation

Raise the default local `maxTransactionSize` policy from 98,304 to 262,144
bytes. Enforce one shared boundary across standalone unconfirmed-transaction P2P
gossip, local/API submission, and mempool insertion so no unconfirmed ingress
bypasses the limit. Do not apply that policy in a raw transaction decoder when
the decoder is reached from received-block or historical synchronization. Prove
exact standalone acceptance at 262,144 and rejection at 262,145 before proof
parsing or cryptography, then place the byte-identical 262,145-byte transaction
inside an otherwise consensus-valid block and prove both received-block and
historical paths decode and validate it when active block size and cost permit.

Ship this non-consensus policy in a node release and establish deployment
before the protocol generation that activates `VerifyStark`. Activation
rehearsal must fail its operational readiness gate if the receiving network is
still dominated by the old 98,304-byte policy.

**Exit criteria:**

- Hostile invalid proofs cannot monopolize verifier concurrency or memory.
- One peer cannot exhaust another peer's reserved capacity.
- Recursive closure cannot begin without the coarse permit, native parsing
  cannot begin without the atomic profile-reservation upgrade, and internal
  revalidation cannot bypass the global queue.
- Full-block validation remains deterministic and independent of local buckets.
- All standalone/unconfirmed transaction ingress paths apply the 262,144-byte
  policy, block/historical decoding bypasses it, and the policy release precedes
  opcode activation.

## 16. Phase 12 - Cost census and consensus calibration

### Task 12.1 - Build a complete operation and allocation census

Instrument the final verifier without changing acceptance. Count each bounded
operation class and peak live memory for all eleven required positive cases
plus malformed,
early-reject, named late-boundary-reject, and proof-valid final
expected-claim-mismatch fixtures. Prove that the fixed accepted proof shape
bounds every loop and allocation.

Use the pinned source census as a mandatory reconciliation oracle for the
direct raw-seal implementation: 50 queries; main-tree depths
`[15, 15, 15, 15]`; FRI depths `[11, 7, 3]`; 4,267 binary Merkle/Poseidon2
hashes; 353 per-proof leaf/content hashes; 5,683 per-proof reference Poseidon2
permutations; two additional protocol-info hashes/permutations at authenticated
profile construction; and
12,359 generated polynomial instructions split into 284 constants, 669 local
reads, 52 global reads, 4,061 additions, 1,385 subtractions, 4,679
multiplications, one `True`, 1,076 `AndEqz`, and 152 `AndCond`. Account
separately for statement parsing, SHA-256 claim construction, field-operation
lowering, allocations, checked cost arithmetic, and SigmaState integration.
Also census DEEP-ALI/tap evaluation, inversions, interpolation and FRI folds,
final polynomial evaluation, exponentiation, RNG extraction, range checks, and
comparisons; matching the generated executor length alone is not B5 closure.
Do not include the upstream wrapper's bounded control-inclusion proof in the
consensus path. Any reproduction tool that accepts that wrapper must first
require its leaf/control ID to equal one profile-owned typed terminal ID, then
require the pinned sibling count, the canonical upstream index for that exact
ID, and reduced BabyBear leaf and sibling words before calling upstream hash
code. It must not derive a join or resolve index from lift `segmentPo2`. The
direct verifier instead derives the unique manifest entry from the
reconstructed code root; neither caller nor wrapper metadata supplies kind,
parameter, or cost.

### Task 12.2 - Benchmark a disclosed reference matrix

Measure multiple JVMs, CPU classes, warm/cold states, allocation pressure, GC
effects, and full transaction validation. The minimum isolated path set is a
valid proof, an early parser reject, an early canonical cryptographic reject,
a late cryptographic reject at an explicitly named verifier boundary, and an
unchanged valid proof with a final expected-claim mismatch. Record the exact
last completed normative step and the parser, Merkle, query, FRI, or
claim-comparison boundary reached by each case. Byte position alone never
establishes execution depth. Use these measurements to falsify the census and
choose conservative constants, not as a hardware-specific consensus formula.

Publish a non-consensus `B5ResourceEnvelopeV1` for every retained supported
machine/JVM class. Its `hardBounds` entries must equal named shipped hard
configuration values, with exact field/value and configuration digest, or a
coefficient-free formula over named protocol parameters. Bind per-call memory
reservation, aggregate reservation/concurrency/queue/cache caps, sustainable
admission work-unit rate, any named P2P timeout, and saturated-block validation
bounded by the exact target block interval on the slowest supported class.
Measured percentiles, headroom, and safety multiples live only under
`diagnostics`. Include the slowest retained CPU/JVM class and smallest-memory
supported class. Freeze JCS schemas and domain-separated IDs before testnet;
observation may falsify a hard bound but never weaken it after seeing results.

### Task 12.3 - Freeze `dispatchJit` and `fixedJit`

Publish the conversion rationale relative to existing costed operations,
checked-arithmetic bounds, maximum calls per block, maximum transaction cost,
and invalid-proof behavior.

The maximum-call result includes independently reproduced analytical lower
bounds for serialized and ordinary/evaluator overhead per added invocation and
a machine-checkable packing search. It covers one transmitted proof/payload
reused by repeated calls, multiple calls in one script, and calls split across
transactions. Publish both the maximizing `Nblock` witness and the proof that
no `Nblock + 1` arrangement fits both block size and block cost. Require
`Nblock >= 1`; a zero result blocks activation.

Verify:

```text
1 <= dispatchJit
1 <= fixedJit <= Int.MaxValue
jitSum = checkedJitAdd(dispatchJit, fixedJit)
nativeBlockCost = floor(jitSum / 10)
nativeBlockCost <= active maxBlockCost
```

For every STARK-changing manifest after the first manifest for its chain,
require `newDispatchJit >= oldDispatchJit`. For a same-`profileId`
`Active -> Active` carry-forward or repricing, require
`newFixedJit >= oldFixedJit`. Do not compare fixed costs for
`Absent -> Active`, which has no old schedule, or
`Active -> Quarantined`, which has no new schedule. Reject every applicable
same-`profileId` decrease. Do not compare different profiles to impose a
cross-ID floor: semantic equivalence is not mechanically decidable and is not a
consensus lookup rule. Require fresh B5 calibration for every
`Absent -> Active` profile. Treat a proposed identity whose purpose or evidence
is cost-floor evasion as a preactivation review rejection, not a transaction
validity judgment.
For every such future profile, also prove that all manifest proof/chunk/payload
values fit Sigma collections and each conforming host's checked
integer/allocation bounds; publish a canonical complete transaction that fits
both active `maxBlockSize` and `maxBlockCost`; reproduce a packing result with
`Nblock >= 1`; keep peak live memory within the frozen B5 envelope; and ship and
deploy before activation a standalone policy that admits/relays the canonical
transaction as soon as the active tip makes the target profile `Active`, when
direct public relay is claimed. Apply a fresh profile-specific observation
campaign under EIP Section 20.4. Any representability, block-fit,
resource-envelope, or claimed-relay failure blocks the `Absent -> Active`
transition.
Reject signed-`Int` overflow in `jitSum`. Add the two charges in the ordinary
JIT accumulator before the existing `JitCost.toBlockCost` conversion; never
convert them separately and add rounded block costs. Cite
`sigma.ast.JitCost.toBlockCost` as the matching existing implementation, while
keeping the formula above normative for independent implementations.
The complete canonical transaction, including ordinary transaction and
evaluator costs, must also fit the active block-cost limit.

**Exit criteria:**

- The final constants cover the complete verifier path and memory envelope.
- The evidence explains uncertainty and safety margin without a rule such as
  "two times p99 on one reference machine".
- Repricing cannot alter `profileId` or leave an underpriced active alias.
- Every `Absent -> Active` profile has fresh B5 evidence, while node consensus
  performs no cross-ID semantic-equivalence or cost-floor comparison.
- Every future profile is host/Sigma-representable, has a canonical transaction
  and reproduced `Nblock >= 1` direct-fit proof, meets its peak-memory envelope,
  and has relay-policy support when direct public relay is claimed.
- The B5 resource envelopes are digest-bound, justified from the census and
  shipped limits, and usable as predeclared testnet pass/fail thresholds.

## 17. Phase 13 - Full test and compatibility matrix

### Task 13.1 - SigmaState matrix

From the SigmaState repository:

```text
sbt -jvm-opts ci/ci.jvmopts ++2.13.16 coreJVM/test dataJVM/test interpreterJVM/test parsersJVM/test scJVM/test
sbt -jvm-opts ci/ci.jvmopts ++2.13.16 coreJS/test dataJS/test interpreterJS/test parsersJS/test scJS/test
```

Repeat required compile/test coverage under Scala 2.12.20 and 2.11.12.

### Task 13.2 - Ergo node matrix

From the node repository, run targeted suites for:

- transition manifest and voting/update activation;
- state-context activation and reorg;
- explicit validation-purpose plumbing;
- UTXO and digest full-block behavior;
- mempool reservation, peer/global isolation, and replay bounds;
- synchronizer hostile-peer behavior;
- candidate skip/defer behavior;
- startup configuration and API double-validation prevention.

Then run:

```text
sbt ergoCore/test
sbt ergo/test
```

### Task 13.3 - Independent implementation differential testing

Feed the raw profile package and vector corpus to at least one non-JVM strict
implementation. Compare parse offsets, intermediate transcript/claim values,
accept/reject class, and final result. Fuzz only within deterministic resource
bounds and retain every divergence as a regression fixture.

### Task 13.4 - End-to-end direct transaction validation

Consume the Phase 6 signed fixtures through JVM, unconfirmed P2P, API, mempool,
candidate, UTXO-state, digest-state, received-block, and historical-validation
paths. Prove that at least one canonical proof executes in one ordinary
transaction and one block inclusion. Test standalone 262,144 acceptance and
262,145 rejection at the node-policy boundary, then consensus-decode and
validate the byte-identical 262,145 transaction inside an otherwise valid block
within active limits. Record peak memory and verify that API precheck plus
mempool insertion does not perform two native verifications.

### Task 13.5 - Execute and close the final B7 challenge-bound reproduction

This task starts only after Tasks 5.3, 6.1, and 6.2 have frozen the final
`profileId`, archived KAT corpus, `chainDomainId`, `programId`, exact reference
contract proposition bytes and resulting `contractId`, statement/claim
construction, `LOCK.json`, `schema-v1.json`, generator binary, and guest ELF;
and after Tasks 8.2 and 13.1 through 13.4 have produced and exercised the final
JVM verifier. No provisional identifier or verifier result is permitted.

Each of two independent operators provisions a locked environment on a
different host or VM trust domain with empty source, build, and output paths and
no shared writable volume. Shared dependency/image caches must be
content-addressed, digest-checked, and read-only. Create distinct canonical
`RunPrecommitV1` records and verify every field, including
`reproductionSchemaSha256` and a distinct operator-controlled 32-byte Ed25519
`operatorEvidencePublicKey`, against the frozen package. Before each declared future
Ergo mainnet height, prepare the exact tagged `R4` value and unsigned anchor
transaction. Ergo transaction signing and broadcast remain an explicitly
approved external governance action; the harness does neither. Verify actual
canonical inclusion height `< challengeHeight` from the inclusion header and
transaction-root proof, never from output creation height.

After each challenge block is obtained through the operator's ordinary network
observation path, generate and verify a challenge-bound shipping receipt for
all eleven required positive cases. Case indices `0..7` identify direct lifts
`po2 = 15..22`, index `8` the real multi-segment terminal join, index `9` the
real assumption-bearing terminal resolve, and index `10` resolve-then-join
ancestry. The dedicated `proof-output/` root is empty before the first
generation and is manifested immediately after all eleven proofs exist, before
instrumentation. Its canonical relative-path/length/SHA-256
manifest excludes every precommit, chain record, checkpoint, evidence record,
evidence digest, signature, and manifest artifact by construction. Produce
exactly one aggregate `RunEvidenceV1` per precommit with eleven entries in
canonical case-index order; reject a missing, duplicate, or reordered entry. The aggregate
binds the exact observation record, the empty-before and complete-after
generation manifests, and every per-proof command and result, plus true
declarations that neither the operator nor the generator had advance block-ID
access, miner collusion, or a withheld-block feed. After closing its canonical
bytes, compute
`runEvidenceSha256` and the exact EIP domain-separated
`runEvidenceSignatureDigest`. Sign that 32-byte message with strict pure
Ed25519 and publish the raw 64-byte detached signature. Enforce canonical
prime-subgroup `A` and `R`, `S < L`, the uncofactored verification equation, and
no Ed25519ctx/ph substitution. This authenticates the declarations to the
precommitted evidence key but does not prove them true or establish civil
identity or independence. The cryptographic conclusion is limited to generation
after the generator knew the exact block ID. Recompute every challenge,
statement, claim, proof, checkpoint, signature, and Rust/JVM result. The harness
passes only the domain-separated digest to an external operator-controlled
signing handle; private evidence keys never enter the repository, evidence
bundle, command line, or logs. Verify canonical ancestry through the closure
tip; a reorg of either anchor or challenge block before B7 closure or final
activation readiness voids that run and requires a new precommit and future
height.

```text
reproduction/run.ps1 precommit-fresh --environment <id> --challenge-height <height>
reproduction/run.ps1 prepare-anchor --precommit <file> --out <unsigned-request>
reproduction/run.ps1 verify-anchor --precommit <file> --tx-id <id> --out-index <n>
reproduction/run.ps1 generate-fresh --precommit <file> --block-id <raw-hex>
reproduction/run.ps1 sign-run-evidence --run-evidence <file> --key <external-key-handle>
reproduction/run.ps1 verify-closure --run-evidence <file> --tip-id <id>
```

**Exit criteria:**

- Both distinct precommits were canonically included before their challenge
  heights and remain canonical at closure.
- Both clean environments independently generate and verify all eleven final,
  challenge-bound randomized receipts under the same frozen profile.
- Every final seal has matching Rust and JVM results, and every
  evidence-protocol negative fixture fails for exactly its intended reason,
  including canonicalization, schema-digest, frozen/run separation,
  advance-access declaration, and strict evidence-signature failures.
- B7 is described as knowledge-bound freshness with an explicit operational
  public-observation assumption, never as cryptographic proof of publication
  time, operator identity, or physical host.

### Task 13.6 - Security closeout

Map every producer to every downstream consumer. For each check, record the
failure enabled by relaxing it. Isolate every field and branch with a negative
fixture. Require an independent reviewer for the strict/critical closeout.

**Exit criteria:**

- All language, platform, state model, admission, and differential suites pass.
- No unresolved same-input divergence remains.

## 18. Phase 14 - Activation package

### Task 14.1 - Produce pre-observation release artifacts

Publish, for each network:

- chain domain and protocol generation;
- exact validation-settings update bytes;
- algorithm and binary-data artifacts plus digest preimages;
- manifest bytes and final `profileId` preimage;
- fixed cost schedule bytes;
- full transition manifest bytes and `transitionId` preimage;
- all KAT and transaction fixture digests;
- B7 precommit bytes/digests, anchor transaction/output references, challenge
  heights/block IDs, aggregate `RunEvidenceV1` bytes/digests, public keys, and
  detached signatures;
- reproduction lockfile and benchmark/census report;
- frozen JCS schemas and domain-separated IDs for each B5 resource envelope;
- implementation commits and compatibility results.

### Task 14.2 - Execute activation rehearsal

Rehearse activation-block update binding, ordinary use, reorg across activation,
mempool revalidation, repricing, quarantine, and future-generation stale-node
behavior on an isolated network. The initial-opcode variant starts and rolls
back to outer-version rejection plus unavailable capability. A later-profile
variant keeps v4/opcode active, starts and rolls back only the target profile to
`Absent`, tests dispatch-then-`false`, heavy-child non-evaluation, `!V == true`,
and unchanged unrelated profiles.

### Task 14.3 - Execute the predeclared testnet observation

Create exact `activation/testnet-observation-plan-v1.json` and
`activation/testnet-observation-report-v1.json` artifacts implementing EIP
Section 20.4, plus frozen schemas under `activation/schemas/`. Canonicalize with
RFC 8785 JCS and reproduce every domain-separated ID independently. Bind exact
target profile/schedule/transition and activation generation,
`activationKind = InitialOpcodeProfile | LaterProfile`, `maxBlockSize`, and
`maxBlockCost`. Before the first covered block, prepare the
exact B8-tagged testnet `R4` value and unsigned anchor transaction, arrange the
campaign-authorized signing/broadcast, then verify actual inclusion height,
transaction-root membership, and canonical ancestry. Derive the duration from
the longest shipped refill/expiry/revalidation and network
voting/activation horizons, then require the post-boundary probes; do not insert
an arbitrary day count or multiplier. Derive `Nblock` from final byte and cost
fixtures across repeated calls reusing one proof/payload and calls split across
transactions, and prove the maximizing arrangement. Predeclare the exact
activation-kind lifecycle script; the target profile's complete positive
receipt-family set; valid, early-reject, and named late-boundary-reject burst,
full-refill, continuous-rate, and post-refill workloads;
quarantine/negation resubmission; post-rollback unavailable/outer-version checks
for the initial variant or target-`Absent` false/negation/unrelated-profile
checks for the later variant; reactivation acceptance; thresholds; raw-log
schema; deadline; and restart rules. Freeze before `startHeight` a named
implementation roster containing each repository, commit, build digest,
operator, role, machine class, and objective inclusion criterion. Require at
least two independently built and operated validators plus the prescribed
producer, relay, archival/reorg, slowest-CPU/JVM, and smallest-memory coverage.
Only the frozen roster counts for the run; a later-advertised implementation
requires a new or amended predeclared campaign before it can be represented as
activation-compatible. A
missing/late/reorged plan anchor, stale block limit, missing scenario, telemetry
gap, deadline expiry, or threshold breach produces a failing report rather than
a waiver.

```text
activation/run.ps1 freeze-observation-plan
activation/run.ps1 prepare-plan-anchor --plan <file> --out <unsigned-request>
activation/run.ps1 verify-plan-anchor --plan <file> --tx-id <id> --out-index <n>
activation/run.ps1 execute-observation --plan <file>
activation/run.ps1 verify-observation-report --plan <file> --report <file>
```

The harness does not sign or broadcast the anchor. That action belongs to the
authorized testnet campaign operator after plan review.

### Task 14.4 - Final readiness decision

Activation requires every gate in the architecture and EIP to be green. A
draft PR may remain open while blockers exist, but neither the profile nor the
implementation is described as activation-ready, secure, complete, or
production-ready until independent closeout passes.

Only after Task 14.3 passes, publish the final readiness bundle containing the
exact `observationPlanId`, `observationReportId`, plan-anchor transaction/output
and inclusion block, raw-evidence manifest, final canonicality check, and exact
mainnet transition artifacts. Task 14.1 cannot claim or publish a report that
does not yet exist.

## 19. Proposed review and commit boundaries

Keep review units small enough that a maintainer can verify one invariant at a
time:

1. corrected cryptographic rationale;
2. normative EIP rewrite;
3. reproduction lockfile and shipping-prover fixtures;
4. profile artifacts, manifest, and identity;
5. Sigma wire/compiler/golden serialization;
6. Sigma host capability and lifecycle table;
7. verifier plus KATs;
8. materialized-feature preflight and future fallback;
9. node transition/update binding and validation-purpose plumbing;
10. admission controller and all entry points;
11. metering evidence and frozen schedules;
12. activation artifacts and rehearsal evidence.

Do not squash evidence-producing commits into an opaque implementation commit
until reviewers have had the opportunity to inspect the derivation.

## 20. Immediate next action

The hermetic Linux RISC Zero candidate-lock foundation now builds the exact
guest and verifies one candidate-only `po2 = 15` shipping-prover export end to
end; that fixture is excluded from the final corpus.
The superseded candidate corpus carries a historical 24-case mutation-gate
table and representative negative tests; neither can close B4. The current
candidate B4 foundation instead enumerates 63 groups and 254 executions, with one
implementation-neutral identity per execution and 508 separate Rust/JVM
results still to be materialized. Its `expanded` lifecycle remains fail-closed
until full semantic replay agrees, and its exact schemas remain unpublished
and unbound. A same-source, same-seed two-build run is
only a local determinism diagnostic; it does not close independent B7 source
or seed closure.

The canonical B1-B3 package is frozen and independently reproduced. Immediate
work is to complete the identity-bound `15..=22` B4 ladder and negative corpus,
finish the cross-version matrix and independent audit of the implemented
SigmaState whole-input feature closure, and derive B5 from the
completed JVM verifier's operation/allocation and rejection-path census. A
second independently materialized source and seed remain required for B7.
Candidate receipts are neither final archived KATs nor B7 freshness evidence
and are never promoted by renaming; Task 13.5 performs the separately
challenge-bound B7 fresh runs. External timing observations remain useful
cross-checks, but no activation cost is final until the JVM census, early and
named late rejects, final expected-claim mismatch, benchmark matrix, schedule,
and independent audit all agree.
