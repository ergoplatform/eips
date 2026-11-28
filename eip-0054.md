# Opt-In Read-Only Node Transport for Ergo NiPoPoW V2 Certificates

- Author: A. Shannon
- Status: Proposed
- Created: 27-November-2026
- Last edited: 28-November-2026
- License: CC0
- Forking: not needed
- Client / Verifier Reference Implementation: `https://github.com/a-shannon/ergo-nipopow-v2` (`v0.4.3`; client & verifier reference only — Ergo reference-node server routes are not yet implemented in `ergoplatform/ergo`)
- Live Browser WASM Demo: `https://a-shannon.github.io/ergo-nipopow-v2/`

---

## 1. Abstract

This specification defines a minimal, opt-in, read-only HTTP REST transport interface allowing Ergo full nodes (and public static mirrors) to serve verified **Ergo NiPoPoW V2** (`V2Production128`) certificates, exact modern continuation tails, and immutable Level-1 prefix proof archives to browser, mobile, and desktop light clients.

The extension requires **zero hard fork, zero soft fork, zero miner change, zero consensus rule modification, and zero proving overhead on serving nodes**. A serving node only stores and serves static, content-addressed files (**`~17.5 MiB`** total when serving both `Dual` and `ZisK STIR` `.gz` certificates + `.gz` tail + L1 archive, or **`~12.6 MiB`** for `ZisK STIR` `.gz` + `.gz` tail + L1 archive) that every client verifies fail-closed from genesis against pinned verifying keys.

---

## 2. Motivation

Ergo NiPoPoW V2 certifies the entire canonical header chain from genesis (`1..=n`, `407+ MiB` raw headers) under profile `V2Production128` (**128-bit analytical protocol sampling/race error `<= 2^-128.35 < 2^-128`**, separate from ZisK STARK soundness `~2^-128` JBR, 256-bit hash collision assumptions, and Ergo's common-prefix premise `ε_CP`) in **`5.99 MiB`** (`ZiskStirV14` `.gz` + exact tail `.gz`) or **`6.23 MiB`** (`DualZiskV14OpenVmV21` `.gz` + exact tail `.gz`), verifiable inside an `~817 KiB` gzip-9 WebAssembly module (`ergo_nipopow_v2_light.wasm`) with zero prover SDK and zero trusted setup.

After one cold sync, a returning light client persists a `5.6 KiB` `LightCheckpoint` and extends indefinitely using standard Ergo headers (`~160 KiB/day`, enforcing Ergo's +20 min future-timestamp drift rule) via existing node `/blocks/chainSlice` endpoints, verifying authenticated AVL+ `ADProofs` state transitions and Scorex transaction Merkle proofs locally without trusting any API server.

Standardizing how Ergo nodes advertise and serve NiPoPoW V2 bundles unlocks:
1. **Untrusted multi-peer cold sync** (`compare-certs` / `select_best`) directly across independent Ergo nodes instead of relying on a single release host.
2. **Permissionless incremental renewal** by distributing the immutable `6.58 MiB` Level-1 prefix proof archive (`99.5%` of history) alongside the latest certificate.
3. **Drop-in wallet integration** (browser extensions, mobile wallets, serverless dApps) with predictable caching, strict fail-closed DoS bounds, and confirmation-depth guarantees.

---

## 3. Security, Wire Encoding & Non-Trust Model

Serving nodes are **completely untrusted**. Every light client MUST enforce fail-closed verification locally before trusting any header, `stateRoot`, or `transactionsRoot`:

1. **Mandatory Profile Check & Wire Discriminants:**
   - Reject any certificate or persisted `LightCheckpoint` whose `statement.profile != ProfileId::V2Production128`.
   - **Normative serialization note (`bincode 1.3.3` fixed-int little-endian, `reject_trailing_bytes`):** Logical `ProfileId::V2Production128` has logical ID `3`, while `V2Certificate` bincode encoding uses 0-based enum ordinals (`u32` little-endian):
     - `StructuralBackend`: `OpenVmSwirlV21 = 0`, `ZiskStirV14 = 1`, `DualZiskV14OpenVmV21 = 2`.
     - `ProfileId`: `V2Production = 0`, `V2LegacyR15 = 1`, `V2Production128 = 2`.
   - Any HTTP metadata field (`profile: "V2Production128"`) is strictly informational; clients MUST verify the deserialized `statement.profile` field inside the STARK-committed `BootstrapStatement`.
2. **Pinned Verifying Keys & Dual vs Light Verification Scope:**
   - Verify the structural proof against compile-time or governance-pinned path-independent verifying keys reproduced from source (`scripts/verify_reproducible_vks.sh`):
     - `ZiskStirV14`: 128-bit `ethereum/soundcalc` JBR (`BLAKE3-256`, STIR `--minimal`).
     - `DualZiskV14OpenVmV21` (**full verifier**, e.g. `ergo-nipopow-v2-aggregator --no-default-features`): verifies **BOTH** 128-bit ZisK STIR and OpenVM `v2.1.0` SWIRL/WHIR (100-bit proven RBR security, zkSecurity-audited & partially Lean-verified defense-in-depth) over the byte-identical `BootstrapStatement`.
     - `DualZiskV14OpenVmV21` (**lightweight / WASM verifier**, e.g. `ergo-nipopow-v2-light`): verifies ONLY the 128-bit ZisK STIR half and MUST explicitly report `openvm_half_verified = false` (`verified_proof = "ZiskStirV14_only"`), never claiming full dual verification.
     - Standalone `OpenVmSwirlV21` MUST NOT be accepted in strict 128-bit mode.
3. **Fiat-Shamir Audit Binding:** Recompute `audit_seed = SHA-512("Ergo-NiPoPoW-V2/audit/v2/1\0" || BE64(|x|) || x || BE64(|pi_s|) || pi_s)` and verify all `13,748` geometric Autolykos v1/v2 PoW openings against `statement.mmr_root`.
4. **Strict Exact-Tail Tip Binding & Confirmation Depth:**
   - Verify every header in `(bootstrap_height, tip_height]` natively (canonical codec, `1..=514` B, parent link, strict timestamps, EIP-37 DAA anchored strictly to `statement.bootstrap_eip37_anchors`, Autolykos v2 PoW) AND confirm the tail ends at the exact `(tip_height, tip_id, total_work)` certified in `statement`.
   - On plain-header continuation beyond `snapshotTipHeight`, clients MUST enforce Ergo's `+20 min` future-timestamp drift rule when a clock is available and distinguish **confirmed blocks (`>= k_0 = 64` confirmations below synced tip)** from unconfirmed recent tip blocks.
5. **Multi-Peer Fork Selection:** Query at least 2 independent peers when available, reject every failing peer fail-closed, and select the heaviest valid chain deterministically via `select_best`, breaking equal-work ties on the immutable 32-byte `query_header_id` chain commitment (never on malleable proof container bytes).

---

## 4. Opt-In REST API Specification (Normative)

A node enabling `ergo.node.nipopowV2.serve = true` exposes four read-only, cache-friendly HTTP endpoints under `/nipopow/v2/`. All endpoints MUST support standard CORS headers (`Access-Control-Allow-Origin: *` when public REST is enabled) so browser WASM wallets can connect directly.

### 4.1 `GET /nipopow/v2/info`

Returns lightweight JSON metadata describing the locally cached snapshot(s) and current node tip height.

```json
{
  "specVersion": "v2.1",
  "profile": "V2Production128",
  "snapshotTipHeight": 1827840,
  "snapshotTipId": "20ed709e5e9ba0d40fa941b2de53a3cdbd5bf29950b4a40adad8d244209ff9b3",
  "bootstrapHeight": 1819644,
  "queryMatureHeight": 1823986,
  "statementSha256": "e7981fbc64af4abdd38292792584f1d9850ee6fb293f12c27f2dead07a55edbc",
  "ziskRootVk": [11772000642296811191, 2917608110684279903, 7269122849900466967, 12697094355253129467],
  "availableBackends": ["DualZiskV14OpenVmV21", "ZiskStirV14"],
  "artifacts": {
    "dualCertGz": { "bytes": 5176961, "sha256": "0455f0be8e3d0526a9b0b5f4c86e6f8a824dc4e0934036d0b683b88de7801ba2" },
    "ziskStirCertGz": { "bytes": 4918630, "sha256": "22aa9e474bda16c32acdd8a0d5cde0c273d85892af078f01f63a88f047ecca2b" },
    "tailGz": { "bytes": 1360716, "sha256": "753ed8a27a9e4dfbcd262e2eb8c0f75b453e704fb745f31e2dbdeaed9edd40e2" },
    "ziskL1Archive": { "bytes": 6900514, "sha256": "9d938e4ccee202bba45a21c9295be96df842d1d87a3c1c31ce20d74e09b0c218" }
  },
  "nodeFullHeight": 1827976
}
```

### 4.2 `GET /nipopow/v2/certificate?backend=zisk-stir|dual&encoding=gzip|raw`

* Returns the binary `V2Certificate` (`bincode 1.3.3` fixed-int little-endian, optionally gzip-9 compressed).
* **Defaults:** `backend=zisk-stir`, `encoding=gzip`.
* **Headers:**
  * `Content-Type: application/octet-stream`
  * `ETag: "<sha256>"`
  * `Cache-Control: public, max-age=31536000, immutable` (when queried with `&tip=<height>`)
* **Hard Caps (DoS protection — MUST be enforced while streaming & decompressing):** Clients MUST reject compressed payloads exceeding **`12 MiB`**, decompressed `V2Certificate` payloads exceeding **`16 MiB`**, and any trailing bytes after `V2Certificate`.

### 4.3 `GET /nipopow/v2/tail?encoding=gzip|raw`

* Returns the length-prefixed `.u32le` stream of canonical raw Ergo headers (`1..=514 B` each) for `(bootstrapHeight, snapshotTipHeight]` (`~1.30 MiB` gzip-9 / `1.75 MiB` raw).
* **Hard Caps:** Clients MUST reject compressed tail streams exceeding **`8 MiB`**, decompressed streams exceeding **`16 MiB`**, or any header frame outside `1..=514 B`.

### 4.4 `GET /nipopow/v2/l1-archive`

* Optional endpoint serving `zisk-l1-<tip>-prod128-archive.tar.gz` (`~6.58 MiB`) containing the immutable frozen Level-1 prefix proofs (`99.5%` of history) so any community operator or CPU-only prover (`scripts/renew_zisk_cpu.sh`) can produce a fresh certificate without re-proving historical epochs.

### 4.5 Local Node Pre-Check Before Serving

A full node accepting an externally supplied certificate into its `/nipopow/v2/*` static cache MUST first run `ergo-nipopow-v2-aggregator verify-cert` (or `ergo-nipopow-v2-light verify-cert` for `zisk-stir`-only mirrors) locally against pinned VKs and confirm `statement.tip_id` matches the node's own canonical header at `statement.tip_height`.

### 4.6 Live Continuation & Block State Verification Beyond `snapshotTipHeight` (Existing Node Endpoints)

No new node endpoint is required to sync past `snapshotTipHeight`:
1. Client fetches strictly contiguous JSON headers in `(fromHeight, toHeight]` in chunks of up to `256` headers via the existing Ergo node endpoint `GET /blocks/chainSlice?fromHeight=<h1>&toHeight=<h2>` using lossless 64-bit integer JSON parsing.
2. Client encodes each header into canonical Scorex binary form (`.u32le` stream) and passes it to `extend-tail` / `wasm_extend_tail_at_time`, verifying `BLAKE2b-256` header IDs, parent links, strict timestamps (+20 min future-drift guard), EIP-37 DAA retargets, and native Autolykos v2 PoW.
3. For an authenticated AVL+ state-root transition and transaction inclusion check at any confirmed modern block `h <= tipHeight - 64` (or an explicitly opted-in unconfirmed recent block):
   - Fetch the descending raw header chain `[tipHeight, ..., h, h - 1]` (authenticated backwards via `BLAKE2b-256` parent hashes from `checkpoint.tip_id`),
   - Fetch `GET /blocks/<certifiedBlockId>` (using the exact `id` from the certified header chain, never `/blocks/at/<h>`) to obtain `adProofs.proofBytes` and `blockTransactions.transactions`, extracting exact `StateChanges` (`toLookup ++ toRemove ++ toAppend` matching `ErgoState.stateChanges` / `boxChanges`, rejecting duplicate external spends and requiring `Some(_)` on AVL lookups), and
   - Fetch `GET /blocks/<certifiedBlockId>/proofFor/<txId>` and verify `merkle_tx_proof.leafData == expected_tx_id` against `curr_header.transactions_root`.
   - Note: This proves the block's authenticated AVL+ UTXO state-root transition and transaction Merkle inclusion (not full ErgoScript validation of the block; current spendability/balance queries additionally require checking that an output remains unspent at the latest confirmed tip).

---

## 5. Future P2P Transport Extension (Non-Normative)

Peer-to-peer certificate gossip (e.g., advertising a `PeerFeature` bit in `scorex.core.network.peer.PeerFeature` and transferring chunks over Ergo P2P without HTTP) is intentionally left **non-normative** in this EIP. A dedicated follow-up networking EIP will specify the assigned numeric `PeerFeature` ID, wire message codes, authenticated chunk manifest (binding total byte length, chunk count, and ordered chunk SHA-256 root), timeout/concurrency state machine, and aggregate Sybil bandwidth quotas before any P2P implementation is deployed.

---

## 6. Resource & Bandwidth Budget

| Role | Disk | Network | CPU / RAM |
| --- | --- | --- | --- |
| **Serving Full Node** | **`~17.5 MiB`** (`Dual .gz` + `ZisK .gz` + `tail .gz` + L1 archive; **`~12.6 MiB`** ZisK-only) | `~6 MiB` per new cold client | `0` proving; ~`3.5 s` one-time verify on snapshot update |
| **Cold Light Client (WASM)** | `~817 KiB` `.wasm.gz` + `5.6 KiB` checkpoint | **`5.99 MiB`** once (`1.47%` of raw headers) | **`4.4–6.1 s`** once in V8 WASM (`ZiskStirV14` half) |
| **Full Dual Verifier (CPU)** | `5.6 KiB` checkpoint + pinned VKs | **`6.23 MiB`** once (`1.53%` of raw headers) | **`3.5–5.6 s`** CPU-only (`0.03–0.22 s` both STARKs) |
| **Returning Light Client** | `5.6 KiB` checkpoint | **`~160 KiB/day`** plain headers (zero STARK) | **`~30–50 ms`** per 136–256 headers (`~0.2 ms`/header) |
| **Block `ADProofs` + Tx Check** | `0` extra state | **`~2.8–86 KiB`** `ADProofs` (1-tx to 22-tx live blocks) | **`0.05–2.0 ms`** AVL+ + Merkle verify in WASM |

---

## 7. Backwards Compatibility & Deployment Path

* **Zero Consensus Risk:** Entirely off-chain, opt-in, read-only. Legacy nodes ignore `/nipopow/v2/*` safely.
* **Incremental Rollout:**
  1. Static HTTP mirrors & browser WASM clients (`https://a-shannon.github.io/ergo-nipopow-v2/`, `@ergo-nipopow-v2/light-wasm`) work today using standard `/blocks/chainSlice`, `/blocks/{id}`, and `/blocks/{id}/proofFor/{txId}`.
  2. Ergo reference node (`ergoplatform/ergo`) can add read-only `/nipopow/v2/*` serving behind `ergo.node.nipopowV2.serve = false` (opt-in) once external security audits and REST conformance tests conclude.
  3. Independent volunteer provers (single GPU `~30 s` or CPU-only `scripts/renew_zisk_cpu.sh`) can refresh snapshots weekly or monthly while returning users remain 100% independent of prover liveness.
