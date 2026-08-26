# geo-intersection-util

`geo-intersection-util` projects a geographic point onto an oriented centerline. It returns the nearest intersection, the perpendicular distance in meters, and whether the point lies to the left, right, or exactly on the path.

The package has no runtime dependencies, performs no network requests, and requires no credentials.

## Requirements

- Node.js 22 or later
- TypeScript or JavaScript
- CommonJS and ES modules are both supported

The implementation is synchronous and uses standard JavaScript only. It can be bundled for other runtimes, but the release checks explicitly cover supported Node.js versions.

## Installation

```sh
npm install geo-intersection-util
```

## Quick start

Coordinate strings always use `longitude latitude` order. A centerline is a comma-separated list containing at least two distinct coordinates.

### TypeScript / ES modules

```ts
import { Intersection, type IntersectionResult } from 'geo-intersection-util';

const centerLine =
  '88.426709 22.579435, 88.430032 22.581458, 88.432886 22.582901, 88.437578 22.580801';
const point = '88.433217 22.581856';
const forwardPoint = '88.438367 22.580495';

const result: IntersectionResult = new Intersection().getIntersection(
  centerLine,
  point,
  forwardPoint,
);

console.log(result);
```

### JavaScript / CommonJS

```js
const { Intersection } = require('geo-intersection-util');

const result = new Intersection().getIntersection(
  '88.426709 22.579435, 88.430032 22.581458, 88.437578 22.580801',
  '88.433217 22.581856',
  '88.438367 22.580495',
);

console.log(result.distance, result.side);
```

### NestJS

The calculator is stateless, so it can be created directly or registered as a provider:

```ts
import { Injectable } from '@nestjs/common';
import { Intersection } from 'geo-intersection-util';

@Injectable()
export class GeometryService {
  private readonly intersection = new Intersection();

  project(centerLine: string, point: string, forwardPoint: string) {
    return this.intersection.getIntersection(centerLine, point, forwardPoint);
  }
}
```

## Inputs and configuration

There is no global configuration or authentication.

| Input | Format | Rules |
| --- | --- | --- |
| `centerLine` | `"lng lat, lng lat, ..."` | At least two distinct points |
| `point` | `"lng lat"` | Point to project |
| `forwardPoint` | `"lng lat"` | Orients the path; the nearer endpoint becomes the path end |

Longitudes must be from -180 through 180. Because the calculation uses Web Mercator, latitudes must be from approximately -85.0511 through 85.0511. Whitespace between longitude and latitude is flexible.

## Public API

### `Intersection#getIntersection(centerLine, point, forwardPoint)`

Returns an `IntersectionResult`:

```ts
interface IntersectionResult {
  intersectionLatLng: { lat: number; lng: number };
  distance: number; // meters in Web Mercator
  side: 'left' | 'right' | 'center';
}
```

The first and last path segments are extended by 500 meters before projection, matching the package's historical endpoint behavior. For large regions, high latitudes, or geodesic-grade measurements, use a dedicated geodesy library instead.

### `Intersection#getInterSection(...)`

Deprecated compatibility alias for `getIntersection`. It returns the same result and will remain available throughout the 1.x series.

### Lower-level geometry methods

The class also exposes the existing utility methods for compatibility:

- `calculateBearing(lat1, lng1, lat2, lng2)` returns a bearing in degrees.
- `extendLatLng(lat, lng, distance, bearing)` extends a point by meters.
- `getPoint(centerLine, extensionDistance)` parses and extends both path ends.
- `determineSideOnCurvedCenterline(points, point)` returns the nearest segment's side.
- `latLngToCartesian(...)` and `cartesianToLatLng(...)` convert Web Mercator coordinates.
- `findPerpendicularIntersection(...)` projects onto one finite Cartesian segment.
- `findIntersectionPoint(...)` finds the nearest point across segments.
- `getLatLngFromPointsStr(...)`, `parseLatLng(...)`, and `parseCoordinate(...)` parse coordinate strings.
- `orientCenterLine(...)` orients a path toward a forward point.
- `distance(...)`, `euclideanDistance(...)`, and `getDistance(...)` measure points; `getDistance` returns projected meters.

Exported types are `LatLng`, `Cartesian`, `IntersectionSide`, and `IntersectionResult`. `IntersectionInputError` is also exported.

## Errors

Invalid coordinates and unusable centerlines throw `IntersectionInputError`, which extends `TypeError`. The package does not log or swallow errors.

```ts
import { Intersection, IntersectionInputError } from 'geo-intersection-util';

try {
  new Intersection().getIntersection('0 0', 'bad input', '1 0');
} catch (error) {
  if (error instanceof IntersectionInputError) {
    console.error(error.message);
  }
}
```

There are no API response, network, timeout, or cancellation models: all work is local and synchronous.

## Security

The package needs no secrets. If coordinates are sensitive, treat them as application data and avoid logging them. Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/MAnand59/intersect-and-distance/security/advisories/new); do not open a public issue for an undisclosed vulnerability. See [SECURITY.md](https://github.com/MAnand59/intersect-and-distance/blob/main/SECURITY.md).

## Migrating from 1.0.x

- Prefer the correctly capitalized `getIntersection`; `getInterSection` remains as an alias.
- Invalid inputs now throw `IntersectionInputError` instead of being logged and returning `undefined`.
- Valid results always contain a concrete intersection and a non-null side.
- Node.js 22 is now the minimum supported version.

These changes are released as a minor version because the valid-input 1.x call signature and legacy method remain compatible, while the new method, dual-module output, and validation are additive reliability improvements.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:package
npm run check
```

`npm run check` runs type checks, unit and public-type tests, a clean dual-module build, packed-tarball install/import checks, package type validation, and a production dependency audit.

## Project links

- [Source](https://github.com/MAnand59/intersect-and-distance)
- [Bug reports](https://github.com/MAnand59/intersect-and-distance/issues/new?template=bug-report.yml)
- [Feature requests](https://github.com/MAnand59/intersect-and-distance/issues/new?template=feature-request.yml)
- [Releases](https://github.com/MAnand59/intersect-and-distance/releases)
- [Contributing](https://github.com/MAnand59/intersect-and-distance/blob/main/CONTRIBUTING.md)

## License

[MIT](./LICENSE) © 2025–2026 Mayank Anand
