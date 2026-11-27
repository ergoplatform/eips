# Opt-In Read-Only Node Transport for Ergo NiPoPoW V2 Certificates

- Author: A. Shannon
- Status: Proposed
- Created: 27-November-2026
- Last edited: 27-November-2026
- License: CC0
- Forking: not needed
- Reference Implementation: `https://github.com/a-shannon/ergo-nipopow-v2` (`v0.4.2`)
- Live Browser WASM Demo: `https://a-shannon.github.io/ergo-nipopow-v2/`

---

## 1. Abstract

This specification defines a minimal, opt-in, read-only REST and P2P transport interface allowing Ergo full nodes (and public mirrors) to serve verified **Ergo NiPoPoW V2** (`V2Production128`) certificates, exact modern continuation tails, and immutable Level-1 prefix proof archives to browser, mobile, and desktop light clients.

The extension requires **zero hard fork, zero soft fork, zero miner change, zero consensus rule modification, and zero proving overhead on serving nodes**. A serving node only stores and serves static, content-addressed files (~`14 MiB` total disk footprint) that every client verifies fail-closed from genesis using pinned verifying keys.

---

## 2. Motivation

Ergo NiPoPoW V2 certifies the entire canonical header chain from genesis (`1..=n`, `407+ MiB` raw headers) at strict 128-bit post-quantum security (`V2Production128`) in **`5.99 MiB`** (`ZiskStirV14` `.gz` + exact tail `.gz`) or **`6.23 MiB`** (`DualZiskV14OpenVmV21` `.gz` + exact tail `.gz`), verifiable inside an `817 KiB` gzip-9 WebAssembly module (`ergo_nipopow_v2_light.wasm`) with zero prover SDK and zero trusted setup.

After one cold sync, a returning light client persists a `5.6 KiB` `LightCheckpoint` and extends indefinitely using standard Ergo headers (`~160 KiB/day`) via existing node `/blocks/chainSlice` endpoints, verifying UTXO balances and transaction inclusion directly via Ergo's native AVL+ `ADProofs` and Scorex Merkle proofs without trusting any API server.

Standardizing how Ergo nodes advertise and serve NiPoPoW V2 bundles unlocks:
1. **Untrusted multi-peer cold sync** (`compare-certs` / `select_best`) directly across independent Ergo nodes instead of relying on a single release host.
2. **Permissionless incremental renewal** by distributing the immutable `6.58 MiB` Level-1 prefix proof archive (`99.5%` of history) alongside the latest certificate.
3. **Drop-in wallet integration** (browser extensions, mobile wallets, serverless dApps) with predictable caching, strict size caps, and fail-closed verification.

---

## 3. Security & Non-Trust Model

Serving nodes are **completely untrusted**. Every light client MUST enforce fail-closed verification locally before trusting any header, `stateRoot`, or `transactionsRoot`:

1. **Mandatory Profile Check:** Reject any certificate where `statement.profile != ProfileId::V2Production128` (`id = 3`).
2. **Pinned Verifying Keys:** Verify the structural proof against compile-time or governance-pinned path-independent verifying keys reproduced from source (`scripts/verify_reproducible_vks.sh`):
   - `ZiskStirV14`: strict 128-bit `ethereum/soundcalc` JBR (`BLAKE3-256`, STIR `--minimal`).
   - `DualZiskV14OpenVmV21`: verifies BOTH 128-bit ZisK STIR and OpenVM `v2.1.0` SWIRL/WHIR (100-bit proven RBR security, Lean-verified & zkSecurity-audited defense-in-depth) over the byte-identical `BootstrapStatement`.
   - Standalone `OpenVmSwirlV21` MUST NOT be accepted as a 128-bit certificate.
3. **Fiat-Shamir Audit Binding:** Recompute `audit_seed = SHA-512("Ergo-NiPoPoW-V2/audit/v2/1\0" || BE64(|x|) || x || BE64(|pi_s|) || pi_s)` and verify all `13,748` geometric Autolykos v1/v2 PoW openings against `statement.mmr_root`.
4. **Strict Exact-Tail Binding:** Verify every header in `(bootstrap_height, tip_height]` natively (canonical codec, parent link, strict timestamps, EIP-37 DAA anchored strictly to `statement.bootstrap_eip37_anchors`, Autolykos v2 PoW) AND confirm the tail ends at the exact `(tip_height, tip_id, total_work)` certified in `statement`.
5. **Multi-Peer Fork Selection:** Query at least 2 independent peers when available, reject every failing peer fail-closed, and select the heaviest valid chain deterministically via `select_best`.

---

## 4. Opt-In REST API Specification

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

* Returns the binary `V2Certificate` (`bincode`-serialized, optionally gzip-9 compressed).
* **Defaults:** `backend=zisk-stir`, `encoding=gzip`.
* **Headers:**
  * `Content-Type: application/octet-stream`
  * `ETag: "<sha256>"`
  * `Cache-Control: public, max-age=31536000, immutable` (when queried with `&tip=<height>`)
* **Hard Cap (DoS protection):** Clients MUST reject compressed payloads exceeding `12 MiB` and decompressed `V2Certificate` payloads exceeding `16 MiB`.

### 4.3 `GET /nipopow/v2/tail?encoding=gzip|raw`

* Returns the length-prefixed `.u32le` stream of canonical raw Ergo headers for `(bootstrapHeight, snapshotTipHeight]` (`~1.30 MiB` gzip-9 / `1.75 MiB` raw).
* **Hard Cap:** Clients MUST reject compressed tail streams exceeding `8 MiB` or decompressed streams exceeding `16 MiB`.

### 4.4 `GET /nipopow/v2/l1-archive`

* Optional endpoint serving `zisk-l1-<tip>-prod128-archive.tar.gz` (`~6.58 MiB`) containing the immutable frozen Level-1 prefix proofs (`99.5%` of history) so any community operator or CPU-only prover (`scripts/renew_zisk_cpu.sh`) can produce a fresh certificate without re-proving historical epochs.

### 4.5 Live Continuation Beyond `snapshotTipHeight` (Existing Node Endpoints)

No new endpoint is required to sync past `snapshotTipHeight`:
1. Client fetches JSON headers from `snapshotTipHeight + 1` up to `nodeFullHeight` in chunks of up to `256` headers via the existing Ergo node endpoint `GET /blocks/chainSlice?fromHeight=<h1>&toHeight=<h2`.
2. Client encodes each header into canonical Scorex binary form (`u32le` stream) and feeds it to `extend-tail` / `wasm_extend_tail`, which recomputes every `BLAKE2b-256` header ID, validates parent links, strict timestamps, EIP-37 DAA retargets, and native Autolykos v2 PoW.
3. For any UTXO balance or transaction check at any certified height `h <= tipHeight`, client fetches:
   - the minimal descending raw header chain `[tipHeight, ..., h, h - 1]` (just 2 headers = `448 B` when `h == tipHeight`), authenticated backwards via `BLAKE2b-256` parent hashes from `checkpoint.tip_id`,
   - `GET /blocks/<headerId>` (`adProofs.proofBytes` + `blockTransactions.transactions`), extracting exact `StateChanges` (`toLookup ++ toRemove ++ toAppend` matching `ErgoState.stateChanges` / `boxChanges`, including `dataInputs` lookups and intra-block spend cancellation), and
   - `GET /blocks/<headerId>/proofFor/<txId>` (Scorex transaction Merkle inclusion proof).
   All three checks execute locally inside WebAssembly (`wasm_verify_checkpoint_block_state`, ~`1.4–1.9 ms` on live multi-tx mainnet blocks with `10–39 KiB` `ADProofs`).

---

## 5. Optional P2P Transport Extension

Nodes wishing to gossip NiPoPoW V2 availability without HTTP exposure MAY advertise an optional `PeerFeature` bit (`NiPoPoWV2Cap`, feature ID reserved in `scorex.core.network.peer.PeerFeature`) carrying `(profileId: u8, snapshotTipHeight: u32, statementSha256: [u8; 32])`.

1. **Discovery:** A light client connects to `k >= 2` peers advertising `NiPoPoWV2Cap`, compares reported `snapshotTipHeight`, and requests the `(V2Certificate, exact_tail)` chunks from distinct peers.
2. **Chunked Transfer & Rate Limiting:** Certificates are transferred in `64 KiB` SHA-256-indexed chunks with strict per-peer bandwidth quotas (`<= 16 MiB` total per peer per cold sync) to prevent amplification or memory exhaustion.
3. **Local Pre-Check Before Serving:** A full node accepting an externally submitted certificate for serving MUST first run `ergo-nipopow-v2-light verify-cert` (or `ergo-nipopow-v2-aggregator verify-cert`) locally and confirm `statement.tip_id` matches the node's own canonical header at `statement.tip_height`. This prevents any malicious peer from poisoning a node's cache.

---

## 6. Resource & Bandwidth Budget

| Role | Disk | Network | CPU / RAM |
| --- | --- | --- | --- |
| **Serving Full Node** | `~14 MiB` static files | `~6 MiB` per new cold client | `0` proving; ~`3.4 s` one-time verify on snapshot update |
| **Cold Light Client (WASM)** | `817 KiB` `.wasm.gz` + `5.6 KiB` checkpoint | **`5.99 MiB`** once (`1.47%` of raw headers) | **`4.5–6.1 s`** once in V8 WASM |
| **Returning Light Client** | `5.6 KiB` checkpoint | **`~160 KiB/day`** plain headers (zero STARK) | **`~30 ms`** per 136 headers (`~0.2 ms`/header) |
| **Trustless UTXO Check** | `0` extra state | `~2.8 KiB` `ADProofs` per block | **`0.05 ms`** AVL+ verify |

---

## 7. Backwards Compatibility & Deployment Path

* **Zero Consensus Risk:** Entirely off-chain, opt-in, read-only. Legacy nodes ignore `/nipopow/v2/*` and unknown P2P peer features safely.
* **Incremental Rollout:**
  1. Static HTTP mirrors & browser WASM clients (`web/index.html`, `web/nipopow-v2.js`) work immediately today using standard `/blocks/chainSlice` for live tip continuation.
  2. Ergo reference node (`ergoplatform/ergo`) can add read-only `/nipopow/v2/*` serving behind a config flag once external security audits conclude.
  3. Independent volunteer provers (single GPU `~30 s` or CPU-only `scripts/renew_zisk_cpu.sh`) can refresh snapshots weekly or monthly while returning users remain 100% independent of prover liveness.
