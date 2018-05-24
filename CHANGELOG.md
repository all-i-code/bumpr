# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!--
  The bumpr comment below is there to make it easier to update this changelog using a machine during PR merge.
  Please do not remove it, as this will break continuous integration.
-->

<!-- bumpr -->

## [1.0.1] - 2018-05-24

### Fixed
- `changelog` feature to add the `<!-- bumpr -->` comment back in the `CHANGELOG.md` file so it can be replaced again next build. 
- Line endings of `changelog` contents read from GitHub


## [1.0.0] - 2018-05-24

### Added
- Support for [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) format.
- `log` command which outputs a particular key from a previously created `bumpr` log file
- `scripts/maybe-publish.sh` script which checks `bumpr` log and runs `yarn publish` if:
   - A `bumpr` log file is found
   - The `bumpr` log has a `scope` of something other than `none`
### Changed
- Package name from `pr-bumper` to `bumpr`
- Pull request template to be simpler
### Removed
- Code coverage tracking
- Dependency snapshot creation
- Dependency compliance
- Issue template
- Code owners
- All `.travis/` scripts

## [0.1.0] - 2018-05-24
### Added
- All initial content from `pr-bumper@3.7.1`
