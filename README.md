# Template Convention Metadata

- **UUID**: f010a634-3525-416e-9320-8f44b5bc352c
- **Name**: Template
- **Schema URL**: "https://raw.githubusercontent.com/zarr-conventions/template/refs/tags/v1/schema.json"
- **Spec URL**: "https://github.com/zarr-conventions/template/blob/v1/README.md"
- **Scope**: Array, Group
- **Extension Maturity Classification****: Proposal
- **Owner**: @your-github-handle, @another-github-handle

The document explains the Template convention, which is a Zarr convention metadata. This is the place to add a short introduction.

- Examples:
    - [Convention metadata only](examples/minimal_example.json)
    - [Key-prefixed pattern (recommended)](examples/key_prefixed_example.json)
    - [Nested pattern](examples/nested_example.json)

## Convention Attributes

This convention defines attributes that appear at the root level of the Zarr `attributes` object. The convention can be used in these parts of the Zarr hierarchy:

- [x] Group
- [x] Array

### Namespace Patterns

To avoid attribute name collisions with other conventions, this convention supports two patterns:

#### 1. Key-Prefixed Pattern (Recommended)

Individual attributes are prefixed with `template:`. This is the recommended approach as it enables better composability - other conventions can extend objects defined by this convention.

**Convention metadata name**: `template:`

| Field Name           | Type                      | Description                                  |
| -------------------- | ------------------------- | -------------------------------------------- |
| template:new_field   | string                    | **REQUIRED**. Describe the required field... |
| template:xyz         | [XYZ Object](#xyz-object) | Describe the field...                        |
| template:another_one | \[number]                 | Describe the field...                        |

**Example**:
```json
{
  "attributes": {
    "zarr_conventions": [
      { "name": "template:", "spec_url": "..." }
    ],
    "template:new_field": "example value",
    "template:xyz": { "x": 1.0, "y": 2.0, "z": 3.0 }
  }
}
```

#### 2. Nested Pattern

All convention properties are nested under a single `template` key.

**Convention metadata name**: `template`

| Field Name           | Type                      | Description                                  |
| -------------------- | ------------------------- | -------------------------------------------- |
| template             | [Template Object](#template-object) | **REQUIRED**. Template convention properties |

**Example**:
```json
{
  "attributes": {
    "zarr_conventions": [
      { "name": "template", "spec_url": "..." }
    ],
    "template": {
      "new_field": "example value",
      "xyz": { "x": 1.0, "y": 2.0, "z": 3.0 }
    }
  }
}
```

### Template Object

When using the nested pattern, all properties are contained in the `template` object:

| Field Name   | Type                      | Description                                  |
| ------------ | ------------------------- | -------------------------------------------- |
| new_field    | string                    | **REQUIRED**. Describe the required field... |
| xyz          | [XYZ Object](#xyz-object) | Describe the field...                        |
| another_one  | \[number]                 | Describe the field...                        |

### Additional Field Information

#### new_field (template:new_field or template.new_field)

This is a much more detailed description of the field `new_field`...

### XYZ Object

This is the introduction for the purpose and the content of the XYZ Object...

| Field Name | Type   | Description                                  |
| ---------- | ------ | -------------------------------------------- |
| x          | number | **REQUIRED**. Describe the required field... |
| y          | number | **REQUIRED**. Describe the required field... |
| z          | number | **REQUIRED**. Describe the required field... |

## Acknowledgements

This template is based on the [STAC extensions template](https://github.com/stac-extensions/template/blob/main/README.md).
