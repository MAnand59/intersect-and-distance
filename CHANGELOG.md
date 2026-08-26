# Changelog

All notable changes are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-08-26

### Added

- Correctly named `getIntersection` method while retaining `getInterSection` as a deprecated alias.
- Exported result, coordinate, side, and input-error types.
- ES module, CommonJS, and TypeScript declaration entry points.
- Input validation, automated unit/type/package tests, CI, and release automation.

### Changed

- Require Node.js 22 or later.
- Throw `IntersectionInputError` for invalid inputs instead of logging and returning `undefined`.
- Use projected geometry consistently to choose the nearest segment and side.
- Extend both ends of multi-segment centerlines consistently.

### Fixed

- Reject malformed, non-finite, out-of-range, one-point, and fully degenerate inputs.
- Skip duplicate segments when a valid segment remains.
- Ship only intended readable build output and public documentation.

[Unreleased]: https://github.com/MAnand59/intersect-and-distance/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/MAnand59/intersect-and-distance/releases/tag/v1.1.0
