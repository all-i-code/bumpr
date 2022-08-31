# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!--
  The bumpr comment below is there to make it easier to update this changelog using a machine during PR merge.
  Please do not remove it, as this will break continuous integration.
-->

<!-- bumpr -->

## [2.13.3] - 2022-08-31 ([PR 63](https://github.com/all-i-code/bumpr/pull/63))
### Security
- Update `moment-timezone`

## [2.13.2] - 2022-06-02 ([PR 61](https://github.com/all-i-code/bumpr/pull/61))
### Fixed
- Importing of Node packages



## [2.13.1] - 2022-04-21 ([PR 59](https://github.com/all-i-code/bumpr/pull/59))
### Security
- Removed unused dependency, `nlf` to stop requiring old, compromised version of `minimist`

## [2.13.0] - 2022-04-19 ([PR 57](https://github.com/all-i-code/bumpr/pull/57))
### Changed
- Default branch name when there's no CI branch env variable (from `master` to `config.repository.defaultBranch` or `main`). 
### Security
- Updated dependencies to resolve `dependabot` issues

## [2.12.0] - 2022-02-22 ([PR 55](https://github.com/all-i-code/bumpr/pull/55))
### Added
- new `bumpr info` command to write out a log file from a merged PR


## [2.11.1] - 2021-06-25 ([PR 51](https://github.com/all-i-code/bumpr/pull/51))
### Changed
- Dependencies to latest available version
- Some code style to match latest `eslint` defaults



## [2.11.0] - 2021-06-25 ([PR 48](https://github.com/all-i-code/bumpr/pull/48))
### Added
-   New optional `required` option in changelog config to ensure changelog matches a list of regular expressions (ie to ensure proper links to tickets/issues exist)

## [2.10.0] - 2020-12-13 ([PR 44](https://github.com/all-i-code/bumpr/pull/44))
### Added
- Support for parsing `changelog` from a `dependabot` PR (using the title of the PR)


## [2.9.0] - 2020-12-13 ([PR 43](https://github.com/all-i-code/bumpr/pull/43))
### Added
- Support for Circle-ci PRs from non-forks (where `CIRCLE_PR_NUMBER` isn't set, but rather `CIRLCE_PULL_REQUEST` is set)


## [2.8.0] - 2020-12-13 ([PR 42](https://github.com/all-i-code/bumpr/pull/42))
### Added
- Support for parsing `dependabot` PR descriptions (currently treated as `patch`)



## [2.7.3] - 2020-12-11 ([PR 40](https://github.com/all-i-code/bumpr/pull/40))
### Fixed
- Repo URL references in code
### Security
- Updated dependencies

## [2.7.2] - 2019-07-09 ([PR 32](https://github.com/all-i-code/bumpr/pull/32))
### Removed
- Unused dev dependencies


## [2.7.1] - 2019-07-09 ([PR 31](https://github.com/all-i-code/bumpr/pull/31))
### Added
- Some additional logging when `VERBOSE` is set


## [2.7.0] - 2019-07-02 ([PR 30](https://github.com/all-i-code/bumpr/pull/30))
### Added
- `--num-extra-commits` option to `bumpr bump` commit in case CI scripts create additional commits before bumping versions.
- Some additional logging for when `VERBOSE` is set
- An explicit `maxBuffer` to `exec` when doing `npm publish .` as the `stderr` there seem to be kinda big.


## [2.6.0] - 2019-07-01 ([PR 29](https://github.com/all-i-code/bumpr/pull/29))
### Added
- `bumpr is-pr` command to check if a current build is a PR build



## [2.5.0] - 2019-04-18 ([PR 28](https://github.com/all-i-code/bumpr/pull/28))
### Added
- Support for GitHub Release creation during a `bump` or `tag` command ([#7](https://github.com/all-i-code/bumpr/issues/7))


## [2.4.0] - 2019-03-31 ([PR 27](https://github.com/all-i-code/bumpr/pull/27))
### Added
-   Support for `git+ssh://git@github.com/<owner>/<repo>` URL in `package.json`'s `repository.url` attribute to avoid #26

## [2.3.1] - 2018-10-05 ([PR 25](https://github.com/all-i-code/bumpr/pull/25))
### Fixed
- `bumpr tag` command by setting up git environment before trying to create the tag



## [2.3.0] - 2018-10-05 ([PR 24](https://github.com/all-i-code/bumpr/pull/24))
### Added
- New `tag` CLI command to just create a `git` tag and push it, with no bumping



## [2.2.0] - 2018-09-04 ([PR 22](https://github.com/all-i-code/bumpr/pull/22))
### Added
-   Support for automatically parsing the Github repository owner and name out of the `repository` property in `package.json`

## [2.1.0] - 2018-08-02 ([PR 21](https://github.com/all-i-code/bumpr/pull/21))
### Added
- `timezone` feature, allowing users to configure the timezone `bumpr` uses when creating dates to add to changelog entries (Fixes [#17](https://github.com/all-i-code/bumpr/issues/17))
- Pull request author to slack message about new published version (Fixes [#20](https://github.com/all-i-code/bumpr/issues/20))
### Changed
- How `bumpr` detects the PR for a merge commit. Instead of parsing commit messages looking for "merge pull request #xyz" it now looks for a PR with a matching `merge_commit_sha` value. This should allow `bumpr` to support any kind of PR merge scheme supported by GitHub (Fixes [#16](https://github.com/all-i-code/bumpr/issues/16))
### Fixed
- Format of the log file generated by `bumpr` to actually match what's documented in `README.md`



## [2.0.0] - 2018-08-01 ([PR 19](https://github.com/all-i-code/bumpr/pull/19))
### Added
- [`cosmiconfig`](https://github.com/davidtheclark/cosmiconfig) support (Fixes [#15](https://github.com/all-i-code/bumpr/issues/15))
- A link to the PR that was merged to create a particular version in the section for that version `bumpr` adds to `CHANGELOG.md`

### Removed
- Support for `.bumpr.json` configuration file


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
