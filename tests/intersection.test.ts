import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Intersection, IntersectionInputError } from '../src/index.js';

const intersection = new Intersection();
const eastboundPath = '0 0, 0.01 0';

describe('Intersection', () => {
  it('projects a point onto a centerline and reports meters and side', () => {
    const result = intersection.getIntersection(eastboundPath, '0.005 0.001', '0.01 0');

    assert.ok(Math.abs(result.intersectionLatLng.lng - 0.005) < 1e-9);
    assert.ok(Math.abs(result.intersectionLatLng.lat) < 1e-9);
    assert.ok(Math.abs(result.distance - 111.31949) < 0.01);
    assert.equal(result.side, 'left');
  });

  it('reports right and center relative to the oriented path', () => {
    assert.equal(
      intersection.getIntersection(eastboundPath, '0.005 -0.001', '0.01 0').side,
      'right',
    );
    assert.equal(
      intersection.getIntersection(eastboundPath, '0.005 0', '0.01 0').side,
      'center',
    );
  });

  it('orients the path toward the supplied forward point', () => {
    const result = intersection.getIntersection(eastboundPath, '0.005 0.001', '0 0');
    assert.equal(result.side, 'right');
  });

  it('keeps the legacy method as a compatible alias', () => {
    assert.deepEqual(
      intersection.getInterSection(eastboundPath, '0.005 0.001', '0.01 0'),
      intersection.getIntersection(eastboundPath, '0.005 0.001', '0.01 0'),
    );
  });

  it('accepts flexible whitespace and multi-segment paths', () => {
    const result = intersection.getIntersection(
      '0\t0,   0.005  0, 0.01 0',
      '0.0075 0.001',
      '0.01 0',
    );
    assert.equal(result.side, 'left');
  });

  it('skips duplicate segments when another valid segment exists', () => {
    const point = intersection.findIntersectionPoint(
      { lat: 0.001, lng: 0.005 },
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0.01 },
      ],
    );
    assert.ok(Math.abs(point.lng - 0.005) < 1e-9);
  });

  it('extends endpoint runs using the nearest distinct point', () => {
    const extended = intersection.getPoint('0 0, 0 0, 0.01 0, 0.01 0', 100);
    assert.ok(extended[0]!.lng < 0);
    assert.ok(extended.at(-1)!.lng > 0.01);
  });

  it('calculates bearings and geographic extensions deterministically', () => {
    assert.ok(Math.abs(intersection.calculateBearing(0, 0, 0, 1) - 90) < 1e-12);
    const extended = intersection.extendLatLng(0, 0, 1_000, 90);
    assert.ok(Math.abs(extended.lat) < 1e-10);
    assert.ok(Math.abs(extended.lng - 0.00898315) < 1e-7);
  });

  it('chooses the nearest endpoint when projection falls outside a segment', () => {
    const point = intersection.findIntersectionPoint(
      { lat: 0.001, lng: 0.02 },
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0.01 },
      ],
    );
    assert.ok(Math.abs(point.lng - 0.01) < 1e-9);
  });

  it('validates malformed and out-of-range coordinates', () => {
    assert.throws(
      () => intersection.getIntersection(eastboundPath, 'not-a-point', '0.01 0'),
      (error: unknown) =>
        error instanceof IntersectionInputError && /longitude latitude/.test(error.message),
    );
    assert.throws(
      () => intersection.getIntersection(eastboundPath, '181 0', '0.01 0'),
      /longitude must be between/,
    );
    assert.throws(
      () => intersection.getIntersection(eastboundPath, '0 90', '0.01 0'),
      /latitude must be between/,
    );
  });

  it('requires two distinct centerline points', () => {
    assert.throws(
      () => intersection.getIntersection('0 0', '0 0', '0 0'),
      /at least two points/,
    );
    assert.throws(
      () => intersection.getIntersection('0 0, 0 0', '0 0', '0 0'),
      /at least two distinct points/,
    );
  });

  it('validates extension distance', () => {
    assert.throws(() => intersection.getPoint(eastboundPath, -1), /non-negative/);
  });
});
