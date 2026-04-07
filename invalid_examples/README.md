These files are **invalid** and are included to test that the JSON Schema correctly declares these to be invalid.

- `sentinel2-tci.json` is invalid because it doesn't have a `spatial:transform` on each item in `layout`.
- `dem-multiresolution.json` is invalid because it has a `spatial:transform` at the top level.
- `dem-multiresolution-partial.json` is invalid because it is missing `spatial:transform` on some of the items in `layout`.
