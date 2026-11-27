#!/usr/bin/env node
// Negative-case test suite for the single-source rule on spatial: properties.
// Exercises the four allOf branches in schema.json:
//   1. affine array MUST NOT carry spatial:bbox (derivable),
//   2. non-affine array MUST carry spatial:bbox (no closed-form derivation),
//   3. group MUST NOT carry per-array spatial properties,
//   4. multiscales.layout[] entries MUST NOT carry spatial:bbox (derivable per level).
// Complements test.js (which validates examples/) by verifying that forbidden
// shapes are rejected.

import fs from "fs";
import Ajv from "ajv";

const schema = JSON.parse(fs.readFileSync("schema.json", "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const conventions = [
  {
    schema_url:
      "https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v1/schema.json",
    spec_url: "https://github.com/zarr-conventions/spatial/blob/v1/README.md",
    uuid: "689b58e2-cf7b-45e0-9fff-9cfc0883d6b4",
    name: "spatial",
    description: "Spatial coordinate information",
  },
];

const transform = [10.0, 0.0, 500000.0, 0.0, -10.0, 5000000.0];
const bbox = [500000.0, 4990000.0, 510000.0, 5000000.0];

const cases = [
  {
    name: "array, affine implicit, no bbox",
    expect: true,
    data: {
      zarr_format: 3,
      node_type: "array",
      attributes: {
        zarr_conventions: conventions,
        "spatial:dimensions": ["y", "x"],
        "spatial:shape": [1024, 1024],
        "spatial:transform": transform,
      },
    },
  },
  {
    name: "array, affine implicit, WITH bbox (FORBIDDEN)",
    expect: false,
    data: {
      zarr_format: 3,
      node_type: "array",
      attributes: {
        zarr_conventions: conventions,
        "spatial:dimensions": ["y", "x"],
        "spatial:shape": [1024, 1024],
        "spatial:transform": transform,
        "spatial:bbox": bbox,
      },
    },
  },
  {
    name: "array, affine explicit, no bbox",
    expect: true,
    data: {
      zarr_format: 3,
      node_type: "array",
      attributes: {
        zarr_conventions: conventions,
        "spatial:dimensions": ["y", "x"],
        "spatial:shape": [1024, 1024],
        "spatial:transform_type": "affine",
        "spatial:transform": transform,
      },
    },
  },
  {
    name: "array, affine explicit, WITH bbox (FORBIDDEN)",
    expect: false,
    data: {
      zarr_format: 3,
      node_type: "array",
      attributes: {
        zarr_conventions: conventions,
        "spatial:dimensions": ["y", "x"],
        "spatial:shape": [1024, 1024],
        "spatial:transform_type": "affine",
        "spatial:transform": transform,
        "spatial:bbox": bbox,
      },
    },
  },
  {
    name: "array, rpc, WITH bbox (REQUIRED, allowed)",
    expect: true,
    data: {
      zarr_format: 3,
      node_type: "array",
      attributes: {
        zarr_conventions: conventions,
        "spatial:dimensions": ["y", "x"],
        "spatial:shape": [1024, 1024],
        "spatial:transform_type": "rpc",
        "spatial:bbox": bbox,
      },
    },
  },
  {
    name: "array, rpc, no bbox (FORBIDDEN, rule B requires it)",
    expect: false,
    data: {
      zarr_format: 3,
      node_type: "array",
      attributes: {
        zarr_conventions: conventions,
        "spatial:dimensions": ["y", "x"],
        "spatial:shape": [1024, 1024],
        "spatial:transform_type": "rpc",
      },
    },
  },
  {
    name: "group with bbox only",
    expect: true,
    data: {
      zarr_format: 3,
      node_type: "group",
      attributes: {
        zarr_conventions: conventions,
        "spatial:bbox": [500000.0, 4988000.0, 512000.0, 5000000.0],
      },
    },
  },
  {
    name: "group with spatial:transform (FORBIDDEN at group level)",
    expect: false,
    data: {
      zarr_format: 3,
      node_type: "group",
      attributes: {
        zarr_conventions: conventions,
        "spatial:bbox": [500000.0, 4988000.0, 512000.0, 5000000.0],
        "spatial:transform": transform,
      },
    },
  },
  {
    name: "group with spatial:shape (FORBIDDEN at group level)",
    expect: false,
    data: {
      zarr_format: 3,
      node_type: "group",
      attributes: {
        zarr_conventions: conventions,
        "spatial:shape": [1024, 1024],
      },
    },
  },
  {
    name: "group with antimeridian-crossing bbox (xmin > xmax)",
    expect: true,
    data: {
      zarr_format: 3,
      node_type: "group",
      attributes: {
        zarr_conventions: conventions,
        "spatial:bbox": [170.0, -10.0, -170.0, 10.0],
      },
    },
  },
  {
    name: "multiscales layout entry with spatial:bbox (FORBIDDEN per-level)",
    expect: false,
    data: {
      zarr_format: 3,
      node_type: "group",
      attributes: {
        zarr_conventions: conventions,
        "spatial:bbox": [500000.0, 4988000.0, 512000.0, 5000000.0],
        multiscales: {
          layout: [
            {
              "spatial:shape": [1024, 1024],
              "spatial:transform": transform,
              "spatial:bbox": bbox,
            },
          ],
        },
      },
    },
  },
  {
    name: "multiscales layout entry with shape + transform only",
    expect: true,
    data: {
      zarr_format: 3,
      node_type: "group",
      attributes: {
        zarr_conventions: conventions,
        "spatial:bbox": [500000.0, 4988000.0, 512000.0, 5000000.0],
        multiscales: {
          layout: [
            {
              "spatial:shape": [1024, 1024],
              "spatial:transform": transform,
            },
            {
              "spatial:shape": [512, 512],
              "spatial:transform": [20.0, 0.0, 500000.0, 0.0, -20.0, 5000000.0],
            },
          ],
        },
      },
    },
  },
];

console.log("🧪 Running rule tests...\n");
let pass = 0;
let fail = 0;
for (const c of cases) {
  const ok = validate(c.data);
  const correct = ok === c.expect;
  console.log(
    `${correct ? "✅ PASS" : "❌ FAIL"}  ${c.name}  (got ${ok}, expected ${c.expect})`
  );
  if (!correct) {
    console.log("  errors:", JSON.stringify(validate.errors, null, 2));
    fail++;
  } else {
    pass++;
  }
}

console.log("\n" + "=".repeat(50));
console.log(`Total: ${cases.length} | Passed: ${pass} | Failed: ${fail}`);
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
