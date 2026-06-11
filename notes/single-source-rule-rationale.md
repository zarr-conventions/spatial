# Single-source rule for `spatial:` properties: rationale

Companion to the spec text in [README.md, "Property placement"](../README.md#property-placement) and the schema patch in [schema.json](../schema.json). This file collects the reasoning that didn't belong inline: prior art, rejected alternatives, per-issue cross-references, and scope decisions.

If you just want to know what the rule is and how to write compliant metadata, read the README section above. If you want to know _why_ the rule looks the way it does, read on.

## Prior art

Where adjacent specs put "extent":

| Spec             | Per-asset extent                    | Collection-level extent      | Authoritative source                                                                                                          |
| ---------------- | ----------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| GeoTIFF / COG    | One transform                       | n/a                          | Transform + shape                                                                                                             |
| rasterio / GDAL  | `transform`                         | n/a                          | Transform + shape; bbox derived ([`array_bounds`](https://github.com/rasterio/rasterio/blob/main/rasterio/transform.py#L198)) |
| STAC Item        | `proj:bbox` (asset) + `bbox` (item) | Collection `extent`          | Geometry authoritative; bbox is a discovery shortcut                                                                          |
| OGC API Features | Optional per-feature bbox           | Collection `extent` required | Geometry authoritative                                                                                                        |
| CF / NetCDF      | Coordinate variables                | n/a                          | Coord arrays authoritative                                                                                                    |
| GMT              | Range + registration                | n/a                          | Single source                                                                                                                 |
| TileJSON         | n/a                                 | Top-level `bounds`           | Single source                                                                                                                 |

Every mature spec keeps the precise per-asset description in one slot. None stores the same fact in two slots and asks consumers to reconcile.

## Where we were before this rule

`spatial:` allowed both `spatial:bbox` and `spatial:transform` at the array level with no relationship asserted. The usual defense:

- Producers from GeoTIFF, rasterio, or STAC already have a bbox in hand.
- Consumers can compare with a tolerance.
- The spec stays permissive.

The cost: "compare with a tolerance" never gets specified. Each consumer picks its own tolerance and its own tiebreaker. Producers don't know which extent will be trusted. Two viewers render the same store as slightly different rectangles. The spec exports a decision it should make once.

## Why this rule, not a tolerance

The natural compromise is to allow both at the array level and define a tolerance for comparing them. The spec would need prose along these lines:

> When both `spatial:bbox` and `spatial:transform` are present on the same array, consumers MUST verify that the bbox equals the axis-aligned extent of the four transformed grid corners within tolerance `eps`. If the discrepancy exceeds `eps`, consumers SHOULD prefer the value derived from `spatial:transform`. Producers SHOULD ensure consistency at write time. Recommended `eps`: `max(1e-9 * abs(coordinate), 1e-6 * pixel_size)`.

Three problems:

1. **JSON Schema can't enforce the equality check.** The spec ends up with a normative rule no validator catches; conformance is decided per consumer.
2. **The tolerance formula is contestable.** Pixel sizes range from sub-meter (drone) to degrees (climate); one recommendation doesn't fit. Each consumer will tune theirs.
3. **"SHOULD prefer transform" is the tiebreaker.** If we're picking transform as authoritative anyway, the bbox slot is decorative. Just remove it.

## Rejected alternatives

| Option                                              | Pro                                                                                            | Con                                                             | Verdict                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| **A. Remove `spatial:bbox` entirely**               | Simplest. Matches GeoTIFF precedent.                                                           | Breaks group-level discovery. Breaks non-affine case (#5).      | Rejected: loses two real use cases. |
| **B. Keep both at array level, define a tolerance** | Backward compatible.                                                                           | Unenforceable in JSON Schema. Each consumer picks a tiebreaker. | Rejected: codifies the bug.         |
| **C. Hierarchical split (this rule)**               | Single source per fact per level. Enforceable in JSON Schema. Aligns with STAC, OGC, TileJSON. | Two fixture updates.                                            | Accepted.                           |

## Why the group level keeps `spatial:bbox`

Two reasons we can't simply remove `spatial:bbox` everywhere:

1. **Multiscales has no extent property of its own.** Removing array-level bbox without a group-level slot would lose discovery on every multiscales dataset.
2. **Non-affine arrays can't derive extent from a closed-form transform (#5).** GCP, RPC, polynomial, and lookup transforms have no four-corner walk. The producer must declare it.

The group-level slot is the only `spatial:bbox` a consumer can read without opening any array metadata. It is the tight union of descendants, not a default; consumers MUST NOT assume child arrays inherit it.

## What each closed issue gets

| Issue | Quote                                                                                                                                                                  | This rule's answer                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #6    | @maxrjones (channeling @dcherian): "the possibility of floating point mismatch between the transform and bbox is a smell to me"                                        | One slot per fact, per level. The mismatch can't happen. No tolerance prose needed.                                                                                                                 |
| #8    | @rouault: "`spatial` lacks a clear paragraph like the one of `proj` ... a dedicated paragraph would be more explicit"                                                  | The README "Property placement" section is that paragraph. Inheritance shrinks to a single fact: group-level `spatial:bbox` does not inherit; it is the union of its children, not a default.       |
| #12   | @kylebarron: "I've found that `spatial:transform` is ambiguous ... if `layout` exists, then it **should not be at the root** ... should be included on **all** levels" | `spatial:transform` and `spatial:shape` belong per multiscales `layout` level, not at the multiscales root. Group-level `spatial:bbox` is the only spatial property at the root.                    |
| #23   | @vincentsarago (from #17): "IMO, `spatial:dimensions` should only be defined at array level"                                                                           | Per-array properties are array-only by construction. The narrow remaining question (whether to keep group-level `spatial:dimensions` purely for inheritance ergonomics) is decidable independently. |
| #19   | @pvanlaake: splits `spatial:registration` into `registration` + `element`                                                                                              | Composes. The four-corner derivation gains an area+node carve-out when #19 lands.                                                                                                                   |

## How this composes with #19

Issue #19 proposes splitting `spatial:registration` into `spatial:registration` (where coords map inside an element) and `spatial:element` (point vs area). The split changes the extent formula:

- area-element + pixel-registration: extent equals the transformed corners.
- point-element + node-registration: extent equals the transformed corners (the cells _are_ the points).
- area-element + node-registration: extent extends half a cell beyond the transformed corners along each axis.

This rule does not pre-resolve #19. The derivation in the README assumes the current single `spatial:registration` field. When #19 lands, the formula gains the area+node carve-out.

## Out of scope

A few related questions that came up but aren't solved here. Each can be added later without breaking the single-source rule.

- **Per-chunk or per-shard bboxes** for read pruning on huge arrays. These would live in the chunk manifest or shard index, not in the user attributes where `spatial:` operates. Different storage tier, different concern (read planning, not extent description).
- **Non-rectangular footprints** (polygons, swath outlines). A future `spatial:footprint` slot at the group level would cover this. Adding it now means three extent representations at the group (bbox, footprint, transform-derived) and polygon-union arithmetic at write time. Cleaner as a strict additive layer once the hierarchy is settled.
- **Streaming or append-only datasets** where the group bbox grows on each write. Two reasonable contracts (`always grow, never shrink` vs `recompute on every write`) with different ingest-cost tradeoffs. Picking one without producer feedback risks pushback; the spec stays silent for now and revisits once live-ingest producers comment.
