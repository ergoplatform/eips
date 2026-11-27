# EIP-0045: Cryptographic Rationale & 128-Bit Profile Evaluation

* Author: A. Shannon
* Status: Draft (Core framework ready for review; Profile v1 awaiting post-M3 128-bit stable freeze)
* Updated: 27-Nov-2026
* Specification: [`eip-0045.md`](eip-0045.md) ([`ergoplatform/eips#103`](https://github.com/ergoplatform/eips/pull/103))
* Core Implementation: [`ergoplatform/sigmastate-interpreter#1116`](https://github.com/ergoplatform/sigmastate-interpreter/pull/1116)

---

## 1. Purpose

This companion note explains the cryptographic and engineering decisions behind
EIP-0045:

1. Why the core opcode framework (`0xB9`) is decoupled from any concrete
   verifier profile and from Ergo `BlockVersion`.
2. Why the earlier RISC Zero v3.0.5 / v3.1.0 candidate is retired to a
   non-mainnet proof-of-concept rather than proposed for mainnet activation.
3. How current 128-bit provably sound STARK zkVMs compare under
   [`ethereum/soundcalc`](https://github.com/ethereum/soundcalc) ahead of the
   Ethereum Foundation's Milestone M3 (December 2026) 128-bit security freeze.
4. Why a 300 KiB standalone transaction size ceiling (versus 256 KiB) affects
   profile choice.

This document is informative. Consensus requirements live exclusively in
[`eip-0045.md`](eip-0045.md).

---

## 2. Why Separate the Core Opcode from Profile v1

STARK proof systems are undergoing rapid consolidation in 2026: proximity-gap
conjectures used in 2023–2025 FRI deployments were falsified, polynomial
commitment schemes are migrating from FRI to STIR and WHIR, and major zkVMs
are finalizing 128-bit provably sound releases for the December 2026 M3
milestone.

Coupling Ergo's core interpreter review to a moving pre-release verifier froze
both layers unnecessarily. Separating them delivers two concrete advantages:

- **Immediate review of Ergo consensus invariants**: Ergo maintainers can
  review, test, and refine the `0xB9` wire/version gate, single-pass v4
  deserialization preservation, phased precharge, fail-closed quarantine, and
  non-`BlockVersion` lifecycle independently of any specific zkVM.
- **Zero wasted verifier churn**: Profile v1 is ported to pure Scala/JVM and
  metered only once a 128-bit provably sound upstream release freezes its
  constants, verification keys, and audit.

---

## 3. Why RISC Zero 3.0.5 / 3.1.0 Is Retired from Mainnet Candidacy

Earlier drafts of EIP-0045 targeted RISC Zero v3.0.5 succinct receipts
(`lift`/`join`/`resolve`, 222,668-byte raw seal). Three independent findings
disqualify RISC Zero 3.x for Ergo mainnet:

1. **Mathematical field-size ceiling below 128 bits**: RISC Zero operates over
   the quartic extension of BabyBear ($p = 15\cdot 2^{27} + 1 \approx 2^{30.907}$),
   whose extension field order is $p^4 \approx 2^{123.63} < 2^{128}$. Even with
   arbitrarily many FRI queries, a BabyBear⁴ STARK cannot achieve 128-bit
   provable soundness.
2. **Disproved toy-model conjecture & low provable soundness**: RISC Zero's
   ~95.24-bit estimate depended on up-to-capacity proximity-gap conjectures that
   were disproved by Crites & Stewart (ePrint 2025/2046) and Krachun, Kazanin &
   Haböck (ePrint 2026/782). Evaluated under `ethereum/soundcalc`
   (`aa654545`, Nov 16, 2026, `reports/risc0.md`), RISC Zero 3.x (50 FRI
   queries, $\rho = 1/4$, 0 grinding) achieves only **33 bits (UDR) / 48 bits
   (JBR)** — far below the 128-bit standard expected for L1 value custody.
3. **Upstream breaking churn without security-level upgrade**: RISC Zero v3.1.0
   (Nov 10, 2026, addressing `GHSA-g6qg-9j8p-7j87`) invalidated all v3.0.5
   control IDs, `inner_root`, and PolyExt operations (12,359 → 12,371) while
   retaining the exact same 33/48-bit parameters.

The RISC Zero v3.1.0 integration remains archived as a public, reproducible
non-mainnet proof-of-concept
([`a-shannon/eip0045@3a8f84c`](https://github.com/a-shannon/eip0045/commit/3a8f84cebe6c996bedbad50445453c4f67b137f6))
demonstrating single-transaction settlement (223 KiB proof, ~21.4 ms reference
verification) across `lift`, `join`, and `resolve`. It will not be proposed for
Ergo mainnet activation.

---

## 4. 128-Bit Provable Profile Landscape (Nov 2026 Snapshot)

The table below summarizes current hash-based zkVMs evaluated in
`ethereum/soundcalc` (`aa654545cf8ce168d08a585a0e05876580e8bb21`, Nov 16, 2026)
against EIP-0045's mainnet admission gates:

| Candidate & Pin | `soundcalc` Soundness | Regime | Field ($\|\mathbb{F}_{ext}\|$) | PCS | L1 Hash | Proof Size (exp / max) | Fits 256 KiB | Fits 300 KiB | License | Mainnet Assessment |
|---|---|---|---|---|---|---|---|---|---|---|
| **ZisK `v1.4.0-alpha`** (`64a1f16641`) | **128 bits** | JBR | Goldilocks³ ($2^{192}$) | DEEP-ALI + **STIR** | **BLAKE3** or Poseidon2 | **240 / 247 KiB** | **Yes** | **Yes** | Apache-2.0 / MIT | **Lead candidate** once stable post-M3 + audited |
| **Pico `v3.1.1 / v3.2.0`** (`fcfa504624`) | **128 bits** | Mixed (UDR core / JBR compress) | KoalaBear⁵ ($2^{155}$) | SWIRL + **WHIR** | Poseidon2 | **233 KiB** (`embed`) / **292 KiB** (`compress`) | `embed` only | **Yes** | Apache-2.0 / MIT | **Strong runner-up** (Sherlock audit published; larger verifier, needs raw canonical encoding without `zstd`/`bincode`) |
| **Venus `0.1.6`** | **128 bits** | JBR | Goldilocks³ ($2^{192}$) | DEEP-ALI + FRI | Poseidon2 | 268 / 274 KiB | No | **Yes** | Open-source | ZisK derivative; larger proofs than ZisK STIR |
| **zkDTVM `0.8.0`** | **128 bits** | Mixed | KoalaBear⁵ ($2^{155}$) | Jagged+FRI / SWIRL+WHIR | Poseidon2 | 200 KiB | Yes | Yes | `NOASSERTION` | **Disqualified**: unclear license / limited audit transparency |
| **SP1 `6.10.0`** | 100 bits | UDR | KoalaBear⁴ ($2^{124}$) | FRI | Poseidon2 | 524–555 KiB | No | No | Apache-2.0 / MIT | **Not yet eligible**: <128 bits and >300 KiB; revisit after M3 release |
| **OpenVM2 `2.0.0`** | 100 bits | Mixed | BabyBear⁴ ($2^{123.6}$) | FRI | Poseidon2 | 270 KiB | No | Yes | Apache-2.0 / MIT | **Disqualified**: BabyBear⁴ < $2^{128}$ |
| **RISC Zero `3.0.5 / 3.1.0`** | 33 / 48 bits | UDR / JBR | BabyBear⁴ ($2^{123.6}$) | DEEP-FRI | Poseidon2 | 222.7 KiB | Yes | Yes | Apache-2.0 | **Retired**: non-mainnet PoC only |

### 4.1 Why ZisK BLAKE3-STIR Is the Current Lead Candidate

Inspecting `0xPolygonHermez/zisk` (`v1.4.0-alpha`, `verifier/src/`) and
`0xPolygonHermez/pil2-proofman` (`verifier/src/`) highlights five properties
that fit an L1 JVM consensus verifier unusually well:

1. **Zero algebraic-hash assumption on L1**: ZisK ships a first-class
   `blake3::vadcop_final_compressed` verifier (`Blake3_8` +
   `Blake3Transcript<Goldilocks>`). Every Merkle tree and Fiat-Shamir challenge
   checked by Ergo nodes relies solely on BLAKE3, insulating L1 consensus from
   potential cryptanalytic breakthroughs against Poseidon2.
2. **Compact, `#![no_std]` verifier core**: The shared STIR/DEEP-ALI verifier
   core in `pil2-proofman/verifier` is ~130 KB across six focused files
   (`stir.rs`, `verifier.rs`, `multiproof.rs`, `layout.rs`, `proof.rs`,
   `replay.rs`) plus one generated constraint/parameter module.
3. **Fits inside both 256 KiB and 300 KiB**: `Final_Compressed` multiproofs are
   240 KiB expected / 247 KiB worst-case (`ProofSize::AtMost`), matching
   EIP-0045's `[minProofBytes, maxProofBytes]` canonical 65,535-byte chunking
   (at most 4 chunks).
4. **Clean, fail-closed statement interface**: The compressed verifier enforces
   exact public count (`68 = 4 u64 program VK + 64 u32 outputs`), canonical
   Goldilocks range checks (`< 2^64 - 2^32 + 1`), and `OutputNotU32` checks
   before executing STARK verification. `BLAKE2b-256(ErgoStatementV1)` maps
   directly into the first 8 `u32` outputs with the remaining 56 outputs pinned
   to zero.
5. **Wait for stable freeze**: Because `v1.4.0-alpha` is a pre-release ahead of
   the December 2026 EF M3 milestone, EIP-0045 intentionally defers freezing
   Profile v1 constants and porting the verifier to JVM until a stable, audited
   128-bit release lands.

### 4.2 Why Pico WHIR Is the Primary Backup

`brevis-network/pico` (`v3.2.0`) already has a published Sherlock security
review, permissive Apache-2.0/MIT licensing, and 128-bit mixed soundness on
KoalaBear⁵ (whose 31-bit base field is straightforward in Java 8 `Int`/`Long`
arithmetic). Its tradeoffs relative to ZisK are a larger verifier surface
(~315 KB), Poseidon2 on the outermost layer, a `bincode`/`zstd` outer wrapper
that would need to be stripped to a canonical raw binary format for consensus,
and a 292 KiB `compress` proof size that requires a 300 KiB transaction policy
ceiling (while its 233 KiB `embed` proof fits under 256 KiB).

---

## 5. Transaction Size Policy Tradeoff (256 KiB vs 300 KiB)

| Policy Ceiling | Admissible 128-Bit Candidates | Transaction Overhead Headroom |
|---|---|---|
| **256 KiB (262,144 B)** | ZisK STIR (≤ 247 KiB), Pico `embed` (233 KiB) | ~9–23 KiB for inputs, outputs, registers, signatures |
| **300 KiB (307,200 B)** | ZisK STIR (≤ 247 KiB), Pico `compress` (292 KiB), Venus (≤ 274 KiB), all EF M3 compliant zkVMs | ~8–53 KiB; future-proofs Ergo against EF M3 proof sizes |

Because EIP-0045 decouples the core opcode from Profile v1, Ergo maintainers can
evaluate the 256 KiB vs 300 KiB relay and mempool policy decision directly in
parallel with reviewing PR #1116.

---

## 6. Security & Denial-of-Service Summary

- **No unvoted pre-activation fork**: `0xB9` is rejected by `ValueSerializer`
  for ErgoTree v0–v3, producing byte-for-byte identical rejection behavior to
  pre-EIP v6.0.x nodes.
- **No legacy anyone-can-spend bypass**: Even after rule `1002` adds `0xB9` for
  v4+, spending a v0–v3 `UnparsedErgoTree` or v0–v3 `DeserializeContext` /
  `DeserializeRegister` carrying `0xB9` fails deterministically with
  `StarkOpcodeErgoTreeVersionException`.
- **No unpaid verification DoS**: `dispatchJit` is charged immediately after
  `profileId` evaluation, and `fixedJit` is charged unconditionally before
  evaluating `programId`, `applicationPayload`, `proofChunks`, hashing
  `ErgoStatementV1`, or invoking the verifier runtime.
- **No negation bypass on quarantine**: Quarantined profiles throw
  `StarkProfileQuarantinedException` rather than returning `false`.
- **No stale-node mining or wallet signing on unknown generations**: Stale
  nodes (`G > Gmax`) soft-fork-accept unknown/dynamic profiles ONLY during
  `HistoricalBlockValidation`, and fail closed during `AdmissionValidation`,
  `CandidateConstruction`, and `ProverReduction`.
