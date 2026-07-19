# EIP-0045 Activatable Native STARK Verification Design

**Status:** Proposed architecture; cryptographic profile not activation-ready
**Date:** 2026-07-17
**Author:** A. Shannon
**Target opcode:** `VerifyStark`, opcode `0xB9`
**Authority:** Non-normative design snapshot; [the EIP](../../eip-0045.md)
governs wherever the two differ.

## 1. Purpose

EIP-0045 introduces deterministic, consensus-native verification of a bounded
STARK receipt in a normal Ergo transaction. The initial activation targets an
exact shipping RISC Zero v3 succinct receipt profile. The opcode remains usable
for future immutable zkVM profiles without turning consensus verification into
a plugin system or a transaction-parameterized verifier.

This document records the proposed architecture that the EIP, cryptographic rationale,
SigmaState implementation, Ergo node integration, test vectors, and activation
package are intended to implement. It separates the proposed consensus architecture from a
cryptographic profile that still has explicit activation blockers.

A preactivation implementation PR can be review-ready once its four-child
wire/compiler surface, unavailable-by-default host capability, v4 whole-input
preflight API, and closed B1-B3 candidate resources are inspectable without a
selectable schedule or transition. That status is not activation readiness;
activation additionally requires B4-B8 and the network package to close.

## 2. Goals

The first profile eligible for activation must:

- verify receipts emitted by the pinned RISC Zero v3 succinct prover;
- accept the pinned prover's bounded single- and multi-segment succinct paths
  through terminal `lift`, `join`, and `resolve` controls;
- bind the proof to the Ergo network, immutable verifier profile, guest
  program, spending contract, and application payload;
- fit in one signed transaction and one block inclusion, without a bridge or
  intermediate proof transaction;
- have byte-exact, independently reproducible behavior across implementations;
- bound proof size, payload size, parsing, memory use, and verification work;
- charge the complete worst-case native verification cost before evaluating
  the proof or other heavy arguments;
- remain safe under arbitrary ErgoScript Boolean composition, including
  negation and short-circuiting;
- leave the four-child opcode ABI reusable by future immutable zkVM profiles.

## 3. Non-goals

The first profile does not provide:

- verification of arbitrary RISC Zero receipt types;
- identity normalization, union, unwrap, proof-of-verifiable-work receipts, or
  any terminal recursion program outside the exact profile allowlist;
- transaction-supplied fields, hashes, FRI parameters, control roots, layouts,
  circuits, or cost declarations;
- proving or zkVM execution inside an Ergo node;
- activation of SP1, Valida, or the bespoke Ergo Ext16/Poseidon1 profile;
- a claim of 128-bit soundness or post-quantum security;
- an executable verifier descriptor language;
- dynamic consensus plugins;
- an on-chain STARK-profile registry or a new block-extension prefix.

Future profiles use the same opcode only when they preserve every global
compatibility condition in EIP Section 22, including the four-child ABI,
lifecycle/quarantine semantics, whole-input preflight/fallback boundary,
evaluation and precharge order, exception behavior, and cost monotonicity. A
profile that violates any global condition requires a new opcode or separate
EIP.

## 4. Consensus layering

The design keeps five concerns separate:

| Layer | Normative owner | Mutable under the same identity? |
|---|---|---|
| Cryptographic predicate and canonical proof shape | `profileId` | No |
| Profile-verifier metering | `scheduleId` | Only by a pointwise nondecreasing network transition |
| Global-dispatch metering | global opcode semantics plus snapshot `dispatchJit` | Semantics immutable; value only nondecreasing by network transition |
| Availability | compiled transition table status | `Absent -> Active -> Quarantined` only |
| Opcode transport, exceptions, and fallback | global `VerifyStark` rules | No silent reinterpretation |

An implementation must not describe `profileId` as committing to all consensus
validity. Complete behavior depends on the profile, its lifecycle status, its
cost schedule, the authenticated protocol generation, and the global opcode
rules.

Normative authority is partitioned as follows:

| Source | Sole authority for |
|---|---|
| EIP global rules | opcode and four-child ABI, `ErgoStatementV1`, evaluation order, chain and contract binding, lifecycle, activation, fallback, exception classes, and global dispatch-cost semantics |
| Profile manifest | identity-critical profile parameters, resource bounds, accepted control identifiers, and exact artifact references |
| Algorithm artifact | profile-specific proof grammar, canonicalization, transcript, public-input or claim construction, verifier control flow, rejection rules, and output comparison |
| Binary-data artifact | only the numeric tables, dimensions, indices, and constants consumed by the algorithm artifact |
| Cost schedule | the metering value for one immutable profile; never verifier semantics |
| Transition manifest | the active/quarantined profile snapshot and cost association for one chain and authenticated protocol generation |
| Conformance vectors | non-normative evidence that implementations execute the frozen definition |
| Pinned upstream implementation | non-normative provenance, receipt generator, and independent reference oracle |

Sections 7 through 9 summarize first-profile semantics for review, but every
profile-specific rule there is owned by either the final manifest or the
algorithm artifact under the frozen `profileId`. Prose outside the
content-addressed profile package cannot silently add a same-ID acceptance
rule. A preactivation conflict among normative materials invalidates the
package. A conflict discovered after activation requires fail-closed quarantine
and a new profile; implementations do not choose their preferred source.

B1-B3 are closed for the corrected preactivation profile candidate. The
reproduced single-lift identity remains historical evidence and is superseded
before activation. Exact values printed later in this design and the EIP are
decoded review targets; the content-addressed raw manifest and artifacts are
the sole runtime authority for profile semantics if the profile is activated.
A runtime must not compare them with a second prose table or allow prose to
reinterpret the same `profileId`.

## 5. ErgoScript ABI

```text
verifyStark(
  proofChunks:         Coll[Coll[Byte]],
  applicationPayload: Coll[Byte],
  programId:           Coll[Byte],
  profileId:           Coll[Byte]
): Boolean
```

The expression has exactly four children in that wire order. `costParams` does
not exist. The proof never selects or overrides a verifier parameter.

For the first RISC Zero profile:

```text
programId.length             == 32
profileId.length             == 32
applicationPayload.length    <= 16_384
proofChunks.length           == 4
```

Before evaluating any opcode child, the host completes the applicable global
version/feature lane described in Sections 13 and 14: exact historical
single-pass preparation plus a structural guard for v0-v3, or complete recursive
materialization for an already version-admissible v4+ tree. The v4+ pass may
reject unavailable use or produce the future-generation whole-input fallback
without evaluating user Boolean logic. Only an invocation admitted by the
applicable lane enters the evaluator.

Validation purpose and context are assigned only by the trusted node caller:

- full received-block or historical validation uses that block's exact state
  context after processing its extension and canonical `Parameters.update`, but
  before validating its transactions;
- mempool or submission-API admission uses the upcoming context derived from
  the current canonical tip and recomputes it after every relevant tip change;
- local candidate construction uses the exact candidate context after applying
  its proposed extension and parameter update, but before its transactions; and
- a read-only diagnostic API explicitly selects a concrete consensus context
  and does not label that result as mempool admission.

A missing or inconsistent purpose/context pair is an implementation invariant
failure. Purpose is never selected by a script, API parameter, or mutable node
configuration. Full-block and historical validation never consult local
admission state.

Serialization order does not define evaluation order. The evaluator must then
use this exact sequence:

1. evaluate `profileId` only;
2. read the authenticated chain, protocol generation, and validation purpose;
3. select that generation's transition snapshot, or `Tmax` after a successful
   future-generation preflight;
4. charge its positive global `VerifyStarkDispatchCost`;
5. require exactly 32 profile-ID bytes;
6. resolve lifecycle status;
7. for `Active`, charge the full fixed profile cost;
8. evaluate `programId` and require exactly 32 bytes;
9. evaluate `applicationPayload` and enforce the profile limit;
10. evaluate `proofChunks` and enforce the exact canonical partition;
11. construct the statement and expected claim;
12. parse and verify the proof.

`VerifyStarkDispatchCost` is a profile-independent, generation-versioned
consensus cost stored as `dispatchJit` in the transition snapshot. It pays for
the bounded host capability access, profile-ID validation, generation and
lifecycle lookup, and result dispatch of every executed invocation, including
malformed, absent, and quarantined IDs. Future IDs rejected by structural
preflight do not execute the opcode and therefore do not pay this execution
charge. Its initial value is `TBD` and must be frozen with the implementation
census. It is additional to normal child-evaluation costs and, for an active
profile, to `fixedJit`.

Once the opcode is network-active, an `Absent` profile returns `false` without
evaluating the other three children. Before initial activation, the ordinary
outer-version gate rejects a v4 spend. If an outer version is otherwise admitted
while the opcode is unavailable, the distinct `OpcodeUnavailable` gate rejects
the whole input before profile lookup. A quarantined profile or
future-generation preflight follows Sections 13 through 15 before proof bytes
are touched.

For the first profile, `programId` is exactly the RISC Zero guest image ID in
the 32-byte order returned by `Digest::as_bytes()`. It is not a text encoding,
four reversed `u64` words, eight reversed `u32` words, or a whole-digest
reversal. A JVM `Coll[Byte]` preserves those 32 bit-pattern bytes even though
the host language's scalar `Byte` type is signed.

## 6. `ErgoStatementV1`

The opcode constructs the committed journal. The script supplies
`applicationPayload`, `programId`, and `profileId`; the trusted host supplies
`chainDomainId` and derives `contractId` from `SELF.propositionBytes`.

| Offset | Size | Value |
|---:|---:|---|
| 0 | 26 | `ASCII("Ergo.VerifyStark.Statement")` |
| 26 | 1 | version `0x01` |
| 27 | 32 | `chainDomainId` |
| 59 | 32 | `profileId` |
| 91 | 32 | `programId` |
| 123 | 32 | `contractId` |
| 155 | 4 | payload length as `u32le` |
| 159 | `n` | `applicationPayload` |
| `159+n` | 0 | EOF |

```text
ErgoStatementV1 =
  ASCII("Ergo.VerifyStark.Statement") ||
  0x01 ||
  chainDomainId ||
  profileId ||
  programId ||
  BLAKE2b-256(SELF.propositionBytes) ||
  u32le(applicationPayload.length) ||
  applicationPayload
```

The first profile limits the statement to `16_543` bytes.

`contractId` binds the proof to the executing contract, not to one box.
Contracts needing instance or transition binding must encode and check the
relevant `SELF.id`, instance NFT, state commitment, nonce or nullifier, inputs,
and ordered outputs in `applicationPayload`.

If the guest verifies an inner or aggregate proof, it must cryptographically
bind that proof's externally relevant public statement, or a canonically
encoded, authenticated root commitment to that statement, to
`applicationPayload`. An opaque valid inner proof or root alone does not bind
amounts, destinations, nullifiers, or other authorization facts.

`chainDomainId` is exactly the 32 bytes obtained by Base16-decoding the chain's
height-1 genesis `Header.id` (`ModifierId`) in the canonical byte order used by
Ergo serializers and APIs. It is not the UTF-8 text of the hex ID, the genesis
state digest or AVL root, a network-prefix byte, a whole-digest reversal, or a
per-word reversal. The value is a trusted immutable consensus capability
propagated from `ErgoStateContext`; it is not script-visible and cannot be
supplied through a context variable, transaction field, API request, or mutable
node setting.

```text
Ergo mainnet:
b0244dfc267baca974a4caee06120321562784303a8a688976ae56170e4d175b
```

Each test network or private chain uses its own exact configured genesis block
ID. A testnet transition manifest must pin that value explicitly; the generic
profile specification does not assign one permanent ID to every network called
"testnet".

The guest commits exactly the statement bytes:

```rust
env::commit_slice(statement_bytes)
```

No prefix, suffix, alternate encoding, or trailing byte is accepted.

## 7. RISC Zero claim construction

Let `H(x) = SHA-256(x)`, `Z` be 32 zero bytes, `I = programId`, and
`J = ErgoStatementV1`. Define:

```text
TS(tag, down[], data[]) =
  H(
    H(UTF8(tag)) ||
    down[0] || ... || down[n-1] ||
    u32le(data[0]) || ... || u32le(data[m-1]) ||
    u16le(n)
  )
```

Then:

```text
journalDigest = H(J)

post =
  TS("risc0.SystemState", [Z], [0])

output =
  TS("risc0.Output", [journalDigest, Z], [])

expectedClaim =
  TS("risc0.ReceiptClaim", [Z, I, post, output], [0, 0])
```

This is exactly an OK receipt claim with empty assumptions. Every other claim
is rejected.

The pre-B3 diagnostic values formerly shown here are superseded. The final B4
conformance bundle must publish every input byte and intermediate needed to
reproduce this chain and must exercise the frozen host claim builder against a
real identity-bound receipt. A synthetic claim KAT is not a substitute for
that complete fixture.

## 8. First profile: RISC Zero v3 succinct receipt

The provenance anchor and independent reference oracle is RISC Zero v3.0.5 at
commit:

```text
8eb06ab020a92dc5b63ba6dd0836d432aba6d890
```

That upstream implementation is used to reproduce receipts and cross-check
acceptance. It is not, by itself, an executable consensus dependency or a
second normative definition. The immutable profile predicate is defined by
this profile's frozen algorithm artifact, binary-data artifact, manifest, and
the applicable global wire and statement rules. Conformance vectors test that
definition; they do not create an alternative one. Any unexplained disagreement
on the common in-profile corpus, exact claim construction, or verifier
intermediates blocks activation. After activation, a client that diverges from
an unambiguous frozen package has an implementation bug and must be fixed under
the same profile ID. The upstream oracle cannot redefine activated consensus.
Quarantine and a new profile ID are required only when the canonical predicate
or package itself is ambiguous, defective, or unsafe.

The pinned prover deliberately samples fresh zero-knowledge noise in its RV32IM
and recursion witnesses. Fresh proofs for identical deterministic inputs are
therefore expected to have different receipt bytes, seals, and proof digests.
The reproducibility boundary is exact: archived KAT files and all deterministic
artifacts, inputs, metadata, decoding, and verification results reproduce
byte-for-byte; fresh unmodified shipping-prover runs reproduce the required
direct-lift, terminal-join, terminal-resolve, and resolve-then-join cases,
image, challenge-bound statement/journal/claim construction, control mapping,
seal shape, canonicality, and acceptance, but not the same randomized proof
bytes.
No seeded RNG, removed ZK noise, patched prover, development-mode receipt, or
hand-assembled seal counts as shipping-prover evidence.

The exact Cargo feature set is locked and excludes `witgen_debug` and every test
or debug feature that substitutes deterministic witness values or disables ZK
noise. Fresh-generation directories start empty. Archived and fresh raw-seal
SHA-256 values are recorded as duplicate diagnostics; receipt, metadata,
directory, and corpus digests are never substituted for those fields. Digest
inequality is not freshness evidence and equality is not a consensus rule.

The reproduction package's frozen area contains immutable `LOCK.json`, archived
KAT files, and a versioned evidence-only `schema-v1.json`, separately from
per-run evidence files containing fresh seal/receipt and proof-dependent
intermediate digests. The lock contains KAT-file digests and
`reproductionSchemaSha256`, not embedded KAT or schema bytes.
`reproductionLockSha256` hashes only the canonical lock bytes; no precommit or
run field may enter those bytes. `schema-v1.json` must itself be stored as its
UTF-8 RFC 8785 JCS serialization, and
`reproductionSchemaSha256 = SHA-256(exact canonical schema-v1.json bytes)` is
the exact value bound by the lock and every precommit. The schema defines the
finite checkpoint set, names and order, exact digest preimages and encodings,
and digest algorithm.
Rust and JVM must agree on that checkpoint set for the same seal; independent
fresh runs are never compared at that layer. The schema cannot redefine the
verifier predicate. The archived upstream receipt container is oracle material,
while only its extracted raw seal enters consensus.

Fresh generation and instrumentation are mechanically separate. The generator
binary is built from a verified clean checkout of the pinned commit, without a
Cargo patch, replacement, or external path override and with `witgen_debug`
absent from the effective configuration. Clean-tree results, effective Cargo
source/manifest paths, enabled features, and the generator-binary digest are
recorded. A separately labeled instrumented verifier may consume existing
seals and emit checkpoints, but it cannot generate or modify fresh-evidence
receipts.

Freshness uses a post-precommit public challenge, not digest inequality. Each
of two independent operators first fixes a schema-defined `RunPrecommitV1` for
a newly provisioned locked environment on a distinct host or VM trust domain,
with no shared writable source, build, cache, or output volume.
Content-addressed dependency caches may be shared read-only. Exact fields bind
a unique 32-byte `runId`, profile/chain/program/contract and payload length 32,
guest ELF, lock/schema/clean-tree/Cargo/generator/OCI digests, OCI platform, a
distinct operator-controlled 32-byte Ed25519 `operatorEvidencePublicKey`, the
exact eleven-case set, and a future Ergo mainnet challenge height. Case indices
`0..7` identify direct lifts `po2 = 15..22`, index `8` the real multi-segment
terminal join, index `9` the real assumption-bearing terminal resolve, and
index `10` resolve-then-join ancestry.

Before that height, `SHA-256(exact RunPrecommitV1 bytes)` is anchored in an
ordinary Ergo mainnet output `R4: Coll[Byte]` under the exact
`Ergo.EIP0045.B7.Precommit.v1` tag. Actual canonical transaction inclusion,
not declared creation height, must precede the challenge height. Record bytes,
transaction/output reference, inclusion height, and block ID are published;
the two runs have distinct run IDs and precommit digests. The anchor contains
no proof and is not part of ordinary verifier use.

After the canonical raw block ID at that height is public, each run derives
`freshChallenge = BLAKE2b-256(ASCII("Ergo.EIP0045.B7.FreshRun.v1") || 0x00 ||
SHA-256(RunPrecommitV1Bytes) || u8(caseIndex) || rawBlockId)` and uses the
32-byte challenge as `applicationPayload`. The receipt journal therefore
commits a statement unique to that environment and required case. The empty-before and
complete-after manifests cover only the dedicated
`reproduction/runs/<runId>/proof-output/` root, using canonical relative POSIX
paths, lengths, and SHA-256 values. Precommit, chain records, aggregate evidence,
its digest, detached signature, checkpoints, and manifest records all remain
outside that root, so the order is acyclic: generation manifest, aggregate
evidence, then detached signature. One schema-defined aggregate
`RunEvidenceV1` per precommit binds the precommit, exact anchor
transaction/output, inclusion header and transaction-root proof, canonical
ancestry to the closure tip, challenge block, environment,
challenge-observation record, and output manifests. It contains exactly eleven
entries in canonical case-index order, each binding its command, exact
payload/statement/journal/claim, proof artifacts, checkpoints, and Rust/JVM
results plus true no-advance-access/no-miner-collusion/no-withholding
declarations. Every derivation and run-specific proof is reverified. The
operator signs a domain-separated SHA-256 digest of the final aggregate bytes
with the key committed by the precommit; the raw 64-byte signature is detached,
so there is no signature self-reference. Verification uses the EIP's strict
pure-Ed25519 rules: canonical prime-subgroup public key and `R`, `S < L`, and no
Ed25519ctx/ph substitution. Reorg of the anchor or challenge block before B7
closure or final activation readiness voids the run. Cryptographically, the
protocol proves only generation after the generator knew the exact challenge
block ID. Calling that generation post-publication additionally relies on the
signed operational declarations because a winning miner knows a block ID before
publishing it. The protocol proves neither their truth, civil or physical
identity, operator independence, nor immediate timing. These records are
evidence-only and are never node inputs.

`ProverOpts::succinct()` is the producer entry point, not the conformance test.
The Ergo profile inspects the emitted structure and narrows that producer
configuration to:

- Poseidon2;
- `ReceiptKind::Succinct`;
- `prove_guest_errors = false`;
- `DEFAULT_MAX_PO2 = 22`;
- the upstream set of 27 recursion control IDs;
- `RECURSION_PO2 = 18`;
- query count `50`;
- inverse rate `4`;
- FRI folding factor `16`;
- minimum degree `256`.

The verifier accepts only these terminal controls:

```text
normal lift_rv32im_v2 for one RV32IM segment with po2 in [15, 22]
join for stock multi-segment compression
resolve for stock assumption discharge
```

It rejects identity, union, unwrap, proof-of-verifiable-work, every other
outermost stock control, non-OK claims, non-empty final assumptions, and final
identity normalization. The allowlist applies only to the reconstructed
outermost code root. Child controls carried as private witnesses are not
filtered by it.

The decoded outer proof output still must contain the pinned inner root, but
that check does not restrict child controls. An allowed join may contain
children produced by `po2 = 14` lift, identity, PoVW, unwrap, resolve, or
another recursion control. A terminal resolve may discharge a guest-committed
`Assumption` under any explicit control root; zero denotes self-composition under
the conditional receipt root. `programId` binds the guest code and trust policy,
and applications/contracts must choose and authenticate assumption roots
safely. Ergo verifies the exact final claim; it does not silently bless an
arbitrary root or audit application-specific trust policy.

Normative inner control root:

```text
a54dc85ac99f851c92d7c96d7318af41dbe7c0194edfcc37eb4d422a998c1f56
```

Upstream verifier-parameters digest, retained as a reproduction anchor but not
sufficient to identify the Ergo profile:

```text
ece5e9b8ae2cd6ea6b1827b464ff0348f9a7f4decd269c0087fdfd75098da013
```

Accepted terminal control IDs use raw `Digest::as_bytes()` order:

| Kind | Parameter | Meaning | Control ID |
|---:|---:|---|---|
| 1 | 15 | normal lift | `1ca3ca03030719064ba61b3125bdd326fc57f74e799ef860bdea6f3227381e16` |
| 1 | 16 | normal lift | `c32b3627d2b3d60c64adf523a98bd16c0ff607471f3d6630d1f26d5e9406d841` |
| 1 | 17 | normal lift | `c9b08054994f542a6310b00d9b6fc6528ed7bb6f4ca5476a686847127cdfdc5b` |
| 1 | 18 | normal lift | `e7934a23ddce1423b425cf32aa23be29f48cd40e0b6ff9376dce6f3bf9d0bc35` |
| 1 | 19 | normal lift | `8c2fdd36ede09a4b9d316a43c51f1160cbd8876659c5f35810c3a119c60d3843` |
| 1 | 20 | normal lift | `34530b42028fb631c90e1226bb0e750d4b9b593840d45216f75dca449dac7734` |
| 1 | 21 | normal lift | `fd84d83092a1e1244d423a26d89c892ab098b467c6d82229912deb26e37d2562` |
| 1 | 22 | normal lift | `9d9dbf33535ab11f52a93839dfd23b352b7626009e81d9459fd04e488898ec6a` |
| 2 | 0 | join | `7a8f24092c34ed3eb81b3d0a0b796c588c615d3488ef9e61c21dbd1e4b83ea6e` |
| 3 | 0 | resolve | `53a7b23d07f99e5d5685e85874f5181e8486aa267a0ae607ffe9ba47c8bdda4a` |

The verifier enforces `outerPo2 == 18`, exactly one selected typed terminal ID, the official
inner root, the exact expected claim, and complete proof consumption.

The official inner root commits to the broader upstream set of 27 recursion
programs. Membership under that root is necessary but not sufficient: the
profile separately enforces the ten-entry typed outermost allowlist above and
rejects identity, union, unwrap, PoVW, every other outermost upstream control,
and the upstream `po2 = 14` lift as the outermost program. Those controls may
still occur as private children of an allowed join or resolve according to
RISC Zero typed claim semantics. The excluded `po2 = 14` lift is a
mandatory negative vector: hermetic zero-workload and minimal 191-byte
journal-bearing probes both exceed the 16,384-row `po2 = 14` ceiling, while its
seal size and node-verification work would be unchanged.

Current toy-model, conjectured analytical estimates are approximately:

```text
segment at po2 22:          95.30 bits
recursion at po2 18:        99.76 bits
union-bound composition:    95.24 bits
```

The useful headline is therefore only about `95.2` conjectured bits under that
model. This is not a proven lower bound: analyses using more conservative
proven-list assumptions can be materially lower. These figures are diagnostic,
profile-specific estimates, not a 128-bit or post-quantum guarantee. The first
profile is an interoperability profile. Stronger custody claims require a
separately reviewed hardened profile and an explicit security argument.

## 9. Proof wire format

The transaction carries only the raw succinct seal:

```text
55_667 u32 words * 4 bytes = 222_668 bytes
```

Every word uses little-endian encoding. No receipt enum, journal, claim, image
ID, vector length, or host-language serialization is included.

The global opcode transport rule derives one canonical partition from the
profile's exact proof-byte length. Let:

```text
chunkCapacity  = 65_535
exactProofBytes = 222_668
chunkCount      = ceil(exactProofBytes / chunkCapacity)
```

The division and all offset arithmetic use checked nonnegative integers. Every
non-final chunk has exactly `chunkCapacity` bytes. The final chunk has exactly:

```text
exactProofBytes - chunkCapacity * (chunkCount - 1)
```

For this profile, the only valid partition is therefore:

```text
proofChunks.length       == 4
proofChunks[0].length    == 65_535
proofChunks[1].length    == 65_535
proofChunks[2].length    == 65_535
proofChunks[3].length    == 26_063
```

Concatenation yields exactly `222_668` bytes. No partition fields are stored in
the profile manifest. Alternate partitions, empty chunks, missing bytes,
additional bytes, and trailing words are rejected before cryptographic
verification. A future fixed-size profile using this four-child ABI derives its
partition by the same rule from its manifest-owned `exactProofBytes` value.

Seal-word indices are zero-based. Raw words 0 through 31 must first be checked
as reduced BabyBear Montgomery values and decoded. The odd raw padding indices
`1, 3, ..., 15` must each equal zero before the control root is extracted.
Decoded words at indices 16 through 31 encode halfwords; each decoded `u32`
must be at most `0xffff` before little-endian `u16` extraction. The raw
Montgomery words are not subject to the halfword bound. Ignoring nonzero
padding, checking the wrong representation, or silently truncating a decoded
halfword is forbidden.

The transcript follows the pinned Poseidon2 RNG and fixed-consumption `ReadIOP`
behavior. It contains no implementation-defined rejection-sampling loop. EOF
is mandatory after the final expected read.

## 10. Profile artifacts and identity

A profile uses two immutable compiled artifacts.

### 10.1 Normative algorithm artifact

A canonical ASCII document defines parsing, transcript behavior, ordered
pseudocode, index spaces, rejection conditions, and output comparison.

Canonical text requirements:

- ASCII only;
- LF line endings;
- no BOM, CR, or NUL;
- exactly one final LF.

### 10.2 Normative binary data artifact

A fixed binary bundle contains only constants consumed by verification:
BabyBear/Ext4 arithmetic, Poseidon2 and RNG constants, FRI/STARK parameters,
dimensions, groups, `TapSet`, ordered `PolyExt` data, and precomputed absorbed
protocol information whose preimage is owned exclusively by the binary
artifact. It must not contain an independently authoritative copy or
pre-absorption of a manifest-owned value. Roots of unity in this bundle are
algebraic constants and must not be confused with the recursion control root in
the manifest.

The algorithm artifact is the single owner of parsing, control flow, rejection
conditions, transcript ordering, and output comparison. Where those semantics
require a manifest-owned value, it references the named manifest field rather
than hardcoding a second copy. Global host logic consumes manifest-owned
transport and payload bounds directly. The binary artifact owns only numeric
tables, dimensions, indices, and constants consumed by that algorithm. A rule
or manifest-owned value must not be duplicated across the artifacts. Any
numeric structure derived from a manifest field has one specified deterministic
derivation and a package-validity check; a mismatch invalidates the package
before activation.

The artifacts are compiled into the implementation. They are never supplied by
a transaction, dynamically loaded, or interpreted as a general-purpose
verifier language.

The ordered `PolyExt` data encodes separate base-field and mix-variable index
spaces and exact backward references. Algebraically equivalent reordering or
DAG rewriting is not conformant.

Required census:

```text
instructions:       12_359
field variables:    11_130
mix variables:       1_229
retMixVariable:      1_228
OUTPUT_SIZE:            32
MIX_SIZE:               20
```

Instruction counts:

```text
Const       284
ConstExt      0
Get         669
GetGlobal    52
Add        4061
Sub        1385
Mul        4679
True          1
AndEqz     1076
AndCond     152
```

`retMixVariable = 1_228` is a mix-variable index, not an instruction index.

Prover-only data, logs, source-control metadata, benchmark results, security
prose, lift-program binaries, and implementation code hashes are excluded. The
ten accepted terminal IDs and control root are normative manifest fields.
Regenerating them from upstream programs is audit evidence, not a second
normative source.

Artifact digests are:

```text
artifactDigest =
  BLAKE2b-256(
    ASCII("Ergo.StarkProfileArtifact.v1") ||
    0x00 ||
    u16le(artifactKind) ||
    u32le(artifactLength) ||
    artifactBytes
  )
```

Artifact kinds are fixed as:

```text
1 = canonical algorithm ASCII
2 = binary verifier data
```

The corrected B1 algorithm artifact is exactly 29,773 bytes, with raw SHA-256
`90a884da420a09f2c1108d7388c2ac74db8dbdb195de704206e2bf8ec1ad0bee`
and `artifactDigest`
`6ed8a807a7b55177fa664de51c1d6f0daad81daf879e651da32367fed9d171c4`.
The former 28,670-byte B1 artifact is superseded single-lift evidence only. B2
is closed for this preactivation candidate at exactly 65,119 bytes, raw SHA-256
`8c4a92b7d354890481eefdef233d4ca43f6bcd9f7cb00e4dd9e709da47789ef3`,
and artifact digest
`dd8528a8621edc8dd24aadeed7bd7a2f0c1afd88dd563c5ec8f51cc7f75df0b1`.
Any later contradiction reopens B2 and necessarily produces a new downstream
manifest and `profileId`; it is not a conditional current value.

### 10.3 Strict profile manifest V1

Manifest format byte `0x01` identifies the exact RISC Zero succinct grammar
below. It is not an upstream version or a generic zkVM-family selector. A future
profile with an incompatible receipt structure uses a newly specified manifest
format version and compiled verifier; it does not reinterpret this layout.

The proposed corrected manifest is exactly 458 bytes:

| Offset | Size | Field |
|---:|---:|---|
| 0 | 1 | `manifestFormatVersion = 0x01` |
| 1 | 4 | `exactProofBytes = 222_668` as `u32le` |
| 5 | 4 | `maxApplicationPayloadBytes = 16_384` as `u32le` |
| 9 | 1 | `outerPo2 = 18` |
| 10 | 32 | inner control root |
| 42 | 340 | ten ordered `controlKind:u8 || parameter:u8 || controlId[32]` entries |
| 382 | 38 | algorithm artifact reference, kind `1` |
| 420 | 38 | binary-data artifact reference, kind `2` |
| 458 | 0 | EOF |

The canonical typed-entry sequence is `(1,15)..(1,22),(2,0),(3,0)`, where kind
`1` is normal lift, kind `2` join, and kind `3` resolve. The parameter is the
RV32IM segment `po2` only for kind `1`; zero is the mandatory reserved encoding
for kinds `2` and `3`. No other kind or parameter is defined by V1.

Each artifact reference is:

```text
artifactKind:u16le || artifactLength:u32le || artifactDigest[32]
```

Startup and runtime package validation requires exactly 458 bytes
before field access, checked offset and length arithmetic, version `0x01`,
checked scalar decoding, positive `exactProofBytes`, ten fixed-position typed
control entries, the literal kind/parameter sequence above, ten
pairwise-distinct raw `controlId` values, and EOF at byte 458. It rejects
padding, extensions, alternate encodings, unknown versions, duplicate or
relabeled typed entries, reuse of one `controlId` under distinct entries, and trailing data. The proof
length and payload limit consumed from the raw manifest are the profile-owned
transport and input-resource bounds; proof chunking is derived globally as
specified in Section 9.

For the proposed initial package, the ten entries use the exact raw
`Digest::as_bytes()` values in Section 8. Missing, out-of-order, additional,
relabeled, or mutated initial entries invalidate the package.

Every displayed scalar, label, root, and control ID is a decoded review target
for the first raw manifest. The frozen raw manifest is their sole runtime
authority. Implementations do not validate an activated package by consulting
a separate copy in this prose. A different raw manifest has a different
`profileId` and is unavailable without a separately compiled activation.

The algorithm reference must have kind `1` and the binary-data reference kind
`2`. Artifact lengths must be nonzero and equal the exact compiled artifact
lengths. For each reference, `artifactKind`, `artifactLength`, and the digest
recomputed from the exact artifact bytes must equal the values used in the
artifact digest preimage. A copied digest with an inconsistent envelope or
artifact is invalid.

Startup also recomputes `profileId` from the exact raw manifest and requires it
to equal the ID referenced by the compiled transition package.

The manifest does not carry a zkVM-family label, hash-suite label, codec alias,
security estimate, upstream version, chain domain, program ID, cost schedule,
or lifecycle state. Those values are either completely owned by the
content-addressed artifacts, supplied per invocation, bound by the global
statement and transition rules, or retained as non-normative evidence.

```text
profileId =
  BLAKE2b-256(
    ASCII("Ergo.StarkProfileId.v1") ||
    0x00 ||
    u32le(manifestBytes.length) ||
    manifestBytes
  )

assertion: manifestBytes.length == 458
```

The complete profile-ID preimage is exactly 485 bytes.
BLAKE2b-256 means native 32-byte BLAKE2b output, not truncation of BLAKE2b-512.
No byte reversal is applied. The corrected 458-byte manifest has SHA-256
`deffb2cb231f98a348cbd166d5f1c43315661ccd8bd212099f16f238d0fe8946`
and derives `profileId`
`23c4a123ffb33a1c8db89436fe0e7972bd8e4e289459ee5fd71be5440607d383`.
These bytes fix the preactivation candidate, not network activation. The former
382-byte manifest and
`cd0493f887f84584cf325f0f7daaea9ba6a48fd92c6bbb3681921b2ed90a397d`
identify only the superseded single-lift candidate and are never current
normative values or activation inputs.

The final package publishes the raw manifest bytes, the complete profile-ID
preimage, and expected digest in addition to human-readable field tables.

Artifact construction is acyclic:

```text
artifact bytes
-> artifact digests
-> manifest
-> profileId
-> ErgoStatementV1
-> proof and final KATs
```

Artifacts must not contain their own final digest, the manifest bytes or
digest, `profileId`, profile-dependent statement/claim/KAT values, a cost
schedule or transition identifier, or provenance prose. The manifest contains
only artifact digests and never contains `profileId`, so the construction has
no self-reference.

After the corrected artifact envelopes, raw manifest, complete profile-ID
preimage, and resulting ID are reproduced independently, final B4 proofs and
KATs are generated from statements that bind that identity. They close the
receipt/conformance gate and activation package; they are not part of the
profile-ID preimage.

## 11. Fixed cost schedule

The first profile has one exact outer proof shape, a constant terminal
allowlist cardinality `K = 10`, and a payload bounded at 16 KiB. Lift
`segmentPo2`, join, and resolve do not select distinct verifier topology or
cost. A multi-term size formula would not materially distinguish admitted calls
and would add consensus surface. It therefore uses a fixed worst-case
precharge.

`CostScheduleFixedV1` is exactly 37 bytes:

| Offset | Size | Field |
|---:|---:|---|
| 0 | 1 | schedule version `0x01` |
| 1 | 32 | `profileId` |
| 33 | 4 | `fixedJit` as bounded positive `u32le` |
| 37 | 0 | EOF |

```text
scheduleId =
  BLAKE2b-256(
    ASCII("Ergo.StarkCostScheduleId.v1") ||
    0x00 ||
    u32le(37) ||
    scheduleBytes
  )
```

The canonical numeric domain is:

```text
1 <= fixedJit <= 2_147_483_647
```

Decoders use checked unsigned arithmetic and reject values above
`Int.MaxValue` before constructing SigmaState `JitCost`.

`fixedJit` covers the maximum allowed statement construction and hashing,
canonical four-chunk proof handling, expected-claim construction, transcript,
parser, verifier arithmetic, and bounded allocation behavior. Normal evaluator
costs for computing argument expressions remain additive.

The full fixed charge occurs after active-profile resolution and before
`programId`, payload, or proof evaluation. Invalid, named late-boundary-reject,
and proof-valid final expected-claim-mismatch cases pay the same native-verifier
charge as valid proofs. The already charged global `VerifyStarkDispatchCost`
remains additive; it is not included in `fixedJit`.

The activation value of `fixedJit` is `TBD`. It must be derived from the final
JVM verifier using an analytic operation census and measured valid, malformed,
tampered, named late-boundary-reject, and proof-valid final
expected-claim-mismatch paths. Benchmarks falsify underpricing; they do not
define consensus from an arbitrary hardware multiplier.

Activation additionally requires:

```text
1 <= dispatchJit <= 2_147_483_647
jitSum = checkedJitAdd(dispatchJit, fixedJit)
nativeBlockCost = floor(jitSum / 10)
nativeBlockCost <= active maxBlockCost
```

`dispatchJit` is the numeric value of `VerifyStarkDispatchCost`. Construction
and addition use checked signed-`Int` arithmetic; an overflow invalidates the
activation package. The division is the existing positive-value
`JitCost.toBlockCost` conversion. Implementations add the two charges in JIT
units before converting and must not convert them separately and then add the
rounded results. During evaluation both charges enter the ordinary SigmaState
cost accumulator rather than a second STARK-specific counter. Activation also
requires a complete canonical transaction fixture whose total cost, including
ordinary evaluator and transaction costs, stays within the active block limit.

For every STARK-changing manifest after the first manifest for its chain:

```text
newDispatchJit >= oldDispatchJit
```

For every same-`profileId` `Active -> Active` carry-forward or repricing:

```text
newFixedJit >= oldFixedJit
```

`Absent -> Active` has no old profile schedule, and
`Active -> Quarantined` has no new profile schedule, so no fixed-cost comparison
exists for those transitions. Every applicable same-`profileId` cost decrease is
forbidden.

Semantic equivalence across different artifact bytes or `profileId` values is
not mechanically decidable and is not a consensus lookup rule. Nodes do not
compare different profiles to impose a cross-ID cost floor. Every
`Absent -> Active` profile requires fresh B5 calibration. Preactivation review
rejects a proposed identity whose purpose or evidence is cost-floor evasion;
that review gate is not a transaction-validity judgment.

Every future `Absent -> Active` profile must also close a fresh direct-fit gate
before its transition is eligible: all manifest proof/chunk/payload values must
fit Sigma collection and every conforming host's checked integer/allocation
bounds; a canonical complete transaction must fit both active `maxBlockSize`
and `maxBlockCost`, including ordinary overhead; a reproduced packing proof must
show `Nblock >= 1`; peak live memory must fit the frozen B5 envelope; and a
standalone-transaction policy must be shipped/deployed before activation and
admit/relay the transaction as soon as the active tip makes the target profile
`Active`, if direct public relay is claimed. A well-defined but
unrepresentable, block-unfit, or resource-unbounded profile is not activatable.

## 12. Compiled transition tables

EIP-0045 does not add a STARK registry to block extensions. Each implementation
contains immutable historical transition tables:

```text
T(chainDomainId, protocolGeneration)
  -> (dispatchJit,
      Map[profileId, Absent | Active(scheduleId) | Quarantined])
```

`protocolGeneration` is exactly the authenticated integer stored at:

```text
ErgoStateContext.currentParameters.parametersTable(Parameters.BlockVersion)
```

It is not the three-bit ErgoTree version, the projected Byte block version, an
API parameter, local configuration, or block height alone.

Every `Absent -> Active`, `Active -> Quarantined`, profile repricing, or
`dispatchJit` increase is a STARK-changing transition. It requires a
miner-approved protocol generation and a node release containing the exact
table. One generation may carry a reviewed batch of changes.

For each `chainDomainId`, compiled STARK manifests form one sequence ordered by
strictly increasing `protocolGeneration`. No two manifests for that chain may
have the same generation. Define `applicable(chainDomainId, G)` as the manifest
for that chain with the greatest generation not exceeding `G`. If none exists,
the STARK state is `OpcodeUnavailable`. Otherwise the dispatch value, complete
profile map, schedules, lifecycle states, and selected `transitionId` are
exactly the full snapshot in `applicable(chainDomainId, G)`.

A generation with no STARK-changing manifest neither creates an implicit
manifest nor changes STARK state. It carries forward the exact applicable
snapshot. The first manifest for a chain has a zero predecessor; each later
manifest names the exact `transitionId` of the immediately preceding STARK
manifest for that chain, even when non-STARK generations intervene. At startup,
implementations validate this order, uniqueness, predecessor chain, full-
snapshot monotonicity, and the presence of every verifier, artifact, and
schedule required by every generation the binary claims to support.

### 12.1 Canonical transition manifest

Every generation that changes STARK state has one canonical full-snapshot
`StarkTransitionManifestV1`:

| Offset | Size | Field |
|---:|---:|---|
| 0 | 1 | manifest version `0x01` |
| 1 | 32 | `chainDomainId` |
| 33 | 4 | `protocolGeneration` as checked `u32le` not exceeding `Int.MaxValue` |
| 37 | 32 | `previousTransitionId`, or 32 zero bytes for initial opcode activation |
| 69 | 4 | positive `dispatchJit` as checked `u32le` not exceeding `Int.MaxValue` |
| 73 | 4 | `activatedUpdateLength` as `u32le` |
| 77 | `m` | exact canonical `ErgoValidationSettingsUpdateSerializer` bytes activated with this generation |
| `77+m` | 2 | `entryCount` as `u16le` |
| `79+m` | variable | exactly `entryCount` canonical entries followed by EOF |

Each entry is:

```text
profileId[32] || lifecycle:u8 || scheduleLength:u32le || scheduleBytes[n]
```

Lifecycle byte `0x01` means `Active`. Under EIP-0045 v1 it requires
`scheduleLength == 37`, `scheduleBytes[0] == 0x01`, strict
`CostScheduleFixedV1` decoding, and strict schedule EOF. The decoded schedule
must name the same `profileId` and produce its `scheduleId` from the exact bytes
under the global schedule-ID formula. `scheduleId` is not serialized as another
field, and no implementation-local alias or lookup key may replace this
derivation. Any other schedule version or envelope is invalid until a future
EIP defines its dispatch and identity rules. Lifecycle byte `0x02` means
`Quarantined` and requires `n == 0`. Byte `0x00` is not serialized: every
unlisted 32-byte ID is `Absent`. All other lifecycle values are invalid.

Entries are unique and sorted by unsigned lexicographic order of their raw
`profileId` bytes. All lengths and offset additions use checked arithmetic, and
strict EOF is required. A full snapshot retains every profile ever introduced;
an entry cannot disappear and silently become `Absent`.

Let `priorG` be the authenticated generation in the parent state context and
`newG` the generation returned by the current block's canonical
`Parameters.update`. A STARK activation comparison occurs only when
`priorG != newG` and `newG` is an exact compiled STARK-changing manifest
generation. For that transition, let `activatedUpdate` be the
`ErgoValidationSettingsUpdate` returned as the activated-update component of
the same calculation. State processing and candidate construction use this
identical pure old-context-to-new-context transition. The value is not the raw
proposed update, the cumulative `validationSettings.updateFromInitial`, or raw
extension bytes. The manifest field is exactly:

```text
ErgoValidationSettingsUpdateSerializer.toBytes(activatedUpdate)
```

No EIP-0045-specific re-encoding is permitted. Existing state parsing
normalizes physical absence of a proposed-update extension field to
`ErgoValidationSettingsUpdate.empty` before the parameter transition. The
canonical serialized empty vector is exactly:

```text
activatedUpdateLength = 2
activatedUpdateBytes  = 00 00
```

There is no distinct absent value at comparison time. A later profile-only
transition may therefore carry those two bytes. On initial opcode activation,
the field contains the exact activated update whose rule-1002 `ChangedRule`
value preserves all previously activated opcodes while adding `0xB9`.

A generation transition must not jump over an unapplied compiled STARK
manifest. Among manifests with generation greater than `priorG` and not greater
than `newG`, there must be none, or exactly one whose generation equals
`newG`; otherwise the generation transition is invalid. Later blocks with
`priorG == newG`, and generation transitions that only inherit an earlier
STARK snapshot, perform no synthetic STARK update comparison. Ordinary
parameter-update rules still apply at those blocks; repeating bytes from an
earlier STARK update neither selects nor reactivates that manifest.

An existing trusted light/suffix bootstrap that initializes an authenticated
state without replaying prior parameter updates does not synthesize or compare
unobserved historical STARK transitions. It must select the compiled manifest
applicable to the exact initialized chain and generation, authenticate all of
its packages, and fail initialization on any missing or inconsistent runtime.
This is not an operator-configured activation. The first canonical transition
processed after initialization uses that initialized generation as its parent
and resumes the ordinary no-jump and exact-update rules. Full genesis replay
has no exception.

```text
transitionId =
  BLAKE2b-256(
    ASCII("Ergo.StarkTransitionManifest.v1") ||
    0x00 ||
    u32le(manifestBytes.length) ||
    manifestBytes
  )
```

The raw manifest, complete ID preimage, and expected `transitionId` are
published. `T(chainDomainId, G)` is the full snapshot and `transitionId` of
`applicable(chainDomainId, G)` defined above. Lookup uses the authenticated
generation in the exact purpose-specific context assigned at the whole-input
boundary: evaluated block context, tip-derived upcoming admission context,
proposed candidate context, or explicitly selected diagnostic context. It never
uses wall clock, local configuration, height alone, or a synthetic manifest for
an intervening generation.

Comparing a new full snapshot with its predecessor permits only:

| Previous | Next | Rule |
|---|---|---|
| unlisted (`Absent`) | `Active` | permitted at a new authenticated generation |
| unlisted (`Absent`) | `Quarantined` | forbidden |
| `Active` | `Active` | same profile semantics and pointwise nondecreasing schedule |
| `Active` | `Quarantined` | permitted fail-closed transition |
| `Quarantined` | `Quarantined` | required carry-forward |
| `Quarantined` | `Active` or unlisted | forbidden |

After the first manifest, `dispatchJit` must be nondecreasing at every
STARK-changing manifest. A verifier change under the same `profileId`, any
lifecycle byte reinterpretation, any entry removal, and any applicable cost
decrease are invalid under EIP-0045.

### 12.2 Activation package and network binding

The profile artifact digests remain owned by the canonical profile manifest. A
transition snapshot references only the resulting `profileId` and exact
schedule bytes; it does not create a second copy of profile semantics.

Alongside the canonical transition manifest, the release activation package
must publish:

- decoded field tables and the exact cumulative rule-1002 value where
  applicable;
- conformance-vector set digests and all profile-reproduction evidence.

The existing network mechanism authenticates `protocolGeneration`.
Implementations compile one expected `transitionId` for each STARK-changing
`(chainDomainId, protocolGeneration)` and fail startup or validation setup if
the corresponding table, verifier, artifact, or schedule is absent or differs.
Cross-implementation fixtures reproduce the manifest and mapping.

When the exact `priorG -> newG` transition defined above enters a compiled
STARK-changing generation, and before validating that block's transactions,
the node must serialize the `activatedUpdate` returned by that block's
canonical `Parameters.update` call with the existing
`ErgoValidationSettingsUpdateSerializer` and compare it byte-for-byte with the
manifest field. The canonical `00 00` empty encoding is valid exactly when the
manifest expects it; empty versus non-empty in either direction, reordering,
mutation, or additional bytes invalidate the activation block. The table
changes only on the authenticated generation transition; presenting the
expected update at another generation does not activate it. A generation that
retains the same generation or only carries forward an earlier STARK snapshot
performs no synthetic STARK transition comparison. Candidate construction
computes and checks the same pure transition result before selecting that
candidate's transactions.

EIP-0045 v1 does not place `transitionId` in a new block-extension field and
does not claim that rule 1002 commits to profile semantics; rule 1002 commits to
opcode availability. The compiled manifest is the canonical release artifact
selected by the authenticated generation, as with other software-defined
consensus rules. Adding an explicit on-chain transition commitment would be a
separate EIP. A full registry is not justified because it would neither supply
verifier code nor prove semantic equality.

## 13. Initial opcode activation

The initial activation is atomic:

- `VerifyStark` uses ErgoTree language version 4 or later when spending an
  input;
- the first RISC Zero profile becomes `Active` in the same protocol generation;
- the standard validation-settings update changes rule 1002,
  `CheckValidOpCode`, to a `ChangedRule` whose canonical value preserves every
  previously activated opcode and includes raw opcode `0xB9`;
- the update uses the existing validation-settings prefix `0x02`;
- no prefix `0x03` is introduced.

Let `G_OPCODE` be that activation generation. The ordinary outer-ErgoTree
version check retains its historical first position. Before activation, an
outer v4 tree is therefore not spendable merely because future-version bytes
can be carried in an output. In any context where the outer language version is
otherwise admitted but `G < G_OPCODE`, a `VerifyStark` found by the applicable
structural lane causes whole-input `OpcodeUnavailable` before profile lookup.
This is distinct from an active-opcode generation in which a particular
`profileId` is `Absent` and therefore returns `false` when executed.

Both the version gate and rule-1002 update are required. Existing old
interpreters can turn an unknown-opcode parse failure into `UnparsedErgoTree`
with a default header; rule 1002 is therefore the authenticated evidence that
the unknown opcode was added by soft fork.

Upgraded nodes must preserve the exact historical v0-v3 preparation and
single-pass `DeserializeContext`/`DeserializeRegister` substitution, including
its charging, failure, and dead-branch behavior. They scan the prepared root and
maintain a monotone `seenVerifyStark` flag. The flag is seeded from that root and
updated by structurally scanning each successfully parsed and inserted subtree
once during the historical pass. An ordinary deterministic pass failure remains
final. A later ordinary soft-fork terminal result cannot erase a true flag: the
outer-language-version failure takes precedence before user Boolean evaluation,
including under negation or in a dead branch. They do not iterate substitution
or parse bytes hidden behind a newly inserted nested deserialization node. Such
a live nested node retains its historical failure behavior, so hidden bytes do
not create an execution bypass.

Only an outer v4+ tree already admitted by the active ordinary language-version
rules enters complete recursive materialization. A materialized `VerifyStark`
inherits that outer version. Profile resolution and proof evaluation still
occur only if normal evaluation reaches the invocation.

Output parsing remains compatible with the existing forward-compatible script
model. A node must not retroactively reject a preactivation block merely because
an unexecuted output contains bytes unknown to earlier software. Future v4
proposition bytes may therefore be prepositioned under the existing unparsed-tree
rules, but the output cannot be spent before the ordinary outer-version gate
admits v4. After activation the same output is spendable only when its parsed
script and transaction satisfy all then-active rules.

Consensus validity begins in activation block `H`: the reference node computes
the updated parameters and validation settings, verifies the exact activated
update against the compiled transition manifest, and only then validates that
block's transactions. Matching the target generation without the exact update
does not activate the opcode/profile and invalidates the block. Operationally,
pre-`H` mempools do not normally relay v4
transactions, so ordinary public use begins after `H` is applied, typically in
`H+1`. No artificial one-block delay is added.

## 14. Future-profile soft-fork semantics

Let:

```text
G     = authenticated protocol generation for the evaluated block/context
Gmax  = highest generation understood by the binary
Tmax  = applicable(chainDomainId, Gmax)
```

The host passes the generation, chain domain, and validation purpose through a
non-script-visible capability. At minimum the node distinguishes:

- full received-block or historical validation;
- mempool/API admission;
- local candidate construction.

The ordinary outer-ErgoTree version check occurs before this EIP lane, including
when a node calls an exposed preflight API directly; rejection or an ordinary
future-version terminal never yields a continuation. V0-v3
then retain their exact historical one-pass substitution and the structural
guard in Section 13; they never enter recursive closure or future-profile
fallback. Only an outer v4+ tree admitted by active ordinary language-version
rules computes the full materialized feature closure before normal Boolean
evaluation. It includes the outer AST, reachable and dead branches, and every
subtree produced by `DeserializeContext` and `DeserializeRegister`, including
every newly introduced deserialization occurrence until no unprocessed
occurrence remains or an ordinary consensus parser, type, resource, arithmetic,
or cost-limit failure occurs. No implementation may add a local depth,
iteration, time, or memory cap to this consensus traversal. Its only bounds are
the active ordinary SigmaState parser and resource limits, the serialized bytes
selected by the input, and the consensus cost limit.

The v4+ traversal uses a deterministic depth-first worklist, left-to-right in
canonical serialized child order. Each occurrence in the initial root and each
occurrence introduced by parsed bytes receives a fresh unprocessed identity,
even when its node bytes, selected source, expected type, or subtree digest equal
an earlier occurrence. Structural equality, hashes, interning, memoization, and
cycle detection never mark that fresh occurrence processed.

Structural children are serialized `Value` child fields in schema-defined
order and ordered-sequence elements in index order. Maps, sets,
type-substitution tables, caches, and other non-serialized metadata are opaque.
Their host-language iteration order must not affect occurrence order,
observations, materialized bytes, outcomes, or cost. Implementations derive
this traversal and reconstruction from exhaustive per-serializer schema
operations, not Scala `Product`, reflection, Kiama, collection builders, or an
unordered host-language container. When an occurrence
selects a serialized subtree, the pass adds the complete ordinary
active-generation deserialization charge for that byte string with checked
`addCostChecked` semantics before parsing it, applies ordinary type and
canonicality checks, replaces the occurrence, assigns fresh identities inside
the inserted subtree, and traverses that subtree before the next sibling. The
byte source is selected only by the node's syntactic context or register ID. A
missing source or one of the wrong ordinary type follows existing
deserialization semantics, is marked processed, and creates no hidden subtree;
a register default remains a syntactic subtree even when register bytes select
another value. The selected register source is charged, parsed, and type-checked
first; the pass then materializes the shadowed default before the selected
subtree and retains only the selected result. With no correctly typed register
source, it materializes and retains the default exactly once. A selected-source
failure therefore wins before default processing, while its committed charge
survives a later default failure. Every fresh occurrence that selects bytes is
charged even when another occurrence uses identical bytes. A direct self-cycle
or `A -> B -> A` cycle
therefore creates fresh occurrences until an ordinary consensus cost/resource
failure; equality or digest deduplication is not a fixed point. The ordinary
outer-tree substitution/script-complexity charge remains governed by active
SigmaState rules and is not duplicated by EIP-0045.

Selected bytes retain the historical stream-parser rule: `ValueSerializer`
consumes one `Value` prefix from offset zero. Any remaining suffix is opaque,
outside the materialized AST and feature closure, and still included in the
complete pre-parse byte charge. This design adds neither an EOF check nor a
whole-source reserialization-equality rule; a malformed or wrong-typed prefix
cannot recover from a valid suffix.

Feature metadata is computed while bytes are parsed and may be cached. A cache
is consensus-transparent: for identical serialized input bytes, context,
generation, and validation purpose, cached and uncached execution must produce
the same materialized closure, profile observations, outcome or exception, and
consensus cost. A cache hit never suppresses a per-occurrence byte charge or a
type, parser-version, canonicality, resource-bound, or outer-tree-version
check. The pass does not execute user collection lambdas or opcode child
expressions. For `G <= Gmax`, there is no implementation-selected unresolved
shortcut: traversal empties the worklist or propagates the ordinary deterministic
failure. Only an EIP-aware stale binary at `G > Gmax` may classify
materialization it cannot understand as a potential occurrence.

After each selected subtree is precharged, the ordinary materialization layer
returns exactly one mutually exclusive, priority-ordered classification:

1. an ordinary deterministic parse, type, canonicality, resource, arithmetic,
   or cost failure;
2. a recognized ordinary whole-input soft-fork result; or
3. only for an EIP-aware stale binary at `G > Gmax`, an explicit
   `UnresolvedFutureMaterialization` result for which no ordinary soft-fork
   result exists.

The first classification propagates as an ordinary deterministic validation
failure. For `G <= Gmax`, the second terminates whole-input preflight with the
ordinary soft-fork result and current `preflightBlockCost`. At `G > Gmax`, that
result applies only to full-block/historical validation; admission and candidate
purposes reject unsupported. It is never replaced or followed by EIP-0045
fallback. Only the third may be treated as a potential `VerifyStark` occurrence
under the future-generation matrix. If the ordinary materialization layer
cannot distinguish the third classification, full-block/historical validation
preserves its ordinary soft-fork result while future-generation
admission/candidate rejects unsupported; neither synthesizes a STARK-specific
unresolved result. One unified purpose-interpreted preflight outcome prevents
double fallback and preserves one cost accumulator.

The sole successful normal handoff is:

```text
ContinuePreflight(materializedRoot, preflightBlockCost)
```

This notation specifies the semantic handoff, not a publicly constructible
case class. An implementation may retain `materializedRoot` in an opaque,
single-use continuation so long as callers cannot replace the root, consume the
continuation twice, or enter evaluation before preflight is complete.

`materializedRoot` is the result after the v4+ worklist is empty: every
processed occurrence that selected bytes is replaced by its materialized value,
while a missing or wrong-ordinary-type source that ordinary semantics leave
unsubstituted remains explicit for live evaluation. Outer-tree preparation and
substitution enter `preflightBlockCost` exactly once; each selected-byte fresh
occurrence pays its ordinary deserialization-byte charge exactly once.

Normal evaluation receives `materializedRoot`, not the original root, through
`context.withInitCost(preflightBlockCost)`. It must not rerun substitution,
reparse selected bytes, or recharge processed occurrences. The JIT evaluator
initializes exactly once with `JitCost.fromBlockCost(preflightBlockCost)`, adds
later ordinary expression and native JIT costs, and performs its normal final
conversion. No caller adds `preflightBlockCost` again after reduction. Repeated
syntactic occurrences of the same bytes still each pay once; caching changes
runtime only.

The v4+ whole-input closure either terminates with one of the outcomes above or
returns `ContinuePreflight`. The outer language-version check has already
admitted the tree. Only after the normal return are the remaining gates applied
in this order: `OpcodeUnavailable`, then profile lookup. An explicit occurrence
discovered early must not skip later v4+ materialization when doing so would
change consensus cost. The separate v0-v3 lane preserves its historical
single-pass cost/outcome and fails only structurally visible `VerifyStark` as
specified in Section 13.

For a version-admitted outer v4+ tree at `G < G_OPCODE`,
`OpcodeUnavailable` rejects the whole input before this profile-status table is
consulted.

For `G_OPCODE <= G <= Gmax`:

| Status | Result |
|---|---|
| `Absent` | Boolean `false`; do not evaluate heavy children |
| `Active(scheduleId)` | precharge, parse, and verify |
| `Quarantined` | deterministic non-softforkable input failure |

A binary claiming support for `G` but missing a table, verifier, artifact, or
schedule required by that generation fails an implementation/startup invariant.
It must not silently treat the profile as absent.

For `G > Gmax`, preflight resolves only syntax-level constants. A
`profileId` child is static only when it is a literal `Coll[Byte]` constant, or a
constant placeholder resolved from the containing ErgoTree, with exactly 32
bytes. Preflight never evaluates an expression to prove that it is constant.

| Preflight observation | Full-block stale-node action |
|---|---|
| closure proves no occurrence | no STARK-specific fallback; continue through ordinary global soft-fork rules |
| every occurrence has a static ID known `Active` or `Quarantined` in `Tmax` | permit only the last-known EIP-0045 semantics using `Tmax`; ordinary global soft-fork rules still apply |
| any static ID is `Absent` or unknown in `Tmax` | immediate whole-input fallback |
| any ID is malformed or non-static | immediate whole-input fallback |
| feature materialization is unresolved or may hide an occurrence | immediate whole-input fallback |

Normal evaluation is permitted only when every occurrence is a static
last-known `Active` or `Quarantined` ID. Active calls use the immutable old
verifier, `Tmax` schedule, and `Tmax.dispatchJit`. Neither continuation row
authorizes another feature introduced after `Gmax`; all ordinary version and
validation-rule soft-fork checks still run and may independently fail or
soft-fork the whole input.

Immediate fallback occurs before evaluating any user Boolean expression or
opcode child. The old node returns
`WhenSoftForkReductionResult(preflightBlockCost)`, where `preflightBlockCost` is
not a profile schedule or a second meter. It is exactly the ordinary block-cost
accumulator value at the whole-input preflight exit, initialized from the input
context's `initCost` and increased by every checked ordinary preparation,
deserialization, and materialization charge actually required above. If
fallback is discovered after partial materialization, the current accumulator
is returned; no catch path may restore a value captured before that work. It is
already in block-cost units and is not passed through `toBlockCost` again.
Checked consensus-arithmetic overflow and cost-limit exhaustion are
deterministic validation failures that make the evaluated input ledger-invalid;
they never become fallback or Boolean `false`. No evaluator cost is reset, and
no cost-deferred collection wrapper has begun. Feature metadata construction
must remain linear
in already bounded parsed bytes and be covered by the same deserialization or
script-complexity charging; this is an activation benchmark and adversarial-test
obligation.

Mempool/API admission and candidate construction are stricter. When `G > Gmax`,
the presence of any `VerifyStark`, or an unresolved materialization that may
hide one, rejects admission before Boolean evaluation regardless of static ID,
lifecycle, or short-circuit position. A stale binary therefore cannot construct
blocks using a transition it does not understand.

This preflight fallback is safe under arbitrary Boolean composition because it
accepts the whole input, never substitutes an opcode-local Boolean. It may
accept an input whose invocation would have been short-circuited or whose other
branch is false; that deliberate superset is the stale-node soft-fork behavior.
For permitted known calls, irreversible quarantine, nondecreasing global
dispatch, and nondecreasing same-`profileId` active fixed cost keep the stale
valid set and cost no stricter than the upgraded rules. No cross-ID floor is
assumed. A future protocol that changes global opcode semantics or decreases an
applicable understood cost cannot reuse this compatibility envelope without a
separate design.

## 15. Quarantine and exception taxonomy

Quarantine is a network-activated fail-closed transition. It has no
administrator key and no mutable local override. It affects executed
invocations from its activation generation onward; unreachable short-circuited
code is not executed.

Returning `false` for quarantine is forbidden because:

```text
!verifyStark(validProof, quarantinedProfile)
```

would become `true`.

Required outcomes are:

| Condition | Outcome |
|---|---|
| v0-v3 `seenVerifyStark` is true and the historical pass has no ordinary deterministic failure | deterministic whole-input version failure; later ordinary soft-fork cannot erase the flag; no recursive EIP closure |
| version-admitted v4+ tree in an `OpcodeUnavailable` generation | deterministic whole-input failure before profile lookup |
| known `Absent` profile after opcode activation | `false` |
| active valid proof | `true` |
| active invalid or canonically malformed proof | `false`, after full precharge |
| active wrong program ID, payload, claim, lengths, or trailing data | `false`, after applicable precharge |
| quarantined profile | non-softforkable deterministic input failure |
| future-generation preflight cannot prove all IDs last-known | whole-input fallback with `preflightBlockCost` before Boolean evaluation |
| any possible `VerifyStark` under a future generation, admission or candidate mode | reject unsupported before Boolean evaluation |
| consensus cost limit, checked consensus-arithmetic overflow, or active ordinary consensus resource limit | deterministic validation failure; evaluated input is ledger-invalid |
| OOM or host allocation failure | abort validation without a ledger-validity verdict |
| missing table, verifier, artifact, or schedule | startup or implementation invariant failure; no ledger-validity verdict |

The verifier must not use `catch (Throwable) => false`. It catches only
enumerated invalid-proof and canonical-format failures. Cost, quarantine,
future preflight, allocation, and invariant failures remain distinguishable.
OOM, host allocation failure, and missing implementation material are not
consensus outcomes of a transaction. A node encountering one stops that
validation attempt without declaring the input or transaction ledger-invalid;
conforming releases prevent missing-material cases at startup.

## 16. Direct-transaction envelope

For the exact four chunks:

```text
raw seal                                      222_668 bytes
serialized Coll[Coll[Byte]] constant          222_682 bytes
```

Measured sigma-rust/ergo-lib-wasm-nodejs 0.28 fixture sizes are:

| Fixture | Serialized size |
|---|---:|
| one input, empty Sigma proof, successor and fee, zero payload | `222_883` |
| same fixture, 16,384-byte payload | `239_269` |
| same plus two 32-byte IDs in the extension | `239_339` |
| serializer-only stress fixture with an approximately 4,096-byte successor script; complete output-box validity not established | `243_356` |

At the recommended node-policy ceiling:

```text
maxTransactionSize = 262_144 bytes
```

the serializer-only stress row is arithmetically `18_788` bytes below the
policy ceiling, but it is not consensus-validity or transaction-headroom
evidence until its complete successor output is shown to serialize within the
4,096-byte box limit. The two-variable
ContextExtension containing the proof and maximum payload is `239_073` bytes in
the measured fixture. The fixed 159-byte statement header is constructed during
evaluation and is not transmitted again.

The first profile fixes:

```text
maxApplicationPayloadBytes = 16_384
recommended maxTransactionSize policy = 262_144
```

`maxTransactionSize` is submission-API, mempool, and
unconfirmed-transaction-gossip admission policy, not a new consensus parameter.
Consensus continues to bound the block transaction section through
`maxBlockSize`. A raw transaction decoder shared with received-block or
historical synchronization must bypass this standalone policy in those block
contexts; otherwise local relay policy would become accidental consensus.

Conformance uses one byte-identical boundary pair: a standalone transaction of
262,144 bytes is admitted and one of 262,145 bytes is rejected before native
parsing, while that exact 262,145-byte transaction is still decoded and assessed
by consensus inside an otherwise valid received or historical block whose total
size and cost fit the active limits.

The 256 KiB default must be deployed before opcode activation so normal users
can relay the direct transaction after activation without privileged miner
submission.

### 16.1 Admission-layer CPU protection

Consensus cost protects received blocks, but an invalid proof can consume CPU
before a transaction is admitted. Every node implementation therefore needs a
bounded admission work controller around native STARK verification. It is local
policy and must never change received-block or historical consensus validity.

Required properties are:

- acquire a coarse global CPU-and-memory permit and debit the applicable
  per-source budget before recursive v4+ feature closure in admission,
  candidate, or mempool-revalidation mode; reject or defer before closure if no
  permit is available;
- after structural preflight, atomically upgrade to profile-weighted work and
  memory reservations for every possible invocation, or a conservative
  aggregate bound, before proof parsing or cryptographic work;
- bound concurrent native verifications and their aggregate reserved memory;
- debit both per-peer and global work budgets before verification, with failed
  or malformed attempts never receiving a cheaper reservation than successful
  attempts of the same fixed-shape profile;
- suppress exact transaction replays before evaluation and use a bounded,
  generation-aware cache keyed by profile, expected claim, and seal digest to
  suppress repeated semantic verification;
- bound every cache by count, bytes, and lifetime so cache pressure cannot
  become a second denial-of-service vector;
- account work in deterministic profile units, such as the active fixed
  schedule weight, rather than wall-clock time or a CPU-model-specific quota;
- run activation, repricing, quarantine, and reorg mempool revalidation through
  the same bounded controller and queue under an internal attribution bucket,
  without debiting an old remote peer and without bypassing global capacity;
- keep admission rejection, deferral, and peer scoring outside consensus and
  expose counters for reserved, completed, rejected, cached, and failed work.

Concurrency and token-bucket numbers are operational settings, not EIP
constants. Their shipped defaults must be justified by the published peak
memory and throughput measurements of the final verifier. Candidate
construction uses the same reservation path; full-block validation uses the
consensus cost limit and cannot be rejected because a local admission bucket is
empty.

## 17. Reorg and state behavior

The STARK verification capability is derived from the exact historical
`ErgoStateContext`. It is not stored in a mutable singleton.

Because the protocol generation and validation settings are versioned state:

- a reorg below initial activation restores no applicable STARK manifest and the
  opcode-unavailable capability state; a v4 spend then fails the ordinary
  outer-version check before capability lookup and no EIP recursive closure
  runs;
- a reorg below quarantine restores the prior `Active` state;
- a reorg across repricing restores the historical schedule;
- mempool transactions are revalidated and evicted or readmitted at every
  transition and relevant reorg.

After a reorg, every validation purpose reselects its own exact context:

- replayed full-block or historical validation uses that block's post-extension,
  post-`Parameters.update`, pre-transaction context;
- mempool and submission admission recompute the upcoming context from the new
  canonical tip;
- candidate construction uses the proposed candidate's post-extension,
  post-update, pre-transaction context; and
- diagnostics explicitly select a concrete consensus context.

Transition lookup never substitutes the node's wall clock or mutable local
configuration for these purpose-specific contexts. A purpose/context mismatch
remains an implementation invariant failure after reorg.

## 18. Implementation decomposition

Activation requires coordinated work in four separately reviewable surfaces.

### 18.1 EIP and rationale

- replace the five-child draft ABI with the four-child ABI;
- remove `costParams`, `vmType`, arbitrary proof parameters, chaining, and the
  bespoke prototype as the initial profile;
- specify every byte format, lifecycle outcome, activation rule, and readiness
  claim in this document;
- label the RISC Zero security boundary accurately;
- publish the transition and conformance manifests.

### 18.2 SigmaState

- AST node and serializer for the exact four-child ABI;
- language-version and feature-presence checks, including dead branches and
  trees produced by `DeserializeContext` and `DeserializeRegister`;
- trusted host capability for chain domain and protocol generation;
- purpose-specific full-block, historical, mempool/submission, candidate, and
  diagnostic contexts with fail-closed purpose/context pairing;
- immutable profile modules, artifacts, and fixed schedules;
- RISC Zero seal parser, transcript, claim, and verifier;
- exact v0-v3 legacy single-pass guards plus v4+ full materialized-feature
  closure with cached feature metadata and pre-evaluation future-profile
  fallback;
- narrow exception taxonomy that cannot convert cost, quarantine, or invariant
  failures into invalid-proof `false`;
- exact JIT precharge order and tracing;
- Scala/JVM and Scala.js compatibility where the shared module requires it.

### 18.3 Ergo node

- construct the trusted STARK capability from `ErgoStateContext`;
- compute the same pure `Parameters.update` transition in state and candidate
  paths and compare its activated-update bytes with the compiled transition
  manifest before transactions at every STARK-changing generation;
- distinguish full-block, admission, and candidate validation purposes;
- apply the exact future-generation structural-preflight outcome at the whole
  input boundary before Boolean evaluation;
- deploy the 256 KiB transaction policy before activation;
- implement reservation-before-crypto, bounded concurrency and memory,
  per-peer/global failed-work accounting, and bounded replay suppression;
- carry the rule-1002 opcode update in the activation proposal;
- revalidate the mempool on activation, quarantine, repricing, and reorg;
- exercise complete block-candidate and state-application paths.

### 18.4 Independent oracle and fixtures

- pin the official RISC Zero implementation;
- after B3, archive digest-bound KAT receipts for all eight direct lifts, one
  real multi-segment terminal join, one real assumption-bearing terminal
  resolve, and resolve-then-join ancestry;
- in each of two clean environments, verify every archived KAT byte-for-byte
  and generate a fresh randomized shipping receipt for every required positive
  case;
- extract raw seals without host serialization;
- independently serialize artifacts, manifest, profile ID, statements, claims,
  schedules, and transition manifests;
- compare official Rust and JVM acceptance on identical archived bytes and on
  every fresh receipt without comparing randomized proof digests; and
- publish digest-bound positive and isolated negative vectors plus the fresh
  generation invariant reports.

## 19. Minimum adversarial test matrix

### 19.1 ABI and serialization

- four-child AST round-trip and golden bytes;
- wrong child type/order rejected;
- v0-v3 input tree containing the opcode rejected even under dead branches;
- direct and historical-one-pass-introduced v0-v3 `VerifyStark` fail the version
  guard, while dead first-level, dead newly inserted nested malformed, and live
  newly inserted valid deserialization fixtures preserve pre-EIP v0-v3 outcomes
  and exact costs;
- a v0-v3 fixture where occurrence A inserts `VerifyStark` and later occurrence
  B returns an ordinary soft-fork result proves the monotone flag preserves the
  typed version failure, while a later ordinary deterministic pass failure
  remains final;
- v4+ feature closure repeats after every `DeserializeContext` and
  `DeserializeRegister`, with direct self-cycle and `A -> B -> A` fixtures
  proving fresh occurrence identities, no equality/digest deduplication, and
  exact ordinary cost/resource failure;
- cached and uncached feature closure agree after every substitution, and no
  outer-tree cache can hide a feature introduced by materialization;
- cached and uncached preflight return identical closure, outcome or exception,
  and consensus cost for repeated, nested, malformed, differently typed, and
  differently versioned subtree bytes;
- v4 activation boundary;
- preactivation output carrying future v4 proposition bytes remains valid and
  preserved, its preactivation spend fails the outer-version gate, and the same
  output can be spent after activation when otherwise valid;
- opcode `0xB9` present in the canonical rule-1002 update;
- previous activated opcode bytes preserved.

### 19.2 Lifecycle and Boolean composition

For `V = verifyStark(...)`, test:

```text
V
!V
V || P
V && P
if (P) V else Q
collection predicates containing V
```

Cover:

- outer-version rejection of the preactivation v4 spend, plus
  `OpcodeUnavailable` under negation and dead branches whenever an outer version
  is otherwise admitted while the opcode is unavailable;
- known absent;
- active valid and invalid proof;
- future generation with every occurrence a static last-known `Active` or
  `Quarantined` ID continues only the old supported paths;
- future static-absent, unknown, malformed, dynamic, and unresolved-materialized
  IDs in reachable and dead branches;
- mutually exclusive ordinary failure, ordinary soft-fork, and explicit
  `UnresolvedFutureMaterialization` classifications, including proof that an
  ordinary soft-fork result is never also treated as STARK fallback;
- v4+ worklist exhaustion under ordinary consensus bounds, with no equality,
  digest, cycle, or local-cap shortcut and no unresolved shortcut for
  `G <= Gmax`;
- historical outer-version ordering and exact v0-v3 single-pass compatibility,
  followed for admitted v4+ trees by closure and cost completion before
  `OpcodeUnavailable` and profile lookup;
- continuation with no STARK occurrence or only last-known IDs still applying
  all ordinary global version and validation-rule soft-fork logic;
- quarantine under negation;
- full-block fallback versus admission/candidate rejection;
- cross-version fallback returns exactly the checked materialization-prefix
  cost and evaluates no user Boolean expression, collection lambda, or opcode
  child;
- normal continuation passes only `materializedRoot` through one
  `context.withInitCost(preflightBlockCost)`, initializes JIT once with
  `fromBlockCost`, and never reparses, recharges, or re-adds the preflight cost;
- nested `flatMap` and other deferred-cost wrappers are never entered on a
  future-fallback path;
- multi-input amplification fixture proves that repeated future fallback is
  bounded by the ordinary parsing/materialization work and that stale-node
  preflight cost is no greater than current-node cost for the same input;
- missing compiled verifier/schedule as a fatal invariant.

### 19.3 Profile and parser

- raw manifest, complete profile-ID preimage, and digest reproduced byte for
  byte by two serializers;
- typed control entries missing, duplicated, reordered, relabeled, or outside
  exact `(1,15)..(1,22),(2,0),(3,0)`, plus one `controlId` repeated under two
  different typed entries;
- artifact-reference kind/length disagreement rejected even when a copied
  digest field matches;
- exact four chunk lengths and total;
- every alternate partition rejected;
- every truncation and trailing-byte case rejected;
- a single-fault nonzero mutation at every odd padding index `1, 3, ..., 15`;
- halfword overflow at every index from 16 through 31;
- outer `po2`, inner root, claim, assumption, and EOF mutations;
- valid membership under the broader upstream control root paired with a
  `po2 = 14` control ID or another control ID outside the ten-entry EIP terminal
  allowlist;
- identity, union, unwrap, PoVW, and every other stock control rejected as the
  terminal, while resolve-then-join ancestry remains positive;
- terminal-resolve explicit-root and zero-root semantic branch vectors,
  including root, assumption-claim, `programId`, and final-claim mutations;
- digest-bound archived positives for all eight direct lifts, one real
  multi-segment join, one real assumption-bearing resolve, and
  resolve-then-join ancestry, with isolated terminal/root/claim mutations;
- one independently fresh randomized shipping receipt for every required
  positive case in each of two clean environments, matching every deterministic
  profile invariant without requiring proof-byte equality;
- one aggregate run-evidence record per precommit with exactly eleven entries
  in case-index order, plus missing/duplicate/reordered-entry negatives;
- one exact positive detached-signature KAT and isolated negatives for
  identity/small-order/mixed-torsion or noncanonical `A`/`R`, `S >= L`, wrong
  key/run/domain/message/length, raw-evidence signing, and Ed25519ctx/ph
  substitution;
- every isolated evidence-protocol failure required by EIP Section 20.4,
  including noncanonical JCS, duplicate/unknown fields, malformed hex/decimal,
  wrong schema digest/preimage, and precommit/run leakage into `LOCK.json`;
- evidence negatives for changed precommit bytes/digest, duplicate run IDs,
  precommits, or evidence keys, false declarations, missing/late/wrong-tag
  anchor, creation-height substitution, anchor or challenge reorg, wrong
  height/block-ID order/case index, payload or claim mutation, nonempty pre-generation
  root, noncanonical manifest path/order, forbidden filesystem entry,
  omitted/extra file, wrong length/digest, manifest/evidence/signature
  self-inclusion, cross-environment reuse, and incomplete closure record.

All ten typed terminal entries and all eleven required positive cases are
mandatory under Manifest V1. A missing archived KAT or fresh-generation
invariant result blocks that profile; the set cannot be narrowed without an
explicit EIP revision and a freshly reproduced B3 profile identity. A new
manifest format is required only if that revision changes the grammar
incompatibly.

### 19.4 Statement and claim

- chain-domain derivation from raw genesis block-ID bytes, including no-reversal
  and genesis-state-digest confusion vectors;
- separation across mainnet and the exact genesis ID pinned by each test-chain
  transition manifest;
- `programId` equality with RISC Zero `Digest::as_bytes()` and rejection of
  whole-digest and per-word reversal variants;
- profile, program, contract, payload-length, and payload mutations;
- ordered-output/application binding fixture;
- exact KAT intermediates and final expected claim;
- strict EOF and no alternative tag encoding.

### 19.5 Cost and resource behavior

- charge occurs before all heavy children;
- valid, malformed, early canonical cryptographic reject, late cryptographic
  reject at an explicitly named verifier boundary, and proof-valid final
  expected-claim-mismatch paths, with the exact last completed normative step
  recorded rather than inferred from byte position;
- every executed invocation pays dispatch, including malformed, absent,
  and quarantined IDs on nodes that understand the generation;
- future-preflight IDs execute no invocation and pay no dispatch, while feature
  closure remains linear in and covered by already charged parsed bytes;
- every selected serialized subtree is charged before parsing, repeated bytes
  are charged per syntactic occurrence, and fallback after partial
  materialization returns the current accumulator without rollback or a second
  `toBlockCost` conversion;
- allocation and peak-memory measurements;
- cost-limit and arithmetic-overflow propagation;
- no exception swallowed by invalid-proof handling;
- OOM, allocation, and missing-material paths produce no ledger-validity
  verdict;
- `fixedJit` values `0`, `Int.MaxValue + 1`, and `u32::MAX` rejected;
- activation refused when the fixed charge or canonical full transaction cannot
  fit the active block-cost limit;
- `dispatchJit` nondecrease enforced after the first manifest and `fixedJit`
  nondecrease enforced only for same-profile `Active -> Active`; every
  applicable same-profile decrease refused without comparing absent or
  quarantined schedules;
- cross-ID profiles are never compared for a consensus cost floor, every
  `Absent -> Active` profile carries fresh B5 evidence, and cost-evasion review
  remains a preactivation gate rather than transaction validity;
- block filled to both size and cost boundaries;
- checked overflow and block-fit tests for `dispatchJit + fixedJit`, including a
  rounding fixture that proves the JIT values are added before division by 10
  rather than converted separately.

### 19.6 Transaction and policy

- final JVM transaction with realistic outputs, registers, tokens, fee, and
  Sigma proof;
- JVM/sigma-rust byte-identical round-trip;
- standalone policy accepts `262_144` and rejects `262_145` bytes through API,
  unconfirmed-transaction P2P gossip, and mempool, while the byte-identical
  `262_145` transaction is decoded and consensus-validated inside an otherwise
  valid received and historical block within active limits;
- payload `16_384` accepted and `16_385` rejected before crypto;
- block candidate and full block application;
- coarse global/per-source admission reservation occurs before recursive
  closure and atomically upgrades to profile reservations before native parsing
  or verification;
- bounded-concurrency, memory-budget, per-peer/global budget, replay-cache,
  eviction, expiry, and cache-pressure tests;
- saturated transition/quarantine/reorg revalidation uses the same global queue
  under internal attribution, without old-peer debit or capacity bypass;
- exhaustion of an admission budget never changes full-block validation;
- liveness guard against the contemporaneous `maxBlockSize`.

### 19.7 Activation and reorg

- raw transition manifest, complete ID preimage, and digest reproduced byte for
  byte by two serializers;
- unsorted or duplicate entries, unknown lifecycle, noncanonical schedule,
  schedule length other than 37, schedule version other than `0x01`, trailing
  bytes, checked-length overflow, or broken predecessor rejected;
- full-snapshot comparison rejects entry removal, direct
  `Absent -> Quarantined`, quarantine reversal, same-ID verifier change, and
  an applicable dispatch or same-ID active fixed-cost decrease;
- expected non-empty update versus actual canonical empty, expected empty
  versus actual non-empty, reordered, one-byte-mutated, or additional activated
  update rejected before transaction validation;
- physical absence of a proposed update normalizes to, and compares exactly as,
  the canonical serialized empty object `00 00`;
- the compared update is the activated-update result of `Parameters.update`,
  not the raw proposal or cumulative `updateFromInitial`;
- exact expected validation update without the corresponding generation
  transition does not activate the table;
- only exact `priorG != newG` entry into a compiled STARK-changing generation
  compares the activated update; later same-generation and inherited-snapshot
  blocks compare nothing;
- a generation change that jumps over an unapplied compiled STARK manifest is
  rejected;
- per-chain manifest generations are unique and strictly increasing; lookup at
  an intervening non-STARK generation selects the greatest prior generation and
  carries its full snapshot and `transitionId` unchanged;
- preactivation, activation block `H`, and postactivation behavior;
- old pre-opcode, EIP-aware stale, and current node matrix;
- activation followed by reorg below `H`;
- `Active -> Quarantined` followed by reorg to `Active`;
- repricing followed by reorg to the old schedule;
- mempool eviction/readmission at every boundary through the same bounded
  controller and queue under internal attribution;
- post-reorg full/historical, mempool/submission, candidate, and diagnostic
  paths each reselect the purpose-specific context defined above.

### 19.8 Testnet observation

Before the first covered block, freeze and digest-publish a
`TestnetObservationPlanV1`; after the campaign, publish a bound
`TestnetObservationReportV1` with raw evidence digests. The plan binds the
testnet genesis; exact target profile/schedule/transition and activation
generation; `activationKind` equal to `InitialOpcodeProfile` or `LaterProfile`;
node builds; B5 resource envelopes; exact `maxBlockSize`/`maxBlockCost`;
admission configuration; finite start/event/end/abort heights; deadline;
node/operator/machine roles; workload schedule; telemetry schema; and numeric
exit thresholds. Thresholds derive from
frozen B5 evidence, active block limits, network timing, and shipped hard caps;
none may be chosen or relaxed after the run starts.

The resource envelope, plan, and report use strict RFC 8785 JCS bytes, frozen
schemas, and domain-separated SHA-256 IDs. The plan binds its schema and sorted
resource-envelope IDs; the report binds its schema, exact plan ID, and a
path-sorted digest manifest of every raw evidence file. Before `startHeight`,
the plan ID is anchored under the exact B8 tag in an ordinary testnet output
`R4: Coll[Byte]`. Actual inclusion height must be earlier than `startHeight`;
the report proves transaction-root inclusion and canonical ancestry through
`endHeight`. Missing, late, mutated, or reorged anchors fail.

Resource-envelope pass bounds equal named shipped hard configuration values or
coefficient-free formulas over named protocol parameters; all configuration
names, values, formulas, inputs, and digests are bound. Saturated-block
validation on the slowest supported class is bounded by the exact target block
interval. Percentiles, measured headroom, and safety multiples remain
diagnostics and cannot be promoted to gates after results are known.

Before `startHeight`, the plan freezes a named implementation roster with each
entry's repository, commit, build digest, operator, role, and objective
inclusion criterion. The topology includes independently operated producer,
validator/relay, and archival/reorg-observer roles, at least two independently
built and operated validators, and the slowest retained B5 CPU/JVM class plus
smallest-memory supported class. Only implementations on the frozen roster
count toward the campaign. A later-advertised implementation neither joins nor
invalidates that run, but requires a new or amended predeclared campaign before
it can be represented as activation-compatible.
Duration spans every longest configured refill, replay, cache, reservation,
queue, mempool-revalidation, and voting/activation horizon from saturation and
then exercises post-boundary reuse. `InitialOpcodeProfile` covers outer-version
rejection/unavailable capability, atomic v4/opcode/profile activation, active
use, repricing, quarantine, rollback to active, rollback below initial
activation, and reactivation. `LaterProfile` starts with v4/opcode active and
only the target profile `Absent`, then covers target activation, active use,
repricing, quarantine, rollback to active, rollback below target activation to
`Absent`, and target reactivation.

Derive `Nblock` as the maximum executed invocation count over any valid block
arrangement fitting both final size and cost. Include repeated calls reusing one
transmitted proof/payload and split-transaction arrangements. Independently
reproduce per-added-call byte/cost lower bounds and a machine-checkable packing
search, with a tight `Nblock >= 1` witness and impossibility proof for
`Nblock + 1`; zero blocks activation. Exercise the complete frozen positive
receipt-family set (the eight direct lifts plus the real multi-segment join,
assumption-bearing resolve, and resolve-then-join cases for initial Manifest V1),
the maximizing repeated-call arrangement, saturated `Nblock` blocks before
quarantine and after rollback, frozen early-reject and named
late-boundary-reject classes on every applicable ingress path, one full global
and per-source burst before and after complete
refill, a continuous stream at the exact shipped sustainable rate for one full
refill horizon, multi-source global saturation, and replay before/after expiry.
While quarantined, resubmit a previously valid call and test the invalid-block
path plus negation resistance. After rollback below target activation, the
initial variant proves the unavailable snapshot, outer-version rejection, and
no EIP closure. The later-profile variant proves v4/opcode remain active, only
the target is `Absent`, `V` pays dispatch then returns `false` without heavy
children, `!V == true`, and unrelated profiles are unchanged. Both repeat
mempool revalidation and require the same valid fixture after target
reactivation.

Passing requires zero result/cost/state/lifecycle divergence, unexpected
host-no-verdict, crash, OOM, deadlock, unbounded growth, recursive v4+ closure
before the coarse permit, native proof parsing/cryptography before the atomic
profile reservation, double verification, or violation of frozen memory,
concurrency, queue, cache, throughput, relay, and saturated-block envelopes. Missing work,
telemetry gaps, deadline expiry, or a bound violation fails. Any substantive
code, profile, schedule, transition, block-size/cost limit, B5, admission, or
plan change requires a new plan and full rerun; logging-only changes preserve
evidence only if every bound binary and configuration digest is unchanged.

## 20. Activation gates

Architecture may be frozen independently of profile readiness. Mainnet
activation remains blocked until all applicable gates are closed:

1. The two artifact grammars and exact bytes are complete.
2. Every profile-manifest field is named, assigned, and justified as
   identity-critical; unnecessary metadata is removed and the final grammar and
   length are frozen.
3. The transition-manifest snapshot grammar, predecessor link, activated update,
   dispatch value, profile entries, and schedules are frozen and reproduced.
4. Two independent implementations reproduce artifact digests, the final
   manifest, `profileId`, and schedule/transition IDs.
5. The final `profileId` is present in every profile-identity field and all
   proof-dependent KATs are regenerated afterward.
6. The complete RISC Zero reproduction lockfile pins host Rust 1.89, guest Rust
   1.88.0, host and guest targets, local-prover settings, the guest-builder OCI
   image by digest and platform, and deterministic extraction/KAT-verification
   commands.
7. Two clean environments reproduce deterministic artifacts and archived KAT
   verification byte-for-byte, anchor distinct precommits, then independently
   generate challenge-bound randomized receipts and complete run records
   matching all profile invariants without comparing proof digests.
8. Official Rust and JVM verifiers agree on archived KATs, fresh shipping
   receipts, and all isolated negative vectors for every required positive
   case and all ten terminal IDs.
9. The JVM verifier has complete operation, allocation, valid, invalid, named
   late-boundary-reject, and final expected-claim-mismatch measurements.
10. `VerifyStarkDispatchCost` and `fixedJit` are frozen from the final
    implementation, checked together against the block limit, and independently
    audited.
11. Exact v0-v3 legacy-lane preservation and v4+ materialized-feature closure/
    future preflight are independently tested; the v4+ pass executes no user
    expression or deferred-cost wrapper, and its structural work is covered by
    existing charges.
12. The 256 KiB node policy and bounded admission-work controller are released,
    stress-tested, and deployed before activation.
13. Node block, mempool, candidate, activation, quarantine, repricing, and reorg
    integration tests pass.
14. The exact cumulative rule-1002 `ChangedRule` bytes, including `0xB9`, are
    frozen and reproduced by an activation fixture.
15. An independent consensus review and independent cryptographic review are
    complete.
16. A testnet activation manifest pins that chain's exact genesis block ID, and
    the predeclared Section 19.8 observation plan completes with a passing
    digest-bound report.
17. The exact mainnet transition manifest is reviewed before miner voting.

Passing unit tests or publishing a polished EIP does not satisfy these gates.

## 21. Rejected alternatives

### 21.1 Full `0x03` on-chain profile registry

Rejected because it adds canonical snapshots, roots, epochs, proposal binding,
chunking, persistence, reconstruction, rollback, capacity rules, and split
surfaces without supplying verifier code or eliminating the whole-input
soft-fork requirement.

### 21.2 One ErgoTree version per zkVM

Rejected because the current header has only three version bits. The opcode ABI
uses one new language version; future profiles use authenticated protocol
generations and compiled transition tables.

### 21.3 Script-declared `Q`, depth, or verifier parameters

Rejected because declared work can diverge from actual proof work and because
cryptographic difficulty is part of an immutable profile, not an application
choice.

### 21.4 Generic executable semantic descriptor

Rejected because it would create another consensus virtual machine with new
typing, indexing, arithmetic, bounds, and interpreter semantics. Profiles are
compiled, explicit modules with content-addressed normative artifacts.

### 21.5 Benchmark-only or arbitrary hardware-multiplier costing

Rejected because protocol constants must not depend on an unstable machine
ratio. The final fixed charge combines an analytic census with measurements
that can disprove underpricing.

### 21.6 Multi-transaction proof chaining

Rejected for the first profile. The chosen 256 KiB admission policy and 16 KiB
application payload permit a direct one-transaction proof path with useful
headroom.

## 22. Evidence pins

The design is based on the following pinned implementation observations:

```text
RISC Zero v3.0.5:
8eb06ab020a92dc5b63ba6dd0836d432aba6d890

SigmaState original #1116 head audited before the four-child/profile rewrite:
730c6c15a8da4d882cf24f849a1f230debfd3662

SigmaState final implementation commit:
9372697f789619999a21baf42b7656719eb26d47

SigmaState pre-EIP base:
61ddfac896857aa7da578a68be27792558d1023b

Ergo reference-node snapshot used for pipeline and policy analysis:
4a7dba059794054fc4c81f5d990dafdeb4f97a49
```

The RISC Zero, SigmaState, and node pins are reproduction anchors. The final EIP
must link each normative claim to the exact source path or published artifact
that decides it.

The RISC Zero reproduction lockfile must additionally publish the repository
URL, exact crate and source paths, enabled Cargo features, `Cargo.lock` digest,
host Rust 1.89 toolchain, RISC Zero guest 1.88.0 toolchain, host and guest target
triples, guest-builder OCI image digest and platform, build profile,
local-prover and development-mode settings, and commands used to generate fresh
receipts,
extract raw seals, verify archived KATs, control IDs, constants, and every
quoted deterministic intermediate digest. Fresh randomized seal digests are
recorded as run evidence but are not reproducibility targets. A commit hash or
mutable image tag alone is not a reproducible build environment and remains
non-normative evidence.
