[ci-img]: https://img.shields.io/travis/jobsquad/bumpr.svg "Travis CI Build Status"
[ci-url]: https://travis-ci.org/jobsquad/bumpr

[npm-img]: https://img.shields.io/npm/v/bumpr.svg "NPM Version"
[npm-url]: https://www.npmjs.com/package/bumpr

# bumpr <br /> [![Travis][ci-img]][ci-url] [![NPM][npm-img]][npm-url]

Originally copied from [`pr-bumper@3.7.1`](https://github.com/ciena-blueplanet/pr-bumper).
This project was created to simplify code and configuration.

Use text from a pull request description to automatically bump the version number of a project upon merge.
`bumpr` performs three main tasks:
 1. Check if an open pull request has the appropriate version bump scope in its description.
 1. Update the version of any JSON file which includes a `version` key (default is `package.json`)
    when a pull request is merged based on the scope from the pull request.
 1. Create a tag of the new version after the bump commit.

There are also a number of additional tasks that can be enabled by setting the appropriate values in `.bumpr.json`
See [below](#features) for more info on the available optional features.

## Pull Requests
`bumpr` uses [Semantic Versioning](http://semver.org/).

Pull request descriptions must include a directive indicating the scope of the change being made
(`major`/`minor`/`patch`/`none`). Directives are **case insensitive** and wrapped in `#`


In addition, `pre-release` tags on versions are supported, but only for the `patch` or `none` scope. When using
`minor` or `major` with a `pre-release` tag, the `pre-release` tag will be cleared.

**NOTE** `bumpr` never *introduces* a pre-release tag, it only supports an existing pre-release tag. If you want
to use a pre-release tag, you'll need to add it manually as part of your PR,
then `bumpr` will be able to do a `patch` bump to increment the last number in the pre-release for you.

| Starting Version | Directive | Ending Version |
| :--------------- | :-------- | :------------- |
| 1.2.3            | `#none#`  | 1.2.3          |
| 1.2.3-alpha.4    | `#none#`  | 1.2.3-alpha.4  |
| 1.2.3            | `#patch#` | 1.2.4          |
| 1.2.3-alpha.4    | `#patch#` | 1.2.3-alpha.5  |
| 1.2.3-a.b.9      | `#patch#` | 1.2.3-a.b.10   |
| 1.2.3            | `#minor#` | 1.3.0          |
| 1.2.3-alpha.4    | `#minor#` | 1.3.0          |
| 1.2.3            | `#major#` | 2.0.0          |
| 1.2.3-alpha.4    | `#major#` | 2.0.0          |


[gfm-checklist-url]: https://github.com/blog/1375-task-lists-in-gfm-issues-pulls-comments
[pr-template-url]: https://github.com/blog/2111-issue-and-pull-request-templates

### GFM Checklist support
You may also specify a list of possible scopes in a [GFM checklist][gfm-checklist-url]
 Example:

 ### This project uses [semver](semver.org), please check the scope of this pr:
 - [ ] #none# - documentation fixes and/or test additions
 - [ ] #patch# - backwards-compatible bug fix
 - [ ] #minor# - adding functionality in a backwards-compatible manner
 - [x] #major# - incompatible API change

Combined with [Pull Request Templates][pr-template-url], contributors who are unfamiliar with `bumpr`
will know exactly what to do before the build fails.

## Integrations
[github-url]: https://github.com
[travis-url]: https://travis-ci.org
[circle-url]: https://circelci.com

`bumpr` currently supports pull requests on [GitHub][github-url]

It is also optimized to work with [Travis CI][travis-url] out-of-the box, but can be configured to work with
[CircleCI][circle-url] as well using the [`.bumpr.json`](#bumprjson) config file.

## Installation

  ```bash
  npm install -g bumpr@^1.0.0
  ```

The specific version range is important so that you don't pick up a breaking major version bump without meaning to,
for example in your CI script.

## Usage
You can check for the existence of a valid directive in the current (open) pr (during the pr build) by using

  ```bash
  bumpr check
  ```

You can perform the automated bump in the merge build by using:

  ```
  bumpr bump
  ```

## Configuration
If you're using Travis CI and public GitHub, `bumpr` will probably work well for you with very little in your
`.bumpr.json`:

  ```json
  {
    "vcs": {
      "repository": {
        "name": "bumpr", # <- Your repo name here
        "owner": "jobsquad" # <- Your organization name here
      }
    }
  }
  ```

The following defaults will be used if omitted in `.bumper.json`:

  ```json
  {
    "ci": {
      "env": {
        "branch": "TRAVIS_BRANCH",
        "buildNumber": "TRAVIS_BUILD_NUMBER",
        "prNumber": "TRAVIS_PULL_REQUEST"
      },
      "gitUser": {
        "email": "bumpr@domain.com",
        "name": "Bumpr"
      },
      "provider": "travis"
    },
    "features": {
      "changelog": {
        "enabled": false,
        "file": "CHANGELOG.md"
      },
      "comments": {
        "enabled": false
      },
      "maxScope": {
        "enabled": false,
        "value": "major"
      },
      "logging": {
        "enabled": false,
        "file": "bumpr-log.json"
      }
    },
    "files": ['package.json'],
    "vcs": {
      "domain": "github.com",
      "env": {
        "readToken": "RO_GH_TOKEN",
        "writeToken": "GITHUB_TOKEN"
      },
      "provider": "github",
      "repository": {
        "name": "",
        "owner": ""
      }
    }
  }
  ```

You'll notice the data in `.bumpr.json` is separated into three top-level properties, `ci`, `features` and `vcs`.
[`ci`](#ci) and [`vcs`](#vcs) help `bumpr` work with your particular environment, while [`features`](#features)
allows you to enable and configure optional features within `bumpr`.

### `ci`
Holds all the information `bumpr` needs to interact with your continuous integration system.

#### `ci.env`
Defines the names of the environment variables that `bumpr` needs to find out information about the current build.
The default values are set based on `ci.provider`. When `ci.provider` is omitted, or set to the default of `travis`,
the `ci.env` values are defaulted as shown above. If the `ci.provider` is set to `circle` the `cei.env` defaults
will be:

```json
{
  "branch": "CIRCLE_BRANCH",
  "buildNumber": "CIRCLE_BUILD_NUM",
  "prNumber": "CIRCLE_PR_NUMBER"
}
```

##### `ci.env.branch`
The name of the environment variable that holds the current branch being built on a merge build.

The default is `TRAVIS_BRANCH` when using a `ci.provider` of `travis` and `CIRCLE_BRANCH` when using a `ci.provider`
of `circle`. Both are already set for you within those two systems.


##### `ci.env.buildNumber`
The name of the environment variable that holds the number of the current build.

The default is `TRAVIS_BUILD_NUMBER` when using a `ci.provider` of `travis`, and `CIRCLE_BUILD_NUM` when using a
`ci.provider` of `circle`. Both are already set for you within those two systems.

##### `ci.env.prNumber`
The name of the environment variable that holds the number of the pull request on a pr build. It can be empty or
include `false` to indicate a merge (non PR) build.

The default is `TRAVIS_PULL_REQUEST` when using a `ci.provider` of `travis`, and `CIRCLE_PR_NUMBER` when using a
`ci.provider` of `circle`. Both are already set for you within those two systems.

#### `ci.gitUser`
Information about the git user that will be used by `bumpr` to make the version bump commit and create the tag
for the release.

##### `ci.gitUser.email`
You guessed it, the email address of the git user.

##### `ci.gitUser.name`
Surprisingly enough, the name of the git user.

#### `ci.provider`
`bumpr` currently supports `travis` (the default) and `circle`.

### `features`
Holds individual properties for configuring optional features of `bumpr`. None of them are enabled by default.

#### `features.changelog`
`bumpr` includes support for managing your `CHANGELOG.md` file for you. When this feature is enabled (by setting
`config.features.changelog.enabled` to `true`) `bumpr` augments the behavior of some of its commands.

  ```bash
  bumpr check
  ```

This command will now also check the PR description for the existence of a `## CHANGELOG` section (case insensitive),
and throw an error if one is not found. It will also check your `CHANGELOG.md` (or whatever file is configured in
`.bumpr.json`) for the existence of a `<!-- bumpr -->` line, and throw an error if one is not found. This line
is necessary to identify where `bumpr` should insert the changelog stanza it grabbed from the PR description.

  ```bash
  bumpr bump
  ```

This command will now also take all the content below the `## CHANGELOG` line, and insert it wherever the
`<!-- bumpr -->` line is within your `CHANGELOG.md` file (or whatever you've configured it to be named).
It will give this new content a heading with the newly bumped version number, along with the date
(in ISO `yyyy-mm-dd` format, based on UTC timezone)

So, if your project is at version `1.2.3` and you have a PR description that looks like:

  ```gfm
  This is a new #feature#

  ## CHANGELOG
  ### Added
  - The ability to do fizz-bang
  ```

that is merged on January 15th, 2017, `bumpr` will insert the following into your changelog:

  ```gfm
  ## [1.3.0] - 2017-01-15
  ### Added
  - The ability to do fizz-bang
  ```

##### `features.changelog.enabled`
Set this value to `true` to enable changelog processing

##### `features.changelog.file`
The file to modify when adding the `## CHANGELOG` section of your pull request description (default is `CHANGELOG.md`).

#### `features.comments`
`bumpr` has the ability to post comments to the pull request in certain scenarios. Unfortunately, due to the fact
that posting comments requires write permissions, and Travis CI does not allow access to secure environment variables
during pull request builds (for good reason), posting comments to pull requests is not supported when using Travis CI.

If anyone has any ideas on how to make that work, permission-wise, we'd love to add that support.

For all others (which for now is just CircleCI or non-fork PRs), one can enable posting pull request comments by
setting `features.comments.enabled` to `true`.

When that flag is set, `bumpr` will post comments to pull requests in the following situations:

- If `bumpr check` fails because there is no valid PR scope is found in the PR description.
- If `bumpr check` fails because there is no `## CHANGELOG` section is found in the PR description
   (only if `features.changelog.enabled` is `true`)
- If `bumpr check` fails because there is no `<!-- bumpr -->` line found in your changelog file
    (only if `features.changelog.enabled` is `true`)

##### `features.comments.enabled`
Set this value to `true` to enable PR comments (everywhere but Travis CI for PRs from forks)

#### `features.maxScope`
Make sure not to accept bumps of a higher scope than you want. Ideal for maintenance branches, to prevent a `major`
bump that would conflict with the main branch. The order from least to greatest of scopes is:
 * `none`
 * `patch`
 * `minor`
 * `major`

So, if `features.maxScope.value` is `major` (the default), all bumps are allowed.
If `features.maxScope.value` is `patch`, only `none` and `patch` are allowed. You get the idea.

##### `features.maxScope.enabled`
Set this value to `true` to enable the max scope check.

##### `features.maxScope.value`
The value to use for the maximum scope (default is `major`), must be one of [`major`, `minor`, `patch`, `none`]

#### `features.logging`
Log what `bumpr` does during a `bump` to a file, so the information can be used by another tool later on.

The log file that will be created will look something like this:

```json
{
  "changelog": "### Added\n- Some cool new feature",
  "pr": {
    "number": 123,
    "url": "https://github.com/jobsquad/bumpr/pull/123"
  },
  "scope": "minor",
  "version": "1.3.0",
}
```

- `changelog` - The full text of the changelog that was added during this `bump`
- `pr.number` - The pull request number that was merged for this `bump`
- `pr.url` - The URL for the pull request that was merged for this `bump`
- `scope` - the scope of the `bump` performed
- `version` - the new version after the `bump`

##### `features.logging.enabled`
Set this value to `true` to enable the creation of the log file during a `bump`.

##### `features.logging.file`
The name of the file to create after a `bump`, the contents of the file will be `json` regardless of the name of
the file given here.

### `vcs`
Holds all the information `bumpr` needs to interact with your version control system.

#### `vcs.domain`
The domain of your VCS. This would be `github.com` (the default) if using public github, or the domain of your
private GitHub Enterprise.

#### `vcs.env`
Holds the names of environment variables `bumpr` uses to interact with your VCS.

##### `vcs.env.readToken`
[env-docs]: https://docs.travis-ci.com/user/environment-variables/#Encrypted-Variables
The name of the environment variable that holds the read only access token to use when accessing the GitHub API.
While one can access the GitHub API just fine without a token, there are rate-limits imposed on anonymous API requests.
Since those rate-limits are based on the IP of the requester, you'd be sharing a limit with anyone else building in
your CI, which, for Travis CI, could be quite a few people. So, if you specify a `vcs.env.readToken` and
set the corresponding environment variable in your CI environment, `bumpr` will use that token when making API
requests to find out information about pull requests. Since we need to be able to access `RO_GH_TOKEN` during a PR
build, it cannot be encrypted, and thus will not be private. See [travis docs][env-docs] for more info about encrypted
environment variables.

> **NOTE** Since `RO_GH_TOKEN` is not secure, it is printed directly into your Travis Logs!!!
> So, make sure it has only read access to your repository. Hence the name `RO_GH_TOKEN` (Read Only GitHub Token)

##### `vcs.env.writeToken`
The name of the environment variable that holds the write access token to use when pushing commits to your vcs
(specifically GitHub). Since this environment variable stores a token with write access to your repository, it must
be encrypted. The default value is `GITHUB_TOKEN`. Here's an example of how you can encrypt a `GITHUB_TOKEN` into your
`.travis.yml` for use in Travis CI. If you have a private CI, you can probably just configure the environment variable.

[github-pat]: https://help.github.com/articles/creating-an-access-token-for-command-line-use/
In case you're unfamiliar, GitHub allows users to create [Personal Access Tokens][github-pat] to allow various levels
of access to external systems. The `public_repo` access is sufficient for `bumpr` to be able to push commits and
create tags on your behalf. You'll want to create this token on whatever GitHub user you want to be responsible for
your version bump commits and automatic release tags. Once you've got a Personal Access Token with the correct
permissions, you'll want to encrypt it into `.travis.yml` to let it be accessible in your merge builds, but not
publicly available.

You can do so by using the [Travis Client](https://github.com/travis-ci/travis.rb) to `travis encrypt` your token.

First, you'll need to authenticate with `travis` (you can use the same token for that)

  ```bash
  travis login --github-token <your-token>
  travis encrypt GITHUB_TOKEN=<your-token> --add -r <owner>/<repo>
  ```

If you do not use a fork workflow and your `origin` is the main repository, you can skip the `-r <owner>/<repo>` part.
Otherwise, replace the `<owner>/<repo>` with the organization and name of your `upstream` repository.

If no token is found in the environment variable pointed to by `vcs.env.writeToken`, `bumpr` will assume you're using
ssh keys which have proper permissions and will not use any token.

#### `vcs.provider`
`bumpr` currently supports only a single VCS provider: `github` (the default)

#### `vcs.repository`
Holds info about the name and organization of the repository.

##### `vcs.repository.name`
The name of the repository

##### `vcs.repository.owner`
The name of the organization that holds your repository
