# Changelog

## [3.1.0](https://github.com/codepunkt/rollup-license-plugin/compare/3.0.2...3.4.0) (2025-11-13)

### ✨ New Features

* add ability to disable standard output file ([4aed941](https://github.com/codepunkt/rollup-license-plugin/commit/4aed9417701c1f3d30d9e4b688038da3db975dfe))
* narrow return type of `createViteLicensePlugin` ([330fdc6](https://github.com/codepunkt/rollup-license-plugin/commit/330fdc6582b022cbf26ac33cc57abdcbe6eabeeb))
* allow overriding licenses without specifying versions ([260a814](https://github.com/codepunkt/rollup-license-plugin/commit/260a814321ef56b92842b7f3963b24a90b7ac13f))
* allow overriding licenses using semver ranges ([ba700d8](https://github.com/codepunkt/rollup-license-plugin/commit/ba700d8d546d3692f0bca1ed43382e1a9e22b167))

### 🐛 Bug Fixes

* version parsing for scoped packages ([eccb6f8](https://github.com/codepunkt/rollup-license-plugin/commit/eccb6f89fd4a1c79628aeef3304fe0fbf2128011))

### ⚙️ CI

* adjust node versions used for testing ([14db846](https://github.com/codepunkt/rollup-license-plugin/commit/14db846e6d63468ee6d08ffbaab74b232684549d))

# 3.0.2

- Change default branch used to replenish licenses from to `main` (thanks to [@mzedel](https://github.com/mzedel))

# 3.0.1

- Update file paths to use forward slashes for windows (thanks to @alan-agius4)

# 3.0.0

- Support for node 16 removed
- Update dependencies

# 2.0.1

- Publish only required files to NPM

# 2.0.0

- Support for node 14 removed
- Update dependencies

# 1.0.0

- Initial release
