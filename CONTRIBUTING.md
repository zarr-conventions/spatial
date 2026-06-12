# Contributing to the `spatial` convention

Thanks for helping improve the `spatial` Zarr convention. This repository holds the
normative specification, its JSON Schema, and worked examples. It is part of the
[Zarr Conventions Framework](https://github.com/zarr-conventions/.github/blob/main/profile/README.md).

Maintainers: @maxrjones, @emmanuelmathot, @kylebarron

## What lives here

| File / dir | Role |
|------------|------|
| `README.md` | The normative specification (RFC 2119 wording). |
| `schema.json` | JSON Schema (Draft-07) for the convention's attributes. |
| `examples/` | Example `zarr_conventions` metadata, all of which must validate. |
| `validate.js` | AJV-based validator: `node validate.js <schema.json> <data.json>`. |
| `test.js` | Validates every file in `examples/` against `schema.json`. |
| `dev-docs/` | Working notes on open design questions. |

## Running validation locally

This repo uses [pnpm](https://pnpm.io). Install dependencies and validate the examples:

```bash
pnpm install
pnpm test        # validates schema.json against every example
pnpm run lint    # eslint
pnpm run format  # prettier --write
```

`pnpm install` also wires up a [husky](https://typicode.github.io/husky/) pre-commit
hook (`.husky/pre-commit`) that runs `pnpm test` before each commit. The same check
runs in CI (`.github/workflows/validate.yml`) on every PR.

Dependencies carry a 7-day release-age cooldown (`minimumReleaseAge` in
`pnpm-workspace.yaml`): a newly published version is not installed until it is at least
a week old, as a supply-chain safeguard.

## Making a change

The spec, schema, and examples are a single contract — change them together so they
stay consistent:

1. Edit `README.md` for the normative wording.
2. Update `schema.json` to match.
3. Add or update an example in `examples/` and confirm `pnpm test` passes.

Two framework invariants every change must respect:

- **Conventions are safely ignorable.** A convention may change only how data is
  *interpreted*, never how it is *encoded or stored*. An implementation that ignores
  `spatial` must still read the underlying Zarr arrays correctly.
- **The UUID is permanent.** `689b58e2-cf7b-45e0-9fff-9cfc0883d6b4` identifies the
  convention, not a version. It MUST NOT change across versions; a different UUID
  means a different convention.

`spatial` is scoped to the 2D (X/Y) array-index ↔ spatial-coordinate relationship.
Keep the `spatial:transform` affine to its 6-coefficient 2D form; non-spatial and
Z-axis concerns are out of scope.

See the [Versioning and Compatibility](README.md#versioning-and-compatibility)
section of the README for the pre-stability policy.

## Releasing a version

A version is expressed by the git tag referenced in the convention's `schema_url`
and `spec_url` (for example, `v0.1`); there is no separate `version` attribute.
To cut a release:

1. Ensure `schema.json` `$id` and the example URLs reference the tag you are about
   to create (e.g. `refs/tags/v0.1/schema.json` and `blob/v0.1/README.md`).
2. Confirm `pnpm test` passes.
3. Tag and push: `git tag v0.1 && git push origin v0.1`.

`v0.x` releases are pre-stable; breaking changes are expected until `v1`.
