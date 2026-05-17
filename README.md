# Spatial Convention

- **UUID**: 689b58e2-cf7b-45e0-9fff-9cfc0883d6b4
- **Name**: "spatial"
- **Schema URL**: "<https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v1/schema.json>"
- **Spec URL**: "<https://github.com/zarr-conventions/spatial/blob/v1/README.md>"
- **Scope**: Array, Group
- **Extension Maturity Classification**: Proposal
- **Owner**: @maxrjones, emmanuelmathot

## Description

This Zarr Convention defines metadata for describing the relationship between array indices and spatial coordinates. All properties use the `spatial:` namespace prefix and are placed at the root `attributes` level following the [Zarr Conventions Specification](https://github.com/zarr-conventions/zarr-conventions-spec).

### Scope

The `spatial:` convention describes the **two horizontal (X/Y) spatial axes only**. Arrays may have additional dimensions (bands, time, depth/Z, etc.); the `spatial:` properties simply identify and describe the two X/Y axes of such arrays. Any non-X/Y axis is out of scope for this convention and is expected to be described by another convention (e.g., CF coordinate variables for Z/time, or a future n-dimensional coordinate convention).

This convention is designed to be composable with other conventions:

- Use with a `proj:` convention to add coordinate reference system (CRS) information for geospatial data
- Use with `multiscales` to define spatial properties at different resolution levels
- Use standalone for non-geospatial data that has spatial relationships (e.g., microscopy, medical imaging)

Examples:

- [composition with proj](examples/proj.json)
- [composition with multiscales](examples/multiscales.json)

## Motivation

- **Modular design**: Separates spatial coordinate information from CRS definitions, allowing each to be used independently
- **Broad applicability**: Useful for both geospatial and non-geospatial data with spatial relationships
- **Simplicity**: No complex inheritance or override mechanisms needed
- **Interoperability**: Compatible with existing geospatial tools (GDAL, rasterio) when composed with CRS information
- **Composability**: Can extend other conventions like multiscales with spatial-specific properties

## Convention Registration

The convention must be registered in `zarr_conventions`:

```json
{
  "zarr_conventions": [
    {
      "schema_url": "https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v1/schema.json",
      "spec_url": "https://github.com/zarr-conventions/spatial/blob/v1/README.md",
      "uuid": "689b58e2-cf7b-45e0-9fff-9cfc0883d6b4",
      "name": "spatial",
      "description": "Spatial coordinate information"
    }
  ]
}
```

## Applicable To

This convention can be used with these parts of the Zarr hierarchy:

- [x] Group
- [x] Array

## Properties

All properties use the `spatial:` namespace prefix and are placed at the root `attributes` level.

| Property                   | Type        | Description                                                         | Required | Reference                                        |
| -------------------------- | ----------- | ------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| **spatial:dimensions**     | `string[2]` | Names of the two X/Y spatial dimensions (e.g., ["y", "x"])          | Yes      | [spatial:dimensions](#spatialdimensions)         |
| **spatial:bbox**           | `number[4]` | 2D bounding box [xmin, ymin, xmax, ymax]                            | No       | [spatial:bbox](#spatialbbox)                     |
| **spatial:transform_type** | `string`    | Type of coordinate transformation (default: "affine")               | No       | [spatial:transform_type](#spatialtransform_type) |
| **spatial:transform**      | `number[6]` | 2D affine transformation coefficients                               | No       | [spatial:transform](#spatialtransform)           |
| **spatial:shape**          | `integer[2]`| Shape of the two spatial dimensions [height, width]                 | No       | [spatial:shape](#spatialshape)                   |
| **spatial:registration**   | `string`    | Grid cell registration (i.e., raster space) type (default: "pixel") | No       | [spatial:registration](#spatialregistration)     |

### Field Details

Additional properties are allowed.

#### spatial:dimensions

Names of the array dimensions that have spatial coordinates.

- **Type**: `string[2]`
- **Required**: Yes

Identifies which of the array's dimensions correspond to spatial axes. This is particularly useful when arrays have non-spatial dimensions as well (e.g., time, bands).

Each entry in `spatial:dimensions` MUST match one of the names declared in the array's [`dimension_names`](https://github.com/zarr-developers/zarr-specs/blob/main/docs/v3/core/index.rst#dimension_names) metadata field (a top-level field of the Zarr V3 array metadata, not an attribute). Arrays using this convention MUST therefore declare `dimension_names`.

Matching is **by name, not by position**: the order of entries in `spatial:dimensions` is not significant for identifying which dimensions are spatial. Conventions that consume this list (e.g., for axis ordering in `spatial:transform` or `spatial:shape`) define their own ordering rules.

For 2D spatial data, provide 2 entries, e.g. `["y", "x"]`.

#### spatial:bbox

Bounding box in coordinate space

- **Type**: `number[4]`
- **Required**: No

Bounding box of the X/Y spatial extent in the coordinate space: `[xmin, ymin, xmax, ymax]` (exactly 4 elements).

The coordinates represent the minimum and maximum values along the X and Y axes. The interpretation of these coordinates depends on any associated coordinate reference system (e.g., from a `proj:` convention) or can represent abstract spatial units.

#### spatial:transform_type

Type of coordinate transformation

- **Type**: `string`
- **Required**: No
- **Default**: `"affine"`

Specifies the type of transformation used to map array indices to spatial coordinates. This property enables support for various transformation models.

**Currently defined types:**

- `"affine"`: Affine transformation using `spatial:transform` coefficients (default if omitted)

**Future extensibility**: Additional transform types may be defined in future versions of this convention (e.g., `"rpc"` for Rational Polynomial Coefficients, `"polynomial"`, `"lookup"` for coordinate arrays). Custom transformation types are allowed for domain-specific use cases.

When `spatial:transform_type` is omitted, implementations MUST assume `"affine"` for backwards compatibility. Implementations encountering unknown transform types SHOULD handle them gracefully (e.g., warn or skip processing rather than fail).

#### spatial:transform

Affine transformation coefficients

- **Type**: `number[6]`
- **Required**: No (but required when `spatial:transform_type` is `"affine"` or omitted)

Mapping from array index space to coordinate space that preserves points, straight lines, and ratios, including scaling, rotating, or translating. Used when `spatial:transform_type` is `"affine"` or omitted (default behavior).

Exactly 6 elements `[a, b, c, d, e, f]`; the implicit last row of the homogeneous matrix is `0, 0, 1` and is omitted.

The 2D transformation maps array indices (col_index, row_index) to spatial coordinates (x, y) according to:

```txt
  [x]   [a, b, c]   [col_index]
  [y] = [d, e, f] * [row_index]
  [1]   [0, 0, 1]   [    1    ]
```

Which expands to:

- `x = a*col_index + b*row_index + c`
- `y = d*col_index + e*row_index + f`

Where:

- `a`: pixel width (w-e pixel resolution)
- `b`: row rotation (typically 0)
- `c`: x-coordinate of the upper-left corner of the upper-left pixel
- `d`: column rotation (typically 0)
- `e`: pixel height (n-s pixel resolution, negative value for north-up images)
- `f`: y-coordinate of the upper-left corner of the upper-left pixel

**Coordinate convention:**

The transform operates on array indices where `(0, 0)` is at the **top-left corner** of the top-left pixel, and `(width, height)` is at the bottom-right corner of the bottom-right pixel. The center of the top-left pixel is at `(0.5, 0.5)`.

This follows the GDAL geotransform and Python's Affine library convention.

Note: Rasterio's `xy()` and `rowcol()` methods automatically add/subtract 0.5 to convert between pixel coordinates and corner coordinates. For example, `transformer.xy(0, 0)` is equivalent to applying this transform to `(0.5, 0.5)`, giving the coordinate at the center of the first pixel.

**Coefficient ordering:**

This format uses the Rasterio/Affine coefficient ordering: `[a, b, c, d, e, f]`

This is the same ordering used by:

- Rasterio's `Affine` transformation and `.transform` attribute
- Python's `affine` library
- The matrix form commonly used in geospatial Python libraries

GDAL's `GetGeoTransform` uses a different order: `[c, a, b, f, d, e]` or `[GT(0), GT(1), GT(2), GT(3), GT(4), GT(5)]`

**Converting between formats:**

```python
# From GDAL GetGeoTransform to spatial:transform
gdal_gt = src.GetGeoTransform()  # [GT(0), GT(1), GT(2), GT(3), GT(4), GT(5)]
spatial_transform = [gdal_gt[1], gdal_gt[2], gdal_gt[0],
                     gdal_gt[4], gdal_gt[5], gdal_gt[3]]

# From Rasterio Affine to spatial:transform
from affine import Affine
affine_transform = src.transform  # Affine object
spatial_transform = list(affine_transform)[:6]  # Direct conversion
```

#### spatial:shape

Shape of spatial dimensions

- **Type**: `integer[2]`
- **Required**: No

Specifies the size of the two X/Y spatial axes in array index units: `[height, width]` corresponding to `[y, x]` (exactly 2 elements).

This property is particularly useful when:

- The spatial shape differs from the full array shape (e.g., when the array includes non-spatial dimensions such as time, bands, or Z)
- Used with multiscales convention to specify shape at different resolution levels
- Documenting the spatial extent explicitly

#### spatial:registration

Grid cell registration type

- **Type**: `string`
- **Required**: No
- **Default**: `"pixel"`
- **Valid values**: `"node"` or `"pixel"`

Specifies whether the grid uses node registration (grid-registered) or pixel registration (cell-registered). This property is particularly important for grids where the interpretation of coordinate ranges differs between registration types.

**Node Registration (grid/node):**

Node-registered grids have cells centered on the grid-lines. The coordinate ranges (`spatial:bbox` and `spatial:transform`) refer to the centers of the cells on the outside border of the grid, and the footprints of the cells extend 1/2 cell width outside these ranges.

- Cells are centered on coordinate points
- Commonly used for discrete point data representation
- A global grid will have cells centered directly on the North and South Poles
- Has one more row and one more column than a pixel-registered grid with identical range

**Pixel Registration (cell/pixel):**

Pixel-registered grids have cells lying between the grid-lines. The coordinate ranges refer to the outside edges of the boundaries of the grid.

- Cell boundaries align with coordinate points
- Commonly used in images to prevent edge pixels from being cut in half
- A global grid will touch the edges of the poles without covering their centers
- Each cell in one registration overlaps quadrants of four cells in the corresponding node-registration

**Important considerations:**

- Converting between registration types results in relief flattening, as each cell in one registration overlies corners of four cells in the other
- The conversion process averages values, reducing local highs and raising local deeps
- Most grid applications recognize both types, but misidentifying the registration can shift cell locations and data
- This property helps tools correctly interpret the relationship between array indices and spatial coordinates

When `spatial:registration` is omitted, implementations MUST assume `"pixel"` registration for backwards compatibility.

**Relationship to other formats:**

This property corresponds to similar concepts in other geospatial formats:

- **GeoTIFF**: `"pixel"` = PixelIsArea (default), `"node"` = PixelIsPoint
- **GMT**: `"pixel"` = pixel registration, `"node"` = gridline registration
- **NetCDF-CF**: Related to the interpretation of coordinate bounds

**References:**

For more detailed information on grid cell registration concepts:

- NOAA NCEI: [Grid Cell Registration](https://www.ncei.noaa.gov/products/grid-cell-registration)
- GMT Documentation: [Grid registration](https://docs.generic-mapping-tools.org/6.4/cookbook/options.html#option-nodereg)
- GeoTIFF Specification: [Section 2.5.2.2 Raster Space](http://docs.opengeospatial.org/is/19-008r4/19-008r4.html#_raster_space)

## Examples

### Basic Array Example with Spatial Convention Only

For non-geospatial data or when CRS is not needed:

```json
{
  "zarr_format": 3,
  "node_type": "array",
  "dimension_names": ["y", "x"],
  "attributes": {
    "zarr_conventions": [
      {
        "schema_url": "https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v1/schema.json",
        "spec_url": "https://github.com/zarr-conventions/spatial/blob/v1/README.md",
        "uuid": "689b58e2-cf7b-45e0-9fff-9cfc0883d6b4",
        "name": "spatial",
        "description": "Spatial coordinate information"
      }
    ],
    "spatial:dimensions": ["y", "x"],
    "spatial:shape": [1024, 1024],
    "spatial:transform": [1.0, 0.0, 0.0, 0.0, -1.0, 1024.0],
    "spatial:bbox": [0.0, 0.0, 1024.0, 1024.0],
    "spatial:registration": "pixel"
  }
}
```

### DEM with Node Registration

For a Digital Elevation Model using node registration (grid-registered):

```json
{
  "zarr_format": 3,
  "node_type": "array",
  "dimension_names": ["y", "x"],
  "attributes": {
    "zarr_conventions": [
      {
        "schema_url": "https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v1/schema.json",
        "spec_url": "https://github.com/zarr-conventions/spatial/blob/v1/README.md",
        "uuid": "689b58e2-cf7b-45e0-9fff-9cfc0883d6b4",
        "name": "spatial",
        "description": "Spatial coordinate information"
      }
    ],
    "spatial:dimensions": ["y", "x"],
    "spatial:shape": [3601, 3601],
    "spatial:transform": [
      0.000277777778, 0.0, -180.0, 0.0, -0.000277777778, 90.0
    ],
    "spatial:bbox": [-180.0, -90.0, 180.0, 90.0],
    "spatial:registration": "node"
  }
}
```

In this example, the grid has 3601 x 3601 cells covering -180° to 180° longitude and -90° to 90° latitude. With node registration, cells are centered on the coordinate points, including cells centered exactly on the North Pole (90°) and South Pole (-90°). The cell footprints extend 1/2 cell width (approximately 0.00013889°) beyond these ranges.

### Composition with proj: Convention

For geospatial data, combine `spatial:` with `proj:` for complete coordinate information:

```json
{
  "zarr_format": 3,
  "node_type": "array",
  "dimension_names": ["Y", "X"],
  "attributes": {
    "zarr_conventions": [
      {
        "schema_url": "https://raw.githubusercontent.com/zarr-experimental/geo-proj/refs/tags/v1/schema.json",
        "spec_url": "https://github.com/zarr-experimental/geo-proj/blob/v1/README.md",
        "uuid": "f17cb550-5864-4468-aeb7-f3180cfb622f",
        "name": "proj:",
        "description": "Coordinate reference system information for geospatial data"
      },
      {
        "schema_url": "https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v1/schema.json",
        "spec_url": "https://github.com/zarr-conventions/spatial/blob/v1/README.md",
        "uuid": "689b58e2-cf7b-45e0-9fff-9cfc0883d6b4",
        "name": "spatial",
        "description": "Spatial coordinate information"
      }
    ],
    "proj:code": "EPSG:3857",
    "spatial:dimensions": ["Y", "X"],
    "spatial:bbox": [
      -20037508.342789244, -20037508.342789244, 20037508.342789244,
      20037508.342789244
    ],
    "spatial:transform": [
      156543.03392804097, 0.0, -20037508.342789244, 0.0, -156543.03392804097,
      20037508.342789244
    ]
  }
}
```

### Composability with Multiscales

The spatial: convention can extend multiscales layouts by adding spatial properties to individual resolution levels:

```json
{
  "zarr_conventions": [
    {
      "schema_url": "https://raw.githubusercontent.com/zarr-conventions/multiscales/refs/tags/v1/schema.json",
      "spec_url": "https://github.com/zarr-conventions/multiscales/blob/v1/README.md",
      "uuid": "d35379db-88df-4056-af3a-620245f8e347",
      "name": "multiscales",
      "description": "Multiscale layout of zarr datasets"
    },
    {
      "schema_url": "https://raw.githubusercontent.com/zarr-experimental/geo-proj/refs/tags/v1/schema.json",
      "spec_url": "https://github.com/zarr-experimental/geo-proj/blob/v1/README.md",
      "uuid": "f17cb550-5864-4468-aeb7-f3180cfb622f",
      "name": "proj:",
      "description": "Coordinate reference system information for geospatial data"
    },
    {
      "schema_url": "https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v1/schema.json",
      "spec_url": "https://github.com/zarr-conventions/spatial/blob/v1/README.md",
      "uuid": "689b58e2-cf7b-45e0-9fff-9cfc0883d6b4",
      "name": "spatial",
      "description": "Spatial coordinate information"
    }
  ],
  "multiscales": {
    "layout": [
      {
        "asset": "r10m",
        "transform": {
          "scale": [1.0, 1.0],
          "translation": [0.0, 0.0]
        },
        "spatial:shape": [1200, 1200],
        "spatial:transform": [10.0, 0.0, 500000.0, 0.0, -10.0, 5000000.0]
      },
      {
        "asset": "r20m",
        "derived_from": "r10m",
        "transform": {
          "scale": [2.0, 2.0],
          "translation": [0.0, 0.0]
        },
        "spatial:shape": [600, 600],
        "spatial:transform": [20.0, 0.0, 500000.0, 0.0, -20.0, 5000000.0]
      }
    ]
  },
  "proj:code": "EPSG:32633",
  "spatial:dimensions": ["Y", "X"],
  "spatial:bbox": [500000.0, 4988000.0, 512000.0, 5000000.0]
}
```

In this example:

- The group-level `proj:code` defines the CRS for all resolution levels
- The group-level `spatial:dimensions` and `spatial:bbox` apply to all resolution levels
- Each layout item has its own `spatial:shape` and `spatial:transform` specific to that resolution
- The multiscales convention defines the relative transformations between levels via the `transform` object
- This enables efficient storage of multi-resolution geospatial data with proper georeferencing at each level
- Note how CRS information (`proj:`) is separated from spatial coordinate information (`spatial:`)

**Transform parameter interpretation with spatial:**

The multiscales convention defines transformations between resolution levels using the formula:

```
X_current = X_source × scale + translation
```

This is a domain-agnostic affine transformation (scale followed by translation). When composing with the `spatial:` convention, the interpretation depends on `spatial:registration`:

When `spatial:registration` is `"pixel"` (the default), the pixel origin is defined by the `spatial:transform` (coefficients `c` and `f`) or `spatial:bbox` at each layout level. For standard geospatial overviews where all resolution levels share the same coordinate origin, the multiscales `translation` should be `[0.0, 0.0]`—only the pixel resolution (scale) changes between levels.

The `spatial:transform` origin coordinates (`c`, `f`) remain constant across levels, while the pixel size (`a`, `e`) varies according to the resolution. Implementations must ensure consistency: if a level has `"scale": [2.0, 2.0]` relative to the base, its `spatial:transform` pixel dimensions should be twice those of the base level.

Non-zero translation values are valid when there are actual spatial offsets between levels (e.g., cropped extents), but this is uncommon for georeferenced image pyramids.

**Recommendation:** When composing with multiscales, it is highly recommended to specify `spatial:transform` and `spatial:shape` explicitly at each layout level. This ensures unambiguous georeferencing and avoids relying on derived calculations from multiscales transform parameters.

See [examples/multiscales.json](examples/multiscales.json) for a complete example.

## FAQ

### Why are spatial: and proj: separate conventions?

As explained in the [rasterio documentation](https://rasterio.readthedocs.io/): "There are two parts to the georeferencing of raster datasets: the definition of the local, regional, or global system in which a raster's pixels are located; and the parameters by which pixel coordinates are transformed into coordinates in that system."

This fundamental distinction motivated the design decision ([zarr-conventions issue #9](https://github.com/zarr-conventions/zarr-conventions/issues/9)) to separate these concerns into two conventions:

1. **`proj:`** - Defines the coordinate reference system (CRS): the "local, regional, or global system" using EPSG codes, WKT2, or PROJJSON
2. **`spatial:`** - Defines the coordinate transformation: the "parameters by which pixel coordinates are transformed" including transform matrices, bounding boxes, and dimension mappings

This separation provides several benefits:

- **Broader applicability**: Bounds and transforms are useful beyond geospatial data (microscopy, medical imaging)
- **Simpler model**: No need for complex inheritance or override mechanisms - CRS can be defined at group level, while spatial coordinates vary per array
- **Cleaner conceptual model**: Each convention has a single, well-defined purpose
- **Tool interoperability**: Non-geospatial tools can use spatial coordinates without understanding CRS specifications
- **Modular composition**: Each convention can evolve independently

### How does this compare to the STAC Projection Extension?

The STAC Projection Extension combines CRS and spatial coordinate information in a single extension. This spatial convention takes a different approach:

- **STAC approach**: Single `proj:` extension with both CRS (`proj:epsg`, `proj:wkt2`) and coordinates (`proj:bbox`, `proj:transform`)
- **This approach**: Separate conventions - `proj:` for CRS, `spatial:` for coordinates

Both approaches are valid. The separated approach prioritizes modularity and broader applicability, while STAC prioritizes simplicity for the geospatial-only use case.

### Can I use spatial: without proj:?

Yes! The `spatial:` convention is useful on its own for:

- Non-geospatial data with spatial relationships (microscopy, medical imaging)
- Data where coordinates are in abstract units
- Workflows that don't need formal CRS definitions
- Cases where CRS information is managed separately

### Does `spatial:` replace explicit coordinate arrays?

**Yes, for affine cases.** The `spatial:transform` provides *implicit* coordinates: applying the affine matrix to an array index yields the coordinate of that cell, so explicit per-axis `x`/`y` coordinate arrays (as commonly stored alongside NetCDF/xarray data) are not required and would be redundant.

Storing explicit coordinate arrays is still allowed — for instance, when:

- Coordinates are non-affine (irregular spacing, curvilinear grids, swath data) and cannot be expressed by `spatial:transform_type: "affine"`. A future `spatial:transform_type: "lookup"` (see [spatial:transform_type](#spatialtransform_type)) is intended to reference such arrays explicitly.
- You want xarray/CF tooling to discover coordinates by name without computing them from the transform.

In those cases the explicit coordinate arrays carry the values; `spatial:` still describes the spatial dimensions and any bounding box, and `proj:` (if present) defines the CRS those values live in.

### Can I use spatial: at the group level?

Yes, `spatial:` properties can be defined at both group and array levels. When defined at the group level:

- Properties apply to direct child arrays that don't define their own `spatial:` properties
- This is useful when multiple arrays share the same spatial coordinate system
- Arrays can define their own `spatial:` properties to override or supplement group-level definitions

This is particularly useful with multiscales, where the CRS (`proj:`) is shared but spatial properties (`spatial:shape`, `spatial:transform`) vary per resolution level.

### What's required when using spatial: with proj:?

When composing `spatial:` with a `proj:` convention:

- Both conventions must be listed in `zarr_conventions`
- `spatial:dimensions` must be provided on each array to identify which of the array's `dimension_names` are spatial
- The coordinate values in `spatial:bbox` and `spatial:transform` should be in the coordinate system defined by `proj:`

### How does the convention support different transformation types?

The `spatial:transform_type` property enables extensibility for different coordinate transformation models:

- **Current support**: Only `"affine"` transformations are currently defined
- **Default behavior**: When `spatial:transform_type` is omitted, affine transformation is assumed for backwards compatibility
- **Future extensions**: Additional transform types (e.g., RPC, polynomial, lookup tables) can be added in future versions without breaking existing implementations
- **Custom types**: Domain-specific transform types are allowed for specialized use cases
- **Forward compatibility**: The convention does not use a fixed enum, allowing new transform types to be added without invalidating old schemas

Implementations should handle unknown transform types gracefully (warn or skip) rather than failing, ensuring forward compatibility as new transform types are standardized.

### What about a Z (depth/altitude) dimension or 3D data?

In v1, `spatial:` describes only the two horizontal X/Y axes. Arrays may still have additional dimensions (Z, time, bands, etc.); the `spatial:` properties simply describe the X/Y axes of such arrays and say nothing about the other axes.

This is a deliberate choice for v1 (see [issue #10](https://github.com/zarr-conventions/spatial/issues/10)):

- No mainstream geospatial library supports 3D affine transforms — GDAL, rasterio, the Affine library, and GeoTIFF are all strictly 2D. CF/NetCDF treats vertical axes as independent 1D coordinate variables rather than as part of an affine transform.
- In practice the Z axis is almost always independent of X/Y (just a scale + offset, or irregular coordinate values), so a full 3D affine with XZ/YZ rotation would be overkill.
- Keeping v1 small and stable lets the convention be adopted broadly for the well-understood 2D case before adding spec surface area driven by less common use cases.

Non-X/Y axes (Z, time, bands, …) can be described by composing with another convention, e.g., a CF-style coordinate variable convention. A future revision of `spatial:` (or a sibling convention) may add explicit ND coordinate semantics once the ecosystem need and design are clear.

### How does spatial:registration relate to GeoTIFF PixelIsArea/PixelIsPoint?

The `spatial:registration` property directly maps to GeoTIFF's raster space concepts:

- **`spatial:registration: "pixel"`** (default) = **GeoTIFF PixelIsArea**: Pixels represent areas/cells with boundaries at coordinate points. An N×M image covers bounds (0,0) to (N,M).

- **`spatial:registration: "node"`** = **GeoTIFF PixelIsPoint**: Pixel values are point measurements at coordinate locations. An N×M image covers bounds (0,0) to (N-1,M-1).

When converting GeoTIFF data to Zarr, use `spatial:registration: "node"` for PixelIsPoint GeoTIFFs and `spatial:registration: "pixel"` (or omit it) for PixelIsArea GeoTIFFs.

### When should I use node vs pixel registration?

The choice between node and pixel registration depends on your data type and how it should be interpreted:

**Use node registration when:**

- Representing discrete point measurements (e.g., weather station data interpolated to a grid)
- Working with Digital Elevation Models where elevation values represent specific coordinate points
- You need cells centered on specific coordinate values (e.g., cells at exactly 0°, 1°, 2° longitude)
- Converting from point data to a gridded format
- Converting GeoTIFF data with PixelIsPoint
- Working with data formats that traditionally use grid registration (e.g., some GMT gridline grids, NetCDF grids)

**Use pixel registration when:**

- Working with imagery or raster data where pixels represent areas
- Cell boundaries need to align with specific coordinate values
- Processing data where edge pixels should not be cut in half at boundaries
- Converting GeoTIFF data with PixelIsArea (the GeoTIFF default)
- Working with formats that traditionally use cell registration (e.g., most GeoTIFFs, COG)
- Composing with the multiscales convention for image pyramids

**Important notes:**

- A node-registered grid with shape [n, m] covering the same extent as a pixel-registered grid will have one more row and column
- For example, a 1° global grid: node registration would be 181 x 361 (cells at -90° to 90° and -180° to 180°), while pixel registration would be 180 x 360 (cells between these values)
- When in doubt, use pixel registration (the default) as it's more common for imagery and prevents edge artifacts

## Acknowledgements

The template is based on the [STAC extensions template](https://github.com/stac-extensions/template/blob/main/README.md).

The convention was copied and modified from
<https://github.com/zarr-developers/zarr-extensions/pull/21> and [https://github.com/EOPF-Explorer/data-model/blob/main/attributes/geo/proj/](https://github.com/EOPF-Explorer/data-model/blob/main/attributes/geo/proj/).
