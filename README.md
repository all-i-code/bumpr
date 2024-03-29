[ci-img]: https://travis-ci.com/all-i-code/bumpr.svg?branch=main "Travis CI Build Status"
[ci-url]: https://travis-ci.com/all-i-code/bumpr

[npm-img]: https://img.shields.io/npm/v/bumpr.svg "NPM Version"
[npm-url]: https://www.npmjs.com/package/bumpr

[cov-img]: https://img.shields.io/badge/coverage-100%25-brightgreen.svg
[lic-img]: https://img.shields.io/npm/l/express.svg

# bumpr <br /> [![Travis][ci-img]][ci-url] ![cov-img] [![NPM][npm-img]][npm-url] ![lic-img]

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
  npm install -g bumpr@^2.0.0
  ```

The specific version range is important so that you don't pick up a breaking major version bump without meaning to,
for example in your CI script.

Alternatively, you can add `bumpr` as a `devDependency` in your project and use something like `npx`
or update your `PATH` to be able to execute it.

## Usage
You can check for the existence of a valid directive in the current (open) pr (during the pr build) by using

  ```bash
  bumpr check
  ```

You can perform the automated bump in the merge build by using:

  ```
  bumpr bump
  ```

If your CI script creates any other commits after the merge commit, you can inform `bumpr` by using the
`--num-extra-commits` flag. This allows `bumpr` to identify the PR merge commit which it uses to find info about
the PR that was merged (to determine the scope, etc.)

  ```
  bumpr bump --num-extra-commits=1
  ```

If you have some other CI script you want to run only in a PR build, you can check by using

  ```
  bumpr is-pr
  ```

This command will exit with a 0 exit code if the current build is a PR build, and a 1 if it is not. So you can have
a CI script like this:

  ```
  bumpr is-pr && echo "Do PR stuff"
  ```

or

  ```
  bumpr is-pr || echo "Do merge stuff"
  ```

If you have the `logging` feature enabled, you can output a specific key from the log file using:

  ```
  bumpr log <key>
  ```

If you'd like to conditionally publish you package (only if a non-none bump has occurred) you can do so using:

  ```
  bumpr publish
  ```

> **NOTE** `bumpr publish` assumes the existence of an `NPM_TOKEN` environment variable to function properly.

## Configuration
As of `2.0.0`, `bumpr` now uses [`cosmiconfig`](https://github.com/davidtheclark/cosmiconfig), so you can configure
`bumpr` using any method supported by `cosmiconfig`, but we'll refer to the configuration as `.bumprrc.js` in this
document.

If you're using Travis CI and public GitHub, `bumpr` will probably work well for you with very little in your
`.bumprrc.js`:

  ```js
  module.exports = {
  vcs: {
    repository: {
      name: 'bumpr', # <- Your repo name here
      owner: 'all-i-code' # <- Your organization name here
    }
  }
  ```

The following defaults will be used if omitted in `.bumperrc.js`:

  ```js
  {
    ci: {
      env: {
        branch: 'TRAVIS_BRANCH',
        buildNumber: 'TRAVIS_BUILD_NUMBER',
        prNumber: 'TRAVIS_PULL_REQUEST'
      },
      gitUser: {
        email: 'bumpr@domain.com',
        name: 'Bumpr'
      },
      provider: 'travis'
    },
    features: {
      changelog: {
        enabled: false,
        file: 'CHANGELOG.md',
        required: [],
      },
      comments: {
        enabled: false
      },
      dateFormat: {
        enabled: false,
        format: 'YYYY-MM-DD',
      },
      logging: {
        enabled: false,
        file: '.bumpr-log.json'
      },
      maxScope: {
        enabled: false,
        value: 'major'
      },
      release: {
        artifacts: '',
        description: '## Changelog\n{changelog}',
        enabled: false,
        name: '[{version}] - {date}',
      },
      slack: {
        enabled: false,
        env: {
          url: 'SLACK_URL'
        },
        channels: []
      },
      tag: {
        enabled: true,
        name: 'v{version}',
      },
      timezone: {
        enabled: false,
        zone: 'Etc/UTC'
      }
    },
    files: ['package.json'],
    vcs: {
      domain: 'github.com',
      env: {
        readToken: 'GITHUB_READ_ONLY_TOKEN',
        writeToken: 'GITHUB_TOKEN'
      },
      provider: 'github',
      repository: {
        name: '',
        owner: ''
      }
    }
  }
  ```

You'll notice the data in `.bumprrc.js` is separated into three top-level properties, `ci`, `features` and `vcs`.
[`ci`](#ci) and [`vcs`](#vcs) help `bumpr` work with your particular environment, while [`features`](#features)
allows you to enable and configure optional features within `bumpr`.

### `ci`
Holds all the information `bumpr` needs to interact with your continuous integration system.

#### `ci.env`
Defines the names of the environment variables that `bumpr` needs to find out information about the current build.
The default values are set based on `ci.provider`. When `ci.provider` is omitted, or set to the default of `travis`,
the `ci.env` values are defaulted as shown above. If the `ci.provider` is set to `circle` the `cei.env` defaults
will be:

```js
{
  branch: 'CIRCLE_BRANCH',
  buildNumber: 'CIRCLE_BUILD_NUM',
  prNumber: 'CIRCLE_PR_NUMBER'
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

#### <a name="variables"></a> Variables
Some features, like `release` and `tag` allow configuring name/descriptions. Those allow some variable substitution.
The following variables are available:

`changelog` - the changelog pulled out of the source PR of the release
`date` - the current date (respects the `dateFormat` and `timezone` features)
`links` - A collection of any markdown links that were present in the `changelog`
`pr.number` - the number of the source PR of the change
`pr.url` - the URL of the source PR of the change
`pr.user.login` - login name of the author of the source PR of the change
`pr.user.url` - profile URL of the author of the source PR of the change
`scope` - the semver scope of the source PR of the change
`version` - the semantic version of the release

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

This command will now also take all the content below the `## CHANGELOG` line (up to but not including an optional
`<!-- END CHANGELOG -->` comment) and insert it wherever the `<!-- bumpr -->` line is within your `CHANGELOG.md` file
(or whatever you've configured it to be named). It will give this new content a heading with the newly bumped version
number, along with the date (in ISO `yyyy-mm-dd` format, based on UTC timezone)

So, if your project is at version `1.2.3` and you have a PR (#123) description that looks like:

  ```gfm
  This is a new #feature#

  ## CHANGELOG
  ### Added
  - The ability to do fizz-bang
  ```

that is merged on January 15th, 2017, `bumpr` will insert the following into your changelog:

  ```gfm
  ## [1.3.0] - 2017-01-15 [PR 123](http://github.com/project/repo/pulls/123)
  ### Added
  - The ability to do fizz-bang
  ```

##### `features.changelog.enabled`
Set this value to `true` to enable changelog processing

##### `features.changelog.file`
The file to modify when adding the `## CHANGELOG` section of your pull request description (default is `CHANGELOG.md`).

##### `feature.changelog.requires`
A list of regular expression strings the changelog must match in order for `bumpr check` to pass. For example if you want to ensure your changelog contains ticket links in the form `[####](https://ticket.example.com/####)`, you could set it to:
```json
"required": ["\\[\d+]\(https:\\/\\/ticket.example.com\\/\d+\)"],
```

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

#### `features.dateFormat`
Allows you to customize the date format used by `bumpr` whenever a date string is created.
Currently, `moment` is used to format the date string, so any valid `moment` format string is valid.

##### `features.dateFormat.enabled`
Set to `true` in order to specify a custom date format, otherwise `YYYY-MM-DD` will be used.

##### `features.dateFormat.format`
Any `moment` format is valid to use here to customize the date string format that `bumpr` will use.

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
    "url": "https://github.com/all-i-code/bumpr/pull/123",
    "user": {
      "login": "job13er",
      "url": "https://github.com/job13er"
    },
  },
  "scope": "minor",
  "version": "1.3.0"
}
```

- `changelog` - The full text of the changelog that was added during this `bump`
- `pr.number` - The pull request number that was merged for this `bump`
- `pr.url` - The URL for the pull request that was merged for this `bump`
- `pr.user.login` - The username of the user who created the pull request that was merged for this `bump`
- `pr.user.url` - The profile URL of the user who created the pull request that was merged for this `bump`
- `scope` - the scope of the `bump` performed
- `user.login` - the scope of the `bump` performed
- `version` - the new version after the `bump`

##### `features.logging.enabled`
Set this value to `true` to enable the creation of the log file during a `bump`.

##### `features.logging.file`
The name of the file to create after a `bump`, the contents of the file will be `json` regardless of the name of
the file given here.

#### `features.release`
Create a VCS release after creating a git tag. The `name` and `description` options allow some variable substitution.

##### `features.release.enabled`
Set this value to `true` to enable creating a release in your VCS after creating a tag.

##### `features.release.artifacts`
Directory name of any assets you want included in the VCS release that is created.

##### `features.release.description`
The description to use for the VCS release that is created. You can include [variables](#variables) in curly braces.
The default value is `'## Changelog\n{changelog}'`

##### `features.release.name`
The name to use for the VCS release that is created. You can include [variables](#variables) in curly braces.
The default value is `'[{version}] - {date}'`

#### `features.slack`
Send a message in slack detailing the change that `bumpr` just published. The message will be sent after the `publish`
command completes.

- `changelog` - The full text of the changelog that was added during this `bump`
- `pr.number` - The pull request number that was merged for this `bump`
- `pr.url` - The URL for the pull request that was merged for this `bump`
- `scope` - the scope of the `bump` performed
- `version` - the new version after the `bump`

##### `features.slack.enabled`
Set this value to `true` to enable the sending of slack messages after publish

##### `features.slack.env.url`
The name of the environment variable that holds the URL for your slack webhook.

##### `features.slack.channels`
An array of channels. The message will be sent to each one individually, using the `channel` property in the slack
message JSON body. If no channels are given, only a single message will be sent, with no `channel` property, and so
the default channel for the webhook will be used.

#### `features.tag`
Create a git tag when bumping versions. By default, `bumpr` will create a git tag when bumping versions. This
can conflict with some other tools, like `lerna`, and so we allow you to disable this functionality.

##### `features.tag.enabled`
Set this value to `true` to enable creating a git tag.

##### `features.tag.name`
Customize the name of the tag created. You can use [variables](#variables) in curly braces. The default value is:
`'v{version}'`

#### `features.timezone`
Report dates in changelog based on a given timezone. By default, `bumpr` uses the UTC timezone to figure out what
date a version is being published. When enabled, this feature allows you to configure a timezone to use to determine
the date.

##### `features.timezone.enabled`
Set this value to `true` to enable overriding the timezone used by `bumpr` when computing the date string to add into
your changelog.

##### `features.timezone.zone`
The timezone to use. You can use any time zone name supported by [`moment-timezone`](https://momentjs.com/timezone/).
For example, `America/Los_Angeles`, `America/Denver`, or `America/New_York`

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
requests to find out information about pull requests. Since we need to be able to access `GITHUB_READ_ONLY_TOKEN`
during a PR build, it cannot be encrypted, and thus will not be private. See [travis docs][env-docs] for more info
about encrypted environment variables.

> **NOTE** Since `GITHUB_READ_ONLY_TOKEN` is not secure, it is printed directly into your Travis Logs!!!
> So, make sure it has only read access to your repository. Hence the name `GITHUB_READ_ONLY_TOKEN`

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

##### `vcs.repository.defaultBranch`
The name of the default branch of the repository (default is `main`)

##### `vcs.repository.name`
The name of the repository

##### `vcs.repository.owner`
The name of the organization that holds your repository
