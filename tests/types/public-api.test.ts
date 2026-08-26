import {
  Intersection,
  IntersectionInputError,
  type Cartesian,
  type IntersectionResult,
  type IntersectionSide,
  type LatLng,
} from '../../src/index.js';

const calculator: Intersection = new Intersection();
const result: IntersectionResult = calculator.getIntersection('0 0, 1 0', '0.5 1', '1 0');
const point: LatLng = result.intersectionLatLng;
const side: IntersectionSide = result.side;
const cartesian: Cartesian = calculator.latLngToCartesian(point.lat, point.lng);
const error: TypeError = new IntersectionInputError('invalid');

void [calculator, result, point, side, cartesian, error];
