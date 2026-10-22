# EIP-0045 RISC Zero succinct profile V1

This directory contains the exact B1, B2, and B3 bytes for the corrected
pre-activation `lift`/`join`/`resolve` profile described by EIP-0045. These
bytes fix a profile identity; they do not activate the opcode on any network.

The surrounding EIP prose is licensed under CC0. `algorithm.txt` and
`constants.bin` contain material adapted from Apache-2.0 RISC Zero sources and
are distributed under the terms in `LICENSE-APACHE`; see `NOTICE` for retained
credits. Those two legal files are distribution metadata, not B1-B3 identity
inputs, and are intentionally excluded from `SHA256SUMS` and `profileId`.

| File | Role | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `algorithm.txt` | B1 canonical algorithm artifact, kind 1 | 29,773 | `90a884da420a09f2c1108d7388c2ac74db8dbdb195de704206e2bf8ec1ad0bee` |
| `constants.bin` | B2 binary-data artifact, kind 2 | 65,119 | `8c4a92b7d354890481eefdef233d4ca43f6bcd9f7cb00e4dd9e709da47789ef3` |
| `manifest.bin` | B3 Manifest V1 byte authority | 458 | `deffb2cb231f98a348cbd166d5f1c43315661ccd8bd212099f16f238d0fe8946` |
| `profile-id-preimage.bin` | complete B3 profile-ID preimage | 485 | `8d77199ca2885419c06e573c4de117329fa2f88236bd7dc9870bcbe87062c6e6` |
| `profile-id.bin` | raw derived profile ID | 32 | `aa144c74a0cb52b3c5a9827f10a264f320820190da14a9bf82dcf3466f41aae1` |

The domain-separated artifact digests committed by `manifest.bin` are:

- kind 1: `6ed8a807a7b55177fa664de51c1d6f0daad81daf879e651da32367fed9d171c4`;
- kind 2: `dd8528a8621edc8dd24aadeed7bd7a2f0c1afd88dd563c5ec8f51cc7f75df0b1`.

The raw profile ID is
`23c4a123ffb33a1c8db89436fe0e7972bd8e4e289459ee5fd71be5440607d383`.

## Format and reproduction

`algorithm.txt` is ASCII, uses LF line endings, has no BOM, CR, or NUL, and
ends in exactly one LF. The local `.gitattributes` disables Git text
normalization for that identity-bearing file. Multibyte integers in the binary
envelopes are unsigned little-endian values. `BLAKE2b-256` means BLAKE2b
configured for a 32-byte output, not truncated BLAKE2b-512.

For artifact kind `K` and exact bytes `A`, reproduce the manifest's artifact
digest as:

```text
BLAKE2b-256(
  ASCII("Ergo.StarkProfileArtifact.v1") || 0x00 ||
  u16le(K) || u32le(length(A)) || A
)
```

Reproduce `profile-id-preimage.bin` and `profile-id.bin` as:

```text
P = ASCII("Ergo.StarkProfileId.v1") || 0x00 ||
    u32le(458) || manifest.bin
profileId = BLAKE2b-256(P)
```

The B1 and B2 bytes and the resulting B3 package are the same bytes consumed
by the reference implementation's `eip0045-profile-package` loader tests. The
profile construction is pinned to RISC Zero SDK 3.0.5, `risc0-zkp` 3.0.4, and
the recursion program set from `risc0-circuit-recursion` 4.0.4. See EIP-0045
sections 6 and 15 for the complete grammar, decoded manifest, and provenance.

Run `sha256sum -c SHA256SUMS` from this directory before consuming the package.
