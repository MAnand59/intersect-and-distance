# Contributing

Thank you for helping improve `geo-intersection-util`.

## Before opening a change

Use [GitHub issues](https://github.com/MAnand59/intersect-and-distance/issues) for confirmed bugs and focused feature proposals. For security concerns, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Local development

1. Fork and clone the repository.
2. Use a supported Node.js version (22, 24, or 26).
3. Run `npm ci`.
4. Create a focused branch and add tests with the change.
5. Run `npm run check` before opening a pull request.

Keep the public API backward-compatible within a major release. Coordinate strings use `longitude latitude` order, and tests must not depend on network services.

By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md). Contributions are accepted under the MIT License.
