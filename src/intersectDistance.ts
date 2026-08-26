const EARTH_RADIUS_METERS = 6_378_137;
const MAX_MERCATOR_LATITUDE = 85.05112878;
const DEFAULT_EXTENSION_METERS = 500;
const CENTER_EPSILON = 1e-10;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Cartesian {
  x: number;
  y: number;
}

export type IntersectionSide = 'left' | 'right' | 'center';

export interface IntersectionResult {
  intersectionLatLng: LatLng;
  /** Perpendicular distance in meters. */
  distance: number;
  side: IntersectionSide;
}

/** Thrown when a coordinate or centerline cannot be processed safely. */
export class IntersectionInputError extends TypeError {
  override name = 'IntersectionInputError';
}

interface NearestPoint {
  point: Cartesian;
  segmentIndex: number;
}

/**
 * Projects geographic points onto an oriented centerline using Web Mercator.
 * Coordinate strings use `longitude latitude` order.
 */
export class Intersection {
  /**
   * Return the closest point on the centerline, its distance, and its side.
   * The centerline is oriented so that `forwardPoint` is nearest its end.
   */
  getIntersection(
    centerLine: string,
    point: string,
    forwardPoint: string,
  ): IntersectionResult {
    const pointLatLng = this.parseLatLng(point);
    const orientedPath = this.orientCenterLine(centerLine, forwardPoint);
    const centerPath = this.getPoint(orientedPath, DEFAULT_EXTENSION_METERS);
    const nearest = this.findNearestPoint(pointLatLng, centerPath);
    const pointCartesian = this.latLngToCartesian(pointLatLng.lat, pointLatLng.lng);
    const distance = this.euclideanDistance(pointCartesian, nearest.point);
    const side = this.determineSideForSegment(centerPath, pointLatLng, nearest.segmentIndex);

    return {
      intersectionLatLng: this.cartesianToLatLng(nearest.point),
      distance,
      side,
    };
  }

  /** @deprecated Use {@link getIntersection}. */
  getInterSection(
    centerLine: string,
    point: string,
    forwardPoint: string,
  ): IntersectionResult {
    return this.getIntersection(centerLine, point, forwardPoint);
  }

  calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    this.assertLatLng({ lat: lat1, lng: lng1 }, 'start point');
    this.assertLatLng({ lat: lat2, lng: lng2 }, 'end point');

    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    const deltaLngRad = this.toRadians(lng2 - lng1);
    const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);

    return (this.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  extendLatLng(lat: number, lng: number, distance: number, bearing: number): LatLng {
    this.assertLatLng({ lat, lng }, 'point');
    if (!Number.isFinite(distance) || distance < 0) {
      throw new IntersectionInputError('distance must be a finite, non-negative number');
    }
    if (!Number.isFinite(bearing)) {
      throw new IntersectionInputError('bearing must be a finite number');
    }

    const angularDistance = distance / EARTH_RADIUS_METERS;
    const bearingRad = this.toRadians(bearing);
    const latRad = this.toRadians(lat);
    const lngRad = this.toRadians(lng);
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad),
    );
    const newLngRad =
      lngRad +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad),
      );

    const result = {
      lat: this.toDegrees(newLatRad),
      lng: ((this.toDegrees(newLngRad) + 540) % 360) - 180,
    };
    this.assertLatLng(result, 'extended point');
    return result;
  }

  getPoint(pointString: string, extensionDistance: number): LatLng[] {
    const points = this.getLatLngFromPointsStr(pointString);
    if (!Number.isFinite(extensionDistance) || extensionDistance < 0) {
      throw new IntersectionInputError('extensionDistance must be a finite, non-negative number');
    }

    const first = points[0]!;
    const last = points.at(-1)!;
    const second = this.findDistinctNeighbor(points, 0, 1);
    const penultimate = this.findDistinctNeighbor(points, points.length - 1, -1);
    const extendedFirst = this.extendLatLng(
      first.lat,
      first.lng,
      extensionDistance,
      (this.calculateBearing(first.lat, first.lng, second.lat, second.lng) + 180) % 360,
    );
    const extendedLast = this.extendLatLng(
      last.lat,
      last.lng,
      extensionDistance,
      this.calculateBearing(penultimate.lat, penultimate.lng, last.lat, last.lng),
    );

    return [extendedFirst, ...points, extendedLast];
  }

  determineSideOnCurvedCenterline(
    centerlinePoints: LatLng[],
    point: LatLng,
  ): IntersectionSide {
    this.assertCenterline(centerlinePoints);
    this.assertLatLng(point, 'point');
    const nearest = this.findNearestPoint(point, centerlinePoints);
    return this.determineSideForSegment(centerlinePoints, point, nearest.segmentIndex);
  }

  euclideanDistance(p1: Cartesian, p2: Cartesian): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  latLngToCartesian(lat: number, lng: number): Cartesian {
    this.assertLatLng({ lat, lng }, 'point');
    return {
      x: EARTH_RADIUS_METERS * this.toRadians(lng),
      y:
        EARTH_RADIUS_METERS *
        Math.log(Math.tan(Math.PI / 4 + this.toRadians(lat) / 2)),
    };
  }

  getDistance(p1: LatLng, p2: LatLng): number {
    this.assertLatLng(p1, 'first point');
    this.assertLatLng(p2, 'second point');
    return this.euclideanDistance(
      this.latLngToCartesian(p1.lat, p1.lng),
      this.latLngToCartesian(p2.lat, p2.lng),
    );
  }

  distance(p1: Cartesian, p2: Cartesian): number {
    return this.euclideanDistance(p1, p2);
  }

  findPerpendicularIntersection(
    point: Cartesian,
    start: Cartesian,
    end: Cartesian,
  ): Cartesian | null {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx ** 2 + dy ** 2;
    if (lengthSquared === 0) return null;

    const parameter =
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
    if (parameter < 0 || parameter > 1) return null;

    return { x: start.x + parameter * dx, y: start.y + parameter * dy };
  }

  cartesianToLatLng(point: Cartesian): LatLng {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new IntersectionInputError('Cartesian coordinates must be finite numbers');
    }
    return {
      lng: this.toDegrees(point.x / EARTH_RADIUS_METERS),
      lat: this.toDegrees(
        2 * Math.atan(Math.exp(point.y / EARTH_RADIUS_METERS)) - Math.PI / 2,
      ),
    };
  }

  findIntersectionPoint(point: LatLng, centerLine: LatLng[]): LatLng {
    return this.cartesianToLatLng(this.findNearestPoint(point, centerLine).point);
  }

  getLatLngFromPointsStr(pointsString: string): LatLng[] {
    if (typeof pointsString !== 'string' || pointsString.trim() === '') {
      throw new IntersectionInputError('centerLine must be a non-empty string');
    }
    const points = pointsString
      .split(',')
      .map((segment, index) => this.parseLatLng(segment, `centerLine point ${index + 1}`));
    this.assertCenterline(points);
    return points;
  }

  parseCoordinate(coordinate: string): Cartesian {
    const parsed = this.parsePair(coordinate, 'coordinate');
    return { x: parsed[0], y: parsed[1] };
  }

  orientCenterLine(centerLine: string, forwardPoint: string): string {
    const points = this.getLatLngFromPointsStr(centerLine);
    const target = this.parseLatLng(forwardPoint, 'forwardPoint');
    const distanceFromStart = this.getDistance(points[0]!, target);
    const distanceFromEnd = this.getDistance(points.at(-1)!, target);
    const oriented = distanceFromStart < distanceFromEnd ? [...points].reverse() : points;
    return oriented.map(({ lng, lat }) => `${lng} ${lat}`).join(', ');
  }

  parseLatLng(coordinate: string, label = 'coordinate'): LatLng {
    const [lng, lat] = this.parsePair(coordinate, label);
    const point = { lat, lng };
    this.assertLatLng(point, label);
    return point;
  }

  private findNearestPoint(point: LatLng, centerLine: LatLng[]): NearestPoint {
    this.assertLatLng(point, 'point');
    this.assertCenterline(centerLine);
    const cartesianPoint = this.latLngToCartesian(point.lat, point.lng);
    let closest: NearestPoint | undefined;
    let minimumDistance = Infinity;

    for (let index = 0; index < centerLine.length - 1; index += 1) {
      const startPoint = centerLine[index]!;
      const endPoint = centerLine[index + 1]!;
      if (startPoint.lat === endPoint.lat && startPoint.lng === endPoint.lng) continue;
      const start = this.latLngToCartesian(startPoint.lat, startPoint.lng);
      const end = this.latLngToCartesian(endPoint.lat, endPoint.lng);
      const intersection = this.findPerpendicularIntersection(cartesianPoint, start, end);
      const candidate =
        intersection ??
        (this.distance(cartesianPoint, start) <= this.distance(cartesianPoint, end)
          ? start
          : end);
      const candidateDistance = this.distance(cartesianPoint, candidate);
      if (candidateDistance < minimumDistance) {
        minimumDistance = candidateDistance;
        closest = { point: candidate, segmentIndex: index };
      }
    }

    if (!closest) {
      throw new IntersectionInputError('centerLine must contain a non-degenerate segment');
    }
    return closest;
  }

  private determineSideForSegment(
    centerlinePoints: LatLng[],
    point: LatLng,
    segmentIndex: number,
  ): IntersectionSide {
    const first = centerlinePoints[segmentIndex]!;
    const second = centerlinePoints[segmentIndex + 1]!;
    const start = this.latLngToCartesian(first.lat, first.lng);
    const end = this.latLngToCartesian(second.lat, second.lng);
    const cartesianPoint = this.latLngToCartesian(point.lat, point.lng);
    const crossProduct =
      (end.x - start.x) * (cartesianPoint.y - start.y) -
      (end.y - start.y) * (cartesianPoint.x - start.x);
    const scale = Math.max(1, this.distance(start, end) * this.distance(start, cartesianPoint));

    if (Math.abs(crossProduct) <= CENTER_EPSILON * scale) return 'center';
    return crossProduct > 0 ? 'left' : 'right';
  }

  private assertCenterline(points: LatLng[]): void {
    if (!Array.isArray(points) || points.length < 2) {
      throw new IntersectionInputError('centerLine must contain at least two points');
    }
    points.forEach((point, index) =>
      this.assertLatLng(point, `centerLine point ${index + 1}`),
    );
    if (
      points.every(
        (point) => point.lat === points[0]!.lat && point.lng === points[0]!.lng,
      )
    ) {
      throw new IntersectionInputError('centerLine must contain at least two distinct points');
    }
  }

  private findDistinctNeighbor(points: LatLng[], startIndex: number, step: 1 | -1): LatLng {
    const endpoint = points[startIndex]!;
    for (
      let index = startIndex + step;
      index >= 0 && index < points.length;
      index += step
    ) {
      const candidate = points[index]!;
      if (candidate.lat !== endpoint.lat || candidate.lng !== endpoint.lng) return candidate;
    }
    throw new IntersectionInputError('centerLine must contain at least two distinct points');
  }

  private assertLatLng(point: LatLng, label: string): void {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      throw new IntersectionInputError(
        `${label} must contain finite longitude and latitude values`,
      );
    }
    if (point.lng < -180 || point.lng > 180) {
      throw new IntersectionInputError(`${label} longitude must be between -180 and 180`);
    }
    if (point.lat < -MAX_MERCATOR_LATITUDE || point.lat > MAX_MERCATOR_LATITUDE) {
      throw new IntersectionInputError(
        `${label} latitude must be between -${MAX_MERCATOR_LATITUDE} and ${MAX_MERCATOR_LATITUDE}`,
      );
    }
  }

  private parsePair(value: string, label: string): [number, number] {
    if (typeof value !== 'string') {
      throw new IntersectionInputError(
        `${label} must be a string in "longitude latitude" format`,
      );
    }
    const parts = value.trim().split(/\s+/);
    if (parts.length !== 2 || parts.some((part) => part === '')) {
      throw new IntersectionInputError(`${label} must use "longitude latitude" format`);
    }
    const pair = parts.map(Number) as [number, number];
    if (!pair.every(Number.isFinite)) {
      throw new IntersectionInputError(
        `${label} must contain numeric longitude and latitude values`,
      );
    }
    return pair;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}
