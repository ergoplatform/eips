# EIP-0045: Cryptographic Rationale and Security Considerations

**Status:** Draft; architecture selected, first profile not activation-ready
**Author:** A. Shannon
**Updated:** 2026-07-20
**EIP:** [ergoplatform/eips#103](https://github.com/ergoplatform/eips/pull/103)
**Implementation:** [sigmastate-interpreter#1116](https://github.com/ergoplatform/sigmastate-interpreter/pull/1116)

## Abstract

EIP-0045 proposes `VerifyStark`, a consensus-native ErgoScript operation for
verifying one bounded STARK receipt in one ordinary Ergo transaction after the
proposed 262,144-byte node policy is deployed. The initial profile targets an
exact RISC Zero v3.0.5 succinct receipt emitted by a shipping prover. It accepts
the reviewed terminal `lift`, `join`, and `resolve` controls needed for ordinary
single-segment, multi-segment, and assumption-bearing succinct receipts. It
remains intentionally narrower than the full set of recursion programs that
RISC Zero can produce.

The design has four central properties:

1. The transaction selects an immutable verifier profile, not cryptographic or
   costing parameters.
2. Ergo constructs the statement that binds the proof to the network, profile,
   guest program, executing contract, and application payload.
3. A fixed profile charge is taken before proof evaluation or native
   cryptographic work, while separate admission controls bound unpaid mempool
   exposure.
4. New zkVMs can be added through new immutable, network-activated profiles
   when they remain compatible with the opcode ABI and resource envelope.

This document explains why those choices were made and what security claims
they do and do not support. It is not the consensus specification. Complete
acceptance depends on the EIP's global rules, the content-addressed profile
package, the historical lifecycle and cost schedule, the compiled transition
snapshot selected by the authenticated protocol generation, and the validation
purpose. Test vectors, benchmarks, and the pinned upstream implementation are
evidence, not alternate sources of consensus semantics.

## 1. Status and scope

The consensus architecture is selected, but the first profile is not ready for
activation. The single-lift B1-B3 candidate was independently reproduced, then
superseded before activation when review established that the shipping
`ProverOpts::succinct()` path ends multi-segment receipts with `join` and
assumption-bearing receipts with `resolve`. The corrected outermost-terminal
`lift`/`join`/`resolve` B1-B3 package is now deterministically regenerated and
independently verified. B4-B8 remain open; in particular,
the final conformance corpus, `dispatchJit`, `fixedJit`, activation transition,
reproduction reviews, and node-readiness evidence are not yet complete.

The exact closed B1-B3 candidate bytes and their checksums are published in
the EIP repository's
[`eip-0045/profile-v1/`](eip-0045/profile-v1/README.md) bundle. Publishing that
content-addressed package makes independent implementation possible; it does
not close B4-B8 or authorize activation.

A preactivation implementation PR may nevertheless be review-ready when the
four-child wire/compiler surface, unavailable-by-default host capability, v4
whole-input preflight API, and closed B1-B3 candidate resources are available
for review without a selectable schedule or transition. That is not activation
readiness: activation additionally requires B4-B8 and the resulting network
package to pass their separate reviews.

This distinction is important:

| Item | Current status | Authority when final |
|---|---|---|
| Four-child opcode ABI and global behavior | Selected | EIP |
| First accepted receipt family | Selected as terminal `lift`, `join`, and `resolve` only | Profile manifest and algorithm artifact |
| Corrected profile-manifest grammar and instance | Closed for the preactivation candidate | EIP envelope and canonical manifest bytes |
| Exact verifier constants and tables | Frozen in the 65,119-byte binary-data artifact | Binary-data artifact |
| Current profile identity | Closed for the preactivation candidate as `23c4a123...7d383`; `cd0493f8...a397d` is superseded historical evidence | Canonical manifest hash |
| Consensus costs | Not calibrated | Cost schedule and transition snapshot |
| Shipping-prover vectors | Two non-B4 diagnostic positives exist: the superseded pre-B3 `po2 = 15` fixture and the independent real `po2 = 16` raw-seal KAT. The unpublished candidate B4 negative-plan foundation enumerates 62 groups and 254 executions, but its exact schema publication and digest binding, the ordered eleven-positive archive, 254 materialization identities, and 508 Rust/JVM result records remain incomplete | Non-normative conformance evidence |
| Network activation | Not proposed | Exact validation update and transition package |

The candidate negative side currently enumerates a 62-group, 254-execution
plan. It is not canonical until its exact schemas are published and
digest-bound. Its four-field registry rows describe materialization only; the 254
materialization identities and 508 implementation-specific Rust/JVM results
remain separate so that no registry row can attest to its own reconstruction
or observed outcome. Structural `expanded` validation is therefore
non-closing until the semantic replay gate is complete.

Passing unit tests or documenting the design does not close these blockers.
Activation requires independent implementations, reproducible artifacts,
negative vectors, complete cost and memory evidence, node integration, and an
independent consensus and cryptographic review.

## 2. Why native verification

### 2.1 The claim is bounded practicality, not impossibility

ErgoScript can express substantial cryptographic logic, but a complete STARK
verifier expands into parsing, transcript operations, Merkle authentication,
field arithmetic, FRI verification, constraint evaluation, and many temporary
objects. An interpreted construction is difficult to meter safely because its
real workload is distributed across AST evaluation, collections, arithmetic,
hashing, allocation, and cost-accounting overhead.

EIP-0045 therefore does not claim that every interpreted verifier is
mathematically impossible or that a primitive-count estimate proves one exact
percentage of the block budget. The defensible claim is narrower: an exact
native verifier provides a tractable place to enforce canonical parsing,
bounded memory, fixed work limits, full precharge, and cross-implementation
behavior for a proof format that applications can actually produce.

### 2.2 Why one direct transaction matters

After deployment of the proposed 262,144-byte transaction policy, the intended
application model is a normal eUTXO spend:

```text
application chooses the payload and derives the canonical statement
        |
guest commits statement and prover emits receipt
        |
one Ergo transaction carries the raw seal
        |
the spending script calls VerifyStark and Ergo reconstructs the statement
        |
the same transaction either validates or fails
```

There is no bridge, proof-staging transaction, intermediate proof box, or
multi-block proof chain. This removes extra state machines, reorg dependencies,
latency, and application-specific cleanup logic. It does not guarantee
inclusion or finality; it means the complete verification can occur in one
signed transaction and one possible block inclusion.

## 3. Why an exact shipping profile

The first profile is anchored to
[RISC Zero v3.0.5 at commit `8eb06ab0`](https://github.com/risc0/risc0/tree/8eb06ab020a92dc5b63ba6dd0836d432aba6d890).
That release exposes `ProverOpts::succinct()`, uses Poseidon2, selects a
succinct receipt, disables proving guest errors, and uses the default supported
segment bound. The upstream source also fixes the STARK query count, expansion
rate, FRI folding factor, minimum degree, and recursion size for that release.

Starting from a shipping prover solves an important implementation problem. A
profile is useful only if independent implementers can generate real receipts,
run the official verifier, extract all intermediate values, and compare those
results with the consensus implementation. The earlier bespoke
BabyBear/Ext16/Poseidon1 research profile did not have that end-to-end shipping
prover path. It may remain research, but it is not the initial activation
target.

`ProverOpts::succinct()` is the producer entry point, not the profile's
conformance test. Pinned upstream code folds several segments by repeated
`join` after `lift` and uses `resolve` to discharge provided assumptions.
Accepting those three programs as terminals is required for shipping
interoperability; all retain the same fixed outer recursion proof shape. The
allowlist filters only the reconstructed outermost code root. Child controls
are private witnesses and are not filtered by it. The Ergo profile still
excludes
identity, union, unwrap, PoVW variants, and every other terminal program in the
broader upstream control set.

The shipping prover also adds fresh random zero-knowledge noise in both its
RV32IM and recursion witnesses. Proof generation is therefore intentionally
non-deterministic: two valid receipts for the same guest and journal normally
have different seals and proof digests. Reproducibility must not be misstated as
proof-byte identity. The activation process instead archives digest-bound B4
KAT receipts and reproduces their deterministic verification outputs
byte-for-byte. B7 separately requires fresh unmodified shipping-prover runs to
reproduce the same guest and the same claim construction, receipt-family,
ancestry, root-branch, seal-shape, and verification invariants. Fresh
randomized seals need not equal the B4 archive or one another.
Seeding or patching the prover, enabling upstream `witgen_debug`, or disabling
ZK noise would cease to be shipping-prover evidence. A fixed archived upstream
receipt container is provenance material; only its extracted raw seal is the
consensus proof input. Reproduction records therefore separate deterministic
frozen data from proof-dependent per-run evidence. Raw-seal SHA-256 values are
duplicate diagnostics only, never receipt, metadata, directory, or corpus
substitutes and never proof of freshness.

The clean receipt generator and the instrumented verifier must also be
different build artifacts. The first comes from a demonstrably clean pinned
checkout with no source override and generates the fresh evidence. The second
only consumes those already-generated seals and exposes a finite, versioned set
of evidence checkpoints for Rust/JVM comparison. The checkpoint schema fixes
names, order, encodings, preimages, and digest algorithm but cannot redefine
the verifier predicate. Its source is itself canonical RFC 8785 JCS, and
`reproductionSchemaSha256` is SHA-256 of those exact canonical UTF-8 bytes; the
lock and every precommit bind that named digest, not a reserialized variant.

Unequal proof digests alone do not prove that a run was fresh. Each independent
environment therefore anchors the digest of an exact, unique precommit in an
ordinary Ergo mainnet output before a declared future block, then derives a
per-case challenge from that precommit and the eventual raw block ID. The
challenge is the application payload committed through `ErgoStatementV1`, so a
pre-generated or cross-environment proof cannot satisfy the run-specific
claim. Exact run records bind the anchor, environment, command, challenge,
artifacts, and result. Cryptographically, this proves only that generation could
not predate the generator's knowledge of the exact challenge block ID under the
stated hash/claim assumptions. A miner can know and disclose a winning block ID
before publication, so the stronger public-observation inference additionally
depends on each operator's no-advance-access, no-miner-collusion, and
no-withholding declaration. A distinct 32-byte Ed25519
`operatorEvidencePublicKey` is committed in each precommit. Those declarations
live inside the final canonical aggregate
`RunEvidenceV1`, and the operator signs a domain-separated digest of those exact
bytes with strict pure Ed25519. The detached signature avoids a digest cycle and
authenticates the record to the precommitted evidence identity; it does not
prove the declarations true, establish civil identity, or prove operator
independence. The mechanism also does not prove physical host identity or
immediate timing. The tiny anchor carries no proof and is an evidence-integrity
mechanism only, not proof staging, a node rule, or a consensus input.

The pinned RISC Zero implementation is a provenance anchor, fixture generator,
and independent oracle. It is not loaded by nodes and is not a second consensus
definition. The immutable profile predicate will be defined by two compiled
artifacts and their strict manifest:

- the algorithm artifact owns proof grammar, transcript behavior, verifier
  control flow, rejection rules, and output comparison;
- the binary-data artifact owns only numeric constants, tables, dimensions,
  and indices consumed by that algorithm.

The corrected `profileId`
`23c4a123ffb33a1c8db89436fe0e7972bd8e4e289459ee5fd71be5440607d383`
is fixed for the current preactivation B1-B3 package. This fixes package
identity, not activation readiness. The raw manifest and artifacts are the sole
runtime authority if the profile is activated; implementations do not consult
a duplicate prose table to reinterpret or validate the same profile. The former
`cd0493f887f84584cf325f0f7daaea9ba6a48fd92c6bbb3681921b2ed90a397d`
identity is historical evidence for the superseded single-lift candidate and
is never a current profile identity or activation target.

Any unexplained disagreement on the common in-profile corpus, exact claim
construction, or verifier intermediates blocks activation. After activation, a
client that diverges from an unambiguous frozen package has an implementation
bug and must be fixed under the same profile ID. The upstream oracle cannot
redefine activated consensus. Quarantine and a new profile ID are required only
when the canonical predicate or package itself is ambiguous, defective, or
unsafe.

## 4. Stable ABI without transaction-selected difficulty

The selected global ABI is:

```text
verifyStark(
  proofChunks:         Coll[Coll[Byte]],
  applicationPayload: Coll[Byte],
  programId:           Coll[Byte],
  profileId:           Coll[Byte]
): Boolean
```

`profileId` selects one immutable verifier predicate already known to the
network. It does not select a plugin or interpret a generic verifier program.
The transaction cannot provide the field, hash, query count, FRI schedule,
Merkle depth, control root, circuit, or cost formula.

This removes the declared-versus-actual undercharging class entirely. There is
no script-supplied `Q`, depth, `vmType`, or `costParams` that can understate the
work hidden in the proof. For an active profile, the accepted proof shape and
all work dimensions are fixed or conservatively bounded by the profile itself.

The four-child ABI is also the upgrade boundary. A future RISC Zero revision,
SP1 profile, Valida profile, or other zkVM can use the same opcode only if an
independently reviewed immutable profile preserves every global compatibility
condition in EIP Section 22, including the statement and transport model,
evaluation and precharge order, lifecycle/quarantine behavior, whole-input
v4+ preflight/fallback boundary, exact v0-v3 legacy behavior, exception
semantics, and cost monotonicity. A
verifier that violates any of those global conditions requires a new opcode or
separate EIP instead of overloading this one.

## 5. Statement and application binding

The script does not provide an arbitrary journal. Ergo constructs a canonical
statement whose conceptual contents are:

```text
domain tag and version
chainDomainId
profileId
programId
BLAKE2b-256(SELF.propositionBytes)
applicationPayload length and bytes
```

The guest commits exactly these bytes with `env::commit_slice`. The verifier
then constructs the exact successful RISC Zero receipt claim with an empty
assumptions set and compares it with the claim committed by the seal.

Each binding has a distinct purpose:

| Binding | Prevents |
|---|---|
| Height-1 genesis header ID | Reusing the receipt on a chain with a different pinned genesis ID |
| `profileId` | Reinterpreting a receipt under different verifier semantics |
| `programId` | Substituting another guest program |
| Contract proposition hash | Reusing the receipt under another spending contract |
| Application payload | Substituting the application-specific statement |

The chain domain is the decoded raw 32-byte genesis header ID, not its UTF-8
hex text, a state root, a network-prefix byte, or a reversed digest. The RISC
Zero program ID is likewise the exact 32-byte image ID order used by the pinned
API, not a text encoding or word-reversed representation.

This domain does not distinguish forks or clones that intentionally share the
same genesis header ID. Same-genesis replay must be prevented by the
application payload and by checking the intended state transition, instance,
nonce, or nullifier in the surrounding contract.

### 5.1 What the opcode does not bind automatically

The contract binding is to proposition bytes, not to one box instance. The
opcode does not automatically bind `SELF.id`, an instance NFT, current state,
a nonce or nullifier, transaction inputs, or ordered outputs. An application
that needs those properties must encode the relevant values in
`applicationPayload` and check the corresponding state transition in its
ErgoScript.

The same boundary applies when the guest verifies an inner or aggregate proof.
The guest must cryptographically bind that proof's externally relevant public
statement, or a canonically encoded, authenticated root commitment to that
statement, to `applicationPayload`. Validity of an opaque inner proof or inner
root by itself says nothing about application facts such as amounts,
destinations, or nullifiers.

An application may aggregate many inner proofs off chain and have one RISC
Zero guest verify only the authenticated aggregate root. That construction can
decouple Ergo's verification work from the inner batch size, but it does not
change this EIP's profile, proof transport, or consensus charge: Ergo still
verifies one outer succinct receipt. Its safety still depends on binding the
aggregate public statement to `applicationPayload`; this EIP makes no generic
performance or soundness claim for the inner aggregation system.

Without that application-level uniqueness, a valid receipt may be replayable
within the same network, profile, program, and contract. `VerifyStark` proves
that the pinned guest computation accepted the bound bytes. It does not prove
that the guest program implements the intended business rule, make the receipt
a digital signature, or confer spending authority independently of the
surrounding contract.

The opcode also does not make every application private. The journal is public,
and confidentiality depends on the guest program, its input discipline, and
the concrete proof system. No application should claim zero knowledge merely
because it calls a STARK verifier.

## 6. First RISC Zero profile

The first profile narrows the upstream succinct receipt family to three typed
terminal families:

```text
normal lift_rv32im_v2 for one RV32IM segment with po2 in [15, 22]
join for stock multi-segment compression
resolve for stock assumption discharge
```

It accepts exactly ten typed terminal IDs: eight normal lifts for segment po2
values 15 through 22, one join, and one resolve. It also requires the pinned
inner control root, an OK final claim with empty assumptions, the exact
invocation-supplied image ID, the Ergo-constructed journal and claim, and
complete proof consumption. All ten entries are mandatory under the proposed
458-byte Manifest V1; its fixed entry layout does not permit narrowing the set.

The typed-entry encoding is
`controlKind:u8 || parameter:u8 || controlId[32]`. Kind `1` is normal lift with
parameter `15..22`; kind `2`, parameter zero, is join with ID
`7a8f24092c34ed3eb81b3d0a0b796c588c615d3488ef9e61c21dbd1e4b83ea6e`;
kind `3`, parameter zero, is resolve with ID
`53a7b23d07f99e5d5685e85874f5181e8486aa267a0ae607ffe9ba47c8bdda4a`.
The ten entries occupy bytes 42 through 381, followed by the two 38-byte
artifact references; strict EOF is byte 458. The complete profile-ID preimage
is 485 bytes.
The decoded outer proof output must carry inner root
`a54dc85ac99f851c92d7c96d7318af41dbe7c0194edfcc37eb4d422a998c1f56`.

The corrected B1 artifact is 29,773 bytes, with raw SHA-256
`90a884da420a09f2c1108d7388c2ac74db8dbdb195de704206e2bf8ec1ad0bee`
and `artifactDigest`
`6ed8a807a7b55177fa664de51c1d6f0daad81daf879e651da32367fed9d171c4`.
The 458-byte manifest has SHA-256
`deffb2cb231f98a348cbd166d5f1c43315661ccd8bd212099f16f238d0fe8946`
and derives `profileId`
`23c4a123ffb33a1c8db89436fe0e7972bd8e4e289459ee5fd71be5440607d383`.
B2 is the 65,119-byte artifact with digest
`dd8528a8621edc8dd24aadeed7bd7a2f0c1afd88dd563c5ec8f51cc7f75df0b1`
and raw SHA-256
`8c4a92b7d354890481eefdef233d4ca43f6bcd9f7cb00e4dd9e709da47789ef3`.
B2 is closed for this preactivation candidate. Any later contradiction reopens
B2 and necessarily creates a new downstream manifest and `profileId`; it is not
a conditional current value. The former B1 and 382-byte manifest values are
superseded historical evidence only.

The pinned inner root is required in the decoded outer proof output, but it
does not expose or restrict child control IDs carried privately as witnesses.
A terminal join may contain children produced by excluded terminal families,
including `po2 = 14` lift, identity, PoVW, unwrap, or resolve. A terminal
resolve may discharge a guest-committed `Assumption` with any explicit control
root; zero denotes self-composition under the conditional receipt root. A
pure-lineage restriction would therefore reject valid
`ProverOpts::succinct()` receipts and valid custom-prover compositions.

The required B4 archive MUST exercise both branches explicitly. Case 9,
`terminal-resolve-explicit-root`, terminates in `resolve` and uses the pinned
`ALLOWED_CONTROL_ROOT`. Case 10, `resolve-zero-root-then-join`, uses zero-root
self-composition for its inner resolve and terminates in `join`. Both roots are
guest policy fixed by the shared program, not prover or transaction inputs.

This does not make an arbitrary assumption root silently trusted by Ergo.
`programId` binds the guest code and its trust policy; the application and
contract must choose, authenticate, and constrain assumption roots safely.
The opcode verifies the outermost allowlist, pinned decoded inner root, and
exact final claim. It does not independently certify the guest's
application-specific trust policy.

The upstream `po2 = 14` lift is intentionally excluded from the initial
candidate profile. This is a conservative allowlist boundary, not a claim that
every possible RV32IM guest is unable to fit that control. B4 requires a real
shipping-prover positive for every admitted control, and the current reference
guest and candidate corpus provide no `po2 = 14` positive. Because every
admitted lift produces the same 222,668-byte succinct seal and essentially the
same verifier work, admitting an otherwise unsupported control would not
improve direct-transaction size or node cost. A later content-addressed profile
can add it once a producer, useful guest, and complete positive/negative corpus
exist.

It rejects:

- identity conversion or final identity normalization;
- union;
- unwrap operations;
- proof-of-verifiable-work paths;
- every other stock-root control as the terminal;
- non-OK guest exits;
- unrecognized control IDs or roots;
- noncanonical words, truncation, or trailing data.

The upstream v3.0.5 configuration fixes Poseidon2, 50 queries, inverse rate 4,
FRI folding factor 16, minimum FRI degree 256, default maximum segment po2 22,
and recursion po2 18. Their normative algorithm and binary representation are
frozen in the profile artifacts, and the proposed 458-byte manifest binds
those exact artifact references, ten typed controls, and scalar values.

### 6.1 Why the raw seal is the transaction format

The transaction carries only the raw sequence of little-endian seal words.
It does not carry a Rust receipt enum, duplicate journal, claim object, image
ID, control-inclusion metadata, or host-language serialization. This minimizes
transport ambiguity and prevents consensus from depending on an upstream
object codec.

Manifest V1 fixes the target seal at 55,667 `u32` words, or 222,668 bytes. This
number is fixture-derived, not an upstream API constant. B4 remains blocked
until that shape is reproduced for the ordered eleven-positive corpus in
EIP Section 15.2, including explicit-root terminal resolve at index 9 and
zero-root resolve followed by terminal join at index 10. A mismatch cannot be
resolved by dropping a typed terminal or required positive case. Changing the
initial target requires an explicit EIP revision and a newly reproduced profile
identity.
Sigma collection limits then require one canonical four-chunk partition.
Alternate partitions, extra bytes, and trailing words are rejected.

Seal-word indices are zero-based. Raw words 0 through 31 are reduced BabyBear
Montgomery values and must be range-checked and decoded before semantic use.
The odd raw padding indices `1, 3, ..., 15` must be zero. The decoded values at
indices 16 through 31 encode 16-bit halves and must each be at most `0xffff`
before little-endian extraction; the raw Montgomery words need not satisfy
that halfword bound. Ignoring nonzero padding, checking the wrong
representation, or silently truncating a decoded halfword would create
multiple encodings of the same logical output.

The exact offsets, chunk lengths, claim digest construction, control IDs, and
parser order belong in the EIP and content-addressed profile package rather
than this rationale.

## 7. Security interpretation

### 7.1 Current conclusion

The initial profile is an interoperability profile, not a 128-bit custody
profile. The current diagnostic calculation gives approximately:

```text
largest accepted segment:       95.30 bits
recursion proof:                 99.76 bits
union-bound composition:         95.24 bits
```

These provisional values apply RISC Zero's classical `toy_model_security`
calculation to the RV32IM and recursion circuit tapsets at the largest accepted
segment po2 22 and recursion po2 18, then compose the two errors as
`-log2(2^-b_segment + 2^-b_recursion)`. A digest-bound command, inputs, and
output artifact must be published before the decimal values are treated as
reproducible evidence.

Until then, the only responsible short headline is about 95 conjectured
classical bits under that specific toy model. This is not a proven lower bound.
It excludes concrete hash-security, implementation, and canonicalization
failures. More conservative analyses, including proven-list interpretations,
may produce materially lower numbers.

The pinned upstream code itself labels its 50-query security target as
conjectured. EIP-0045 does not upgrade that statement into a theorem. Before
activation, the exact accepted segment and recursion shapes must be evaluated
against the final frozen transcript, hash suite, constraint systems, FRI
parameters, and composition argument.

### 7.2 No generic post-quantum claim

Calling a proof a STARK does not establish one end-to-end post-quantum security
level. The concrete claim depends on the algebraic soundness argument, FRI
analysis, Fiat-Shamir transform, concrete hash assumptions, recursion
composition, allowed control programs, and implementation correctness.

Accordingly, the first profile makes neither a 128-bit nor a post-quantum
security guarantee. Applications securing values that require a stronger
target should not infer one from the opcode. A hardened future profile would
need its own immutable identity, explicit security argument, independent
review, vectors, cost schedule, and network activation.

### 7.3 Correctness is broader than cryptography

Even a sound proof system does not protect against:

- a wrong or underspecified guest program;
- an inner or aggregate proof whose public statement is not bound to the
  application payload;
- omitted application state or replay fields;
- ambiguous statement serialization;
- byte-order disagreement;
- accepting a noncanonical proof representation;
- exception handling that changes Boolean authorization;
- historical lifecycle or reorg mistakes;
- underpriced validation or unbounded admission work.

These are consensus and application-security concerns, which is why the design
binds exact bytes, freezes verifier artifacts, separates lifecycle from proof
validity, and requires isolated negative fixtures for every field and branch.

## 8. Consensus cost model

### 8.1 Fixed profile precharge

For an executed call, EIP-0045 uses two additive native charges:

- `dispatchJit` pays the bounded profile-independent work: authenticated
  context access, generation selection, profile-ID validation, lifecycle
  lookup, and dispatch;
- `fixedJit` pays the entire worst-case verifier workload of one active,
  immutable profile.

Normal evaluator costs remain additive. The evaluation order is designed so
that an active profile pays `fixedJit` before `programId`, payload, proof
chunks, native proof parsing, or cryptographic verification are evaluated.
Every valid, malformed, tampered, named late-boundary-reject, and proof-valid
final expected-claim-mismatch case for that active profile therefore receives
the same profile charge.

A malformed, absent, or quarantined profile ID pays dispatch but does not
pretend to resolve an active profile schedule. An absent profile returns false
without evaluating the three heavy children. Quarantine is a typed input
failure, not a cheaper proof-verification path.

### 8.2 Why the constants are still unset

Elapsed milliseconds are not JIT units. There is no universal conversion
between the two across different mixes of hashing, field arithmetic, parsing,
allocation, memory access, JVM warm-up, GC, and CPU architecture. Comparisons
with existing opcodes are useful calibration evidence, but not a transitive
unit conversion.

A clean, preliminary local, non-consensus Rust diagnostic nevertheless confirms
that the upstream RISC Zero v3 verifier is not microsecond-scale work. Its
harness source and lock, raw process reports, deterministic aggregate,
path-free orchestration summary, source/build binding, expected executable
length and SHA-256, and hash manifest have been assembled as a closed candidate
capsule in a separate profile workspace. That workspace is not yet a public
dependency of this EIP; until the capsule is published and independently
checked, the measurements below remain preliminary author-reported evidence.
The historical statically linked executable is not distributed; a reviewer may
rebuild it from the pinned recipe, compare its bytes to the retained identity,
and supply that external file to the replay harness. Five process reports and
the source/build binding independently pin the same executable identity. The
capsule remains diagnostic rather than B5 evidence because it measures the
upstream Rust wrapper, not the final JVM verifier or SigmaState path. On one
Intel Core Ultra 9 285H host under WSL2,
five fresh sequential single-CPU containers exercised the same preloaded,
typed 223,544-byte succinct receipt. Filesystem I/O, bincode decoding, receipt
cloning, and mutation were outside the timed region. Across 150 sustained
batch-mean observations per case, the aggregate medians were:

| Case | Median | Ratio to valid median |
|---|---:|---:|
| valid receipt | 13.384 ms | 100.000% |
| early code-root rejection | 0.084 ms | 0.631% |
| quasi-late proof rejection | 13.110 ms | 97.950% |
| final expected-`programId` mismatch | 12.905 ms | 96.420% |

The lowest valid batch mean was 11.071 ms. The early case changed the first
word of the code Merkle top; the quasi-late case changed the last word of the
last sibling in the third FRI branch of the 50th query (zero-based query index
49); and the final case left the proof unchanged but supplied a mismatched
expected image ID. The final case therefore directly models a mismatched
`programId`, not separately a changed bound statement. Both altered seal words
remained canonical BabyBear elements. All three rejection cases returned an
error in every confirmation and timed invocation.

This both corroborates the low-teens-of-milliseconds valid-verification order
in an external report from an independently developed node implementation and
narrows that report's rejection-path claim. It is false that every tampered
proof costs approximately as much as a valid proof: an early cryptographic
reject can be about two orders of magnitude cheaper. The adversarial worst case
is nevertheless approximately full-cost: the quasi-late invalid proof and the
final expected-`programId` mismatch remained within 3.6% of the valid median in
this campaign. A fixed precharge must therefore cover worst-case admitted work,
not an average over rejection paths.

The completed direct JVM verifier now also has an opt-in, digest-bound harness.
One explicitly non-closing local run on Microsoft OpenJDK 17.0.18 and a
16-logical-processor Intel host used 15 rotating warmup rounds and 100 samples
per scenario. Valid-proof p50/p99 were 25.572/37.359 ms; late-claim-mismatch
25.723/34.290 ms; late cryptographic mutation 25.646/37.942 ms; and early
transport rejection 0.004/0.026 ms. The first three paths were instrumented to
reach all 50 query checkpoints, while the transport rejection reached none.
Its evidence digest is
`60db4b9b71b66f076db2c46079f60f649301c1302f38ee52911f782cea46ba63`.
This is useful implementation evidence but not B5 closure: it covers one host,
does not measure the peak-live-memory/allocation/GC envelope, and cannot by
itself select `fixedJit`.

The corrected manifest has a constant ten-entry terminal allowlist. Terminal
lift parameter, join, and resolve all use the same outer recursion proof
topology; none is a transaction-selected cost parameter. B5 therefore measures
the maximum admitted implementation path and freezes one fixed profile charge,
not a segment- or terminal-dependent formula.

The Rust diagnostic described above invokes the upstream receipt API, including its wrapper
semantics; it is not the direct EIP-0045 JVM verifier, a JIT calibration, or a
consensus-cost derivation. Its observations are means over batches of calls,
so their percentiles are not single-call tail latencies. The quasi-late word
follows the statically closed seal layout, but the harness was not instrumented
to establish the verifier's exact last completed normative step. The
final-claim case is later, but is a mismatched expected `programId` rather than
a mutated proof byte.

For the same reason, a rule such as "two times the worst p99 on the slowest
reference machine" is not a protocol derivation. The selected machines, sample
distribution, percentile stability, and multiplier would be governance choices
that age over time. Benchmarks can reveal that a proposed charge is plainly too
low; they cannot uniquely derive one timeless integer.

The final calibration process must:

1. freeze the exact JVM verifier and accepted input bounds;
2. publish a complete static operation and allocation census;
3. assign every operation to ordinary evaluation, dispatch, or profile cost;
4. prove the bound on every loop, parser read, and allocation;
5. instrument valid, malformed, early cryptographic reject, late
   cryptographic reject at an explicitly named verifier boundary, and
   proof-valid final expected-claim-mismatch fixtures; record the exact last
   completed normative step and never infer execution depth merely from a
   mutated byte's position;
6. benchmark across disclosed JVMs and CPU classes, including warm, cold, and
   memory-pressure behavior;
7. reconcile measurements with the census and independent implementations;
8. choose conservative integer values through explicit network review.

A source-level census of the pinned verifier now supplies the first exact
reference decomposition. Each of 50 queries authenticates four main-tree leaves at
depth 15 and three FRI leaves at depths 11, 7, and 3. The direct raw-seal path
therefore performs exactly 4,267 binary Merkle/Poseidon2 hashes, 353 leaf or
other content-hash invocations, and 5,683 Poseidon2 permutations per proof
under the pinned reference decomposition. Profile construction performs two
additional protocol-info content hashes and permutations once, before the
runtime is selectable. Its generated polynomial executor contains
12,359 instructions: 284 constants, 669 local reads, 52 global reads, 4,061
additions, 1,385 subtractions, 4,679 multiplications, one `True`, 1,076
`AndEqz`, and 152 `AndCond` operations.

The 353 per-proof content hashes comprise 350 Merkle leaves and the output,
coefficient, and final hashes. The 5,683 per-proof permutations comprise 4,267
binary hashes, 1,384 content-sponge permutations, and 32 transcript/RNG
permutations. The two immutable 16-byte protocol-info hashes add two content
hashes and two permutations at authenticated profile construction. These are
reference call boundaries, not required JVM instruction boundaries.

Those counts are substantially more informative than a transaction-declared
`Q,D` pair, but they still do not produce a JIT price by themselves. They omit
DEEP-ALI/tap arithmetic outside the generated executor, inversions,
interpolation, FRI folds, final polynomial evaluation, exponentiation, RNG
extraction, the JVM implementation's concrete field-operation lowering,
checked parsing, SHA-256 claim construction, allocation and GC behavior,
SigmaState integration, and transaction overhead. They are a falsifiable
coverage oracle for the final JVM census. The generic upstream receipt wrapper
adds an eight-level control-ID membership proof; the direct Ergo ABI
intentionally excludes it because the code root reconstructed from the seal
must uniquely match the immutable ten-entry typed terminal allowlist. The decoded inner-root
output is checked separately.

Peak live memory needs its own bound and admission reservation. A cost census
does not by itself guarantee that every host avoids out-of-memory failure.

### 8.3 Repricing without changing proof validity

Cost is not part of `profileId`. This permits a network transition selected by
the authenticated generation to increase an underpriced schedule without
changing which proofs are cryptographically valid. Both the global dispatch
charge and each profile charge are nondecreasing under EIP-0045. A decrease
would require a different protocol design: a last-known node would retain the
higher charge and could reject a block accepted under the newer lower schedule,
breaking the stale-node superset and soft-fork compatibility envelope.

All cost arithmetic is checked. The selected `dispatchJit + fixedJit`, plus
ordinary evaluation costs, must fit the active block-cost limit. A cost-limit
failure is never converted into Boolean `false`.

## 9. Admission-layer resource protection

Consensus metering and mempool protection solve different problems. Consensus
cost determines whether a transaction is valid in a block. A remote peer can
still send invalid candidate transactions that consume parsing or verifier CPU
before entering the mempool.

The pinned reference node does not leave failed validation literally
unaccounted. Its mempool outcome estimates an invalid transaction's work from
elapsed validation time at 1,000 cost units per millisecond, and its network
synchronizer debits global and per-peer inter-block budgets for invalidated as
well as accepted transactions. This materially narrows the mempool-specific
underpricing claim: a garbage proof which reaches expensive verification is
post-accounted even when no successful script cost is returned. See the pinned
[`ProcessingOutcome` accounting](https://github.com/ergoplatform/ergo/blob/4a7dba059794054fc4c81f5d990dafdeb4f97a49/src/main/scala/org/ergoplatform/nodeView/mempool/ErgoMemPoolUtils.scala#L43-L73)
and [global/per-peer budget update](https://github.com/ergoplatform/ergo/blob/4a7dba059794054fc4c81f5d990dafdeb4f97a49/src/main/scala/org/ergoplatform/network/ErgoNodeViewSynchronizer.scala#L202-L248).

That post-hoc local estimate is useful defense in depth, not a substitute for
the fixed consensus charge or admission reservation. It is implementation
policy, is known only after the work has run, does not reserve peak memory or
bound concurrent validation, and accepted transactions use their computed
script cost. It also cannot protect received-block validation. B8 must test
that upgraded nodes preserve or strengthen this accounting on every ingress
path rather than assuming that rejected proof work is either wholly free or
already fully controlled.

Structural preflight is itself bounded but nontrivial work because v4+ closure
can parse nested and dead subtrees. Before that recursive closure, an upgraded
node therefore acquires a coarse global CPU-and-memory permit and debits the
applicable source budget. After preflight identifies possible invocations, the
node atomically upgrades to profile-weighted work and memory reservations for
each invocation, or conservatively reserves the aggregate maximum reachable
count, before native proof parsing or cryptography. The admission design uses:

- bounded verifier concurrency;
- bounded aggregate reserved memory;
- global and per-source work budgets;
- equal reservation for valid and invalid active-profile proofs;
- bounded, generation-aware replay suppression;
- deterministic profile work units for accounting;
- the same bounded controller and queue for activation, repricing, quarantine,
  and reorg mempool revalidation, attributed internally rather than charged to
  an old remote peer; and
- explicit defer or reject outcomes rather than script `false`.

These capacities are local policy and may reflect operator hardware. They are
not consensus constants. They begin after ordinary network transaction
decoding, so the design limits rather than eliminates network-exhaustion
exposure. Sybil load and raw-byte ingestion still require ordinary P2P
protections.

Most importantly, local admission state cannot alter ledger validity. Full
received-block and historical validation must run even when a node's local
admission bucket is empty.

## 10. Direct-transaction size envelope

Current provisional local serializer measurements produce the following sizes:

| Item | Bytes |
|---|---:|
| Raw succinct seal | 222,668 |
| Serialized Sigma proof constant | 222,682 |
| Representative transaction, empty payload | 222,883 |
| Representative transaction, 16 KiB payload | 239,269 |
| Same with realistic IDs | 239,339 |
| Serializer-only stress fixture with a roughly 4 KiB successor script; complete output-box validity not established | 243,356 |
| Arithmetic gap from that serializer-only row to the 262,144-byte policy | 18,788 |

These are measured fixture results, not a claim that every application
transaction has the same overhead. Their serializer and library lock, complete
fixture bytes, and digests have not yet been published. Final activation
evidence must publish those inputs and reproduce the measurements in
independent serializers. In particular, the 243,356-byte row is not
consensus-validity or transaction-headroom evidence until its complete
successor output is shown to serialize within the 4,096-byte box limit.

The current node default transaction policy is 98,304 bytes, so the proof does
not fit today. The proposed 262,144-byte limit is standalone
unconfirmed-transaction relay, API, and mempool policy, not a consensus
parameter. An upgraded node release must deploy that policy across every
unconfirmed ingress path before opcode activation. A shared raw transaction
decoder must not apply it while decoding received or historical blocks. Tests
must accept a standalone 262,144-byte transaction and reject a standalone
262,145-byte transaction before native proof parsing, while still decoding and
consensus-validating the byte-identical 262,145-byte transaction in an otherwise
valid block when active block size and cost permit.

Consensus block-size and block-cost limits still constrain throughput. Proof
bytes limit distinct transported seals and large proof-bearing transactions,
but one seal expression may be reused by multiple `VerifyStark` occurrences in
one input. Only the per-executed-invocation fixed charge and the block-cost limit
bound verifier call count. Byte size is not a substitute for correct CPU
metering or admission control.

## 11. Lifecycle, quarantine, and upgrades

### 11.1 Immutable profiles and network activation

Profiles have a one-way lifecycle:

```text
Absent -> Active -> Quarantined
```

Activation and quarantine occur through network transitions selected by the
authenticated integer protocol generation. There is no admin key,
transaction-controlled registry, dynamic plugin, or mutable local override.
Historical transition snapshots are compiled canonical release artifacts; the
chain authenticates the generation and validation update, not an on-chain
`transitionId` or registry root. Snapshots are never selected by wall clock,
height alone, API state, or a truncated version byte.

`profileId` commits to the immutable cryptographic predicate and resource
shape, but it is not the whole consensus context. The result also depends on
global opcode rules, the historical lifecycle state, the active cost schedule,
and the validation purpose.

### 11.2 Why quarantine is not Boolean false

Returning `false` for quarantine would be unsafe under negation:

```text
!verifyStark(...)
```

If quarantine merely changed a formerly valid proof into `false`, the negated
script could authorize the spend. An executed quarantined profile therefore
causes a deterministic, non-softforkable input failure before the proof child
is evaluated or the native seal parser and cryptography run. Ordinary network
transaction decoding has already read the transaction bytes. Quarantine is
irreversible within EIP-0045. A repaired predicate uses a new profile ID and a
new activation.

### 11.3 Future-profile compatibility

An old node cannot safely treat an unknown profile as an ordinary Boolean
inside negation, short-circuiting, lambdas, or a dead branch that becomes live
after dynamic deserialization. Future compatibility therefore operates at the
whole-input boundary.

Compatibility must not retroactively change legacy scripts. V0-v3 therefore
retain their exact historical one-pass `DeserializeContext` and
`DeserializeRegister` substitution, charging, failure, and live-evaluation
behavior. The upgraded interpreter only scans the prepared root and exact
successfully inserted subtrees, maintaining a monotone `seenVerifyStark` flag.
An ordinary deterministic historical-pass failure remains final; otherwise a
true flag fails the outer-language-version guard and cannot be erased by a later
ordinary soft-fork terminal result. The interpreter does not recursively parse
bytes behind a nested deserialization introduced by that pass.

Only an outer v4+ tree already admitted by the active ordinary language-version
rules materializes the complete feature closure before user Boolean evaluation,
including dead branches and nested deserializations. A deterministic
depth-first, left-to-right worklist treats every occurrence introduced by parsed
bytes as fresh even when all bytes and digests repeat. It never terminates by
structural equality or deduplication; a direct or mutual cycle runs until an
ordinary consensus cost/resource failure. Structural children are serialized
`Value` child fields in schema-defined order and ordered-sequence elements in
index order. Maps, sets, type-substitution tables, caches, and other
non-serialized metadata remain opaque; their host-language iteration order
cannot affect observations, outcomes, or cost. A present register source is
charged, parsed, and type-checked before its syntactic default; preflight then
visits the shadowed default before the selected subtree and retains only the
selected result. This preserves ordinary source-selection failure precedence
without allowing a dead default to hide a feature.

The historical deserializer is a one-`Value` prefix parser, not an EOF parser.
V4 preserves that rule: suffix bytes are opaque and outside the AST/feature
closure, while the full source length is charged before parsing. Requiring EOF
would be a separate consensus change with no material underpricing benefit.

In a future protocol generation:

- full-block validation may use the last-known transition table only when the
  structural preflight proves that every `VerifyStark` occurrence is a known
  static active or quarantined profile;
- any unknown, absent, malformed, dynamic, or unresolved occurrence triggers
  whole-input soft-fork fallback before user logic or deferred-cost wrappers;
- mempool admission and candidate construction reject any possible occurrence
  because they may not rely on block-only fallback.

This remains safe only while old verifier semantics are immutable, global
dispatch costs and same-`profileId` active fixed costs never decrease, and
quarantine never reverses. It assumes no cross-ID cost floor. A future change
that violates those assumptions requires a new compatibility design.

Compatibility also does not make an unusable profile activatable. Every future
`Absent -> Active` profile needs fresh B5 and testnet evidence showing that all
manifest sizes fit Sigma collections and conforming-host checked
integer/allocation bounds, one canonical complete invocation fits both active
block size and cost with `Nblock >= 1`, peak live memory stays inside its frozen
envelope, and a standalone policy is deployed before activation and relays it
as soon as the active tip makes the target profile `Active`, when direct public
relay is claimed.

### 11.4 Activation binding and reorgs

The initial network transition activates opcode `0xB9` through the cumulative
Rule 1002 opcode update and selects the first compiled profile snapshot in the
same authenticated generation. The compiled transition manifest commits to the
exact canonical validation-update bytes. At activation, a node compares the
actual update byte-for-byte before validating activation-block transactions.
This prevents an implementation from pairing the STARK transition with a
different rule update. Rule 1002 commits opcode availability; it does not place
the profile manifest, cost schedule, or transition ID on-chain.

Forward-compatible output parsing is separate from spending authorization.
Future v4 proposition bytes may be prepositioned in an output before activation
under Ergo's existing unparsed-tree behavior, but the ordinary outer-version
gate rejects a preactivation spend. After activation, the same output is
spendable only when its parsed script and transaction satisfy every active rule.

Lifecycle and pricing always come from the historical `ErgoStateContext`:

- a reorg below initial activation restores no applicable STARK manifest and the
  opcode-unavailable capability state; a v4 spend then fails the ordinary
  outer-version check before capability lookup and no EIP recursive closure
  runs;
- a reorg below quarantine restores the earlier active state;
- a reorg across repricing restores the historical schedule;
- mempool transactions are revalidated against the new tip.

Quarantine does not retroactively invalidate historical blocks. A transaction
that becomes inadmissible after quarantine may become admissible again after a
canonical reorg to a pre-quarantine state; that is normal historical consensus
behavior.

## 12. Rejected alternatives

### 12.1 Script-declared query, depth, difficulty, or cost parameters

Rejected because the caller could understate work, choose an unreviewed
security level, or create mismatches between declared and actual proof shape.
The immutable profile owns all such parameters.

### 12.2 Full on-chain profile registry

Rejected because it adds registry snapshots, roots, epochs, chunking,
reconstruction, and historical-state machinery while neither supplying the
verifier implementation nor eliminating whole-input fallback for stale nodes.
The selected design uses small compiled verifier modules and immutable
historical transition tables selected by the authenticated generation.

### 12.3 One ErgoTree version per zkVM

Rejected because a compatible new verifier profile does not need a new script
language version. `profileId` is the profile dispatch boundary; network
activation remains mandatory.

### 12.4 Executable descriptors or runtime-loaded verifier plugins

Rejected because a sufficiently expressive descriptor becomes another
consensus VM with its own parser, metering, security model, and upgrade risks.
Runtime-loaded native code would add platform and supply-chain consensus risks.
The two-artifact design freezes one explicit algorithm and one data bundle
without permitting transaction-supplied or dynamically loaded verifier logic.

### 12.5 Benchmark-only or hardware-ratio costing

Rejected because elapsed time is hardware and runtime dependent. Benchmarks
are essential falsification evidence, but deterministic consensus cost begins
with a complete bounded-operation model and an explicit reviewed tariff.

### 12.6 Multi-transaction proof chaining

Rejected for the first profile because the fixed receipt fits within the
proposed direct-transaction policy. Chaining would add latency, intermediate
state, dependency ordering, cleanup, and reorg behavior without solving a
remaining transport requirement.

### 12.7 Bespoke Ext16/Poseidon1 as the first profile

Rejected as an activation target because no shipping prover currently emits
the proposed end-to-end receipt family. It cannot yet provide the reproduction
and independent implementation path required for a consensus verifier.

## 13. What EIP-0045 does not establish

The initial profile does not provide:

- verification of arbitrary RISC Zero receipts;
- arbitrary RISC Zero receipt forms or the full recursion-program family
  beyond the reviewed succinct terminal controls;
- activation of SP1, Valida, or another zkVM;
- proving or guest execution inside an Ergo node;
- a generic AIR language, plugin system, or on-chain registry;
- automatic application replay protection;
- automatic privacy or spending authorization;
- a 128-bit or post-quantum security guarantee;
- final cost constants or a network activation today;
- immunity from all network or memory exhaustion attacks.

The architecture is intended to make those boundaries explicit and testable,
not to hide them behind a broad `verify proof` interface.

## 14. Activation evidence required

The complete activation checklist must include all of the following gates:

1. canonical algorithm and binary-data artifacts, with two independent strict
   serializers producing identical bytes;
2. a minimized, fully justified manifest and final `profileId`;
3. a hermetic reproduction lockfile that pins the host and guest Rust
   toolchains, host and guest targets, local-prover settings, and guest-builder
   OCI image by digest and platform, and yields identical deterministic
   artifacts in two clean environments;
4. B4: digest-bound archived shipping-prover KATs for the exact
   eleven-positive corpus, including case 9 explicit-root terminal resolve and
   case 10 zero-root resolve followed by terminal join; B7: distinct on-chain
   precommit anchors, challenge-bound receipts, explicit public-observation
   assumptions, and complete fresh-run evidence for all eleven case shapes in
   each clean environment, without archived/fresh proof-byte equality;
5. all statement, claim, artifact, manifest, archived-proof, and B4-negative
   vectors regenerated after the final `profileId` is frozen;
6. positive vectors and isolated negative vectors for every field, branch,
   parser boundary, control ID, root branch, and lifecycle outcome;
7. official Rust and JVM implementations agreeing on the complete B4 archive
   and closed B4 negative registry, and on every B7 fresh evidence set without
   requiring randomized seals or proof digests to match, plus at least one
   independent implementation or reproduction;
   Scala.js must agree on every shared AST, serialization, and evaluator surface
   compiled to that target;
8. byte-exact direct-transaction fixtures reproduced by independent
   serializers;
9. a complete operation, allocation, and peak-memory census;
10. valid, malformed, early-reject, named late-boundary-reject, and proof-valid
    final expected-claim-mismatch benchmarks across a disclosed machine and JVM
    matrix;
11. frozen nondecreasing dispatch and same-`profileId` active fixed costs that
    fit active block limits with checked arithmetic, with no cross-ID floor;
12. exact v0-v3 legacy-lane comparisons plus adversarial v4+ whole-input
    future-preflight tests covering cached and uncached materialization, fresh
    cyclic occurrences, hidden features, delayed-cost wrappers, and preservation
    of the already accumulated cost;
13. frozen cumulative Rule 1002 bytes and byte-exact activation-update binding;
14. node admission controls across unconfirmed P2P, API, mempool, cleanup, and
    candidate paths, with full-block/historical policy bypass;
15. historical reorg, repricing, quarantine, and mempool-revalidation tests;
16. prior deployment of the 262,144-byte policy, followed by the predeclared,
    digest-bound EIP Section 20.4 testnet plan and a passing evidence report;
17. independent consensus, implementation-security, and cryptographic review
    of the exact mainnet transition manifest and release artifacts.

Until these gates pass, the correct description is "draft architecture and
implementation work," not "activation-ready verifier."

## References

1. [Draft architecture design underlying this rationale](docs/plans/2026-07-17-eip-0045-activatable-design.md).
2. [Draft implementation sequence](docs/plans/2026-07-17-eip-0045-implementation-plan.md).
3. RISC Zero v3.0.5,
   [pinned source tree](https://github.com/risc0/risc0/tree/8eb06ab020a92dc5b63ba6dd0836d432aba6d890).
4. RISC Zero v3.0.5,
   [`ProverOpts` and succinct configuration](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/zkvm/src/host/client/prove/opts.rs).
5. RISC Zero v3.0.5,
   [STARK query and FRI constants](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/zkp/src/lib.rs).
6. RISC Zero v3.0.5,
   [succinct receipt verification](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/zkvm/src/receipt/succinct.rs).
7. RISC Zero v3.0.5,
   [receipt claim and output hashing](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/zkvm/src/claim/receipt.rs).
8. RISC Zero v3.0.5,
   [tagged-structure hashing](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/binfmt/src/hash.rs).
9. RISC Zero v3.0.5,
   [`env::commit_slice`](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/zkvm/src/guest/env/mod.rs).
10. RISC Zero v3.0.5,
    [soundness estimator](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/zkp/src/prove/soundness.rs).
11. RISC Zero v3.0.5,
    [recursion lift, join, and resolve behavior](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/zkvm/src/host/server/prove/mod.rs).
12. RISC Zero v3.0.5,
    [recursion control IDs](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/circuit/recursion/src/control_id.rs).
13. RISC Zero v3.0.5, randomized witness noise in the
    [RV32IM prover](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/circuit/rv32im/src/prove/hal/mod.rs) and
    [recursion prover](https://github.com/risc0/risc0/blob/8eb06ab020a92dc5b63ba6dd0836d432aba6d890/risc0/circuit/recursion/src/prove/witgen.rs).
14. Ben-Sasson, Bentov, Horesh, and Riabzev,
    [Scalable, transparent, and post-quantum secure computational integrity](https://eprint.iacr.org/2018/046).
15. SigmaState original #1116 head audited before the current rewrite,
    [`JitCost` scale](https://github.com/ergoplatform/sigmastate-interpreter/blob/730c6c15a8da4d882cf24f849a1f230debfd3662/data/shared/src/main/scala/sigma/ast/JitCost.scala).
16. Ergo node,
    [current transaction-size policy](https://github.com/ergoplatform/ergo/blob/4a7dba059794054fc4c81f5d990dafdeb4f97a49/src/main/resources/application.conf).
17. [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785).
18. [RFC 8032 Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032).

The final SigmaState implementation commit audited for this draft is
`9372697f789619999a21baf42b7656719eb26d47`, based on SigmaState
`61ddfac896857aa7da578a68be27792558d1023b`.
