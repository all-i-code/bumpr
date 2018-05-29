# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!--
  The bumpr comment below is there to make it easier to update this changelog using a machine during PR merge.
  Please do not remove it, as this will break continuous integration.
-->

<!-- bumpr -->

## [1.4.4] - 2018-05-29
### Fixed
- `slack` feature to properly parse `bumpr` log file for required info. 


## [1.4.3] - 2018-05-29
### Fixed
- `publish` command to actually, you know, publish the package again.


## [1.4.2] - 2018-05-29 (Unpublished)
### Added
- `VERBOSE` flag when doing `publish` command in this project
### Changed
- Logging message when log file not found to be distinct from message when scope not found within log.


## [1.4.1] - 2018-05-29 (Unpublished)
### Added
- Additional logging to make debugging failed `publish` easier


## [1.4.0] - 2018-05-29 (Unpublished)
### Added
- `slack` feature, which allows sending a slack message to a configured set of channels after a `publish` command is executed. Since this only affects `publish`, it only works when `logging` is also configured. You specify the URL for the slack webhook in an environment variable (default `SLACK_URL`.


## [1.3.0] - 2018-05-25
### Added
- Support for circleci.com (via the `circle` option in `ci.provider`)

## [1.2.1] - 2018-05-25
### Fixed
- `publish` command to properly wrap `NPM_TOKEN` env var in generated `.npmrc` file.


## [1.2.0] - 2018-05-25
### Added
- `publish` command with previous contents of `scripts/maybe-publish.sh` script

### Removed
- `scripts/maybe-publish.sh` (replaced with `publish` command on the `bumpr` cli) Technically breaking again, but no one using yet still. Should be the last breaking change in 1.x.


## [1.1.0] - 2018-05-25
### Changed
- Default read-only github token env variable from `RO_GH_TOKEN` to `GITHUB_READ_ONLY_TOKEN`. Technically a breaking change, but since 1.x was only released yesterday, I think we're OK.


## [1.0.2] - 2018-05-24
### Fixed
- Publish script (to include `--new-version`)
- PR Template (removed extra newline)


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
