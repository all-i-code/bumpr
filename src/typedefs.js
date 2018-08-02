// ==========================================================================================================
// Configuration
// ==========================================================================================================

/**
 * The CI Env config
 * @typedef CiEnv
 *
 * @property {String} buildNumber - the environment variable that will hold the build number
 * @property {String} prNumber - the environment variable that will hold the PR number (if it's a PR build)
 */

/**
 * The git user
 * @typedef GitUser
 *
 * @property {String} email - the github user email to use for commits
 * @property {String} name - the github user name to use for commits
 */

/**
 * The CI (continuous integration) config
 * @typedef CiConfig
 *
 * @property {String} buildNumber - the number of the build (in a string) pulled from the env
 * @property {CiEnv} env - the environment variables used by the CI system
 * @property {GitUser} gitUser - the user to configure git with for making commits
 * @property {String} provider - the CI provider (one of "travis" or "teamcity" for now)
 */

/**
 * The configuration that is computed at runtime based on other options/env in .pr-bumper.json
 * @typedef ComputedConfig
 *
 * @property {Object} ci - the wrapper for the CI computed config
 * @property {String} ci.buildNumber - the identifier for the current build
 * @property {String} ci.branch - the branch being built, or targeted by the pr build
 * @property {Boolean} ci.isPr - true if this is a PR build
 * @property {String} ci.prNumber - the number of the PR
 * @property {Object} vcs - the wrapper for VCS computed config
 * @property {VcsAuth} vcs.auth - the auth settings pulled from environment
 */

/**
 * The VCS Env config
 * @typedef VcsEnv
 *
 * @property {String} readToken - the name of the environment variable that holds the vcs read-only token
 * @property {String} writeToken - the name of the environment variable that holds the vcs read-write token
 */

/**
 * The Vcs config
 * @typedef VcsConfig
 *
 * @property {VcsAuth} auth - the auth info pulled from the env given
 * @property {String} domain - the domain for version control system (defaults to github.com for GitHub)
 * @property {VcsEnv} env - the environment variables that can be used to interact with the VCS
 * @property {String} provider - the VCS provider ("github", "bitbucket-server" or "github-enterprise" right now)
 * @property {Object} repository - wrapper for info about the repository
 * @property {String} repository.name - the name of the repository
 * @property {String} repository.owner - the organization/user/project that owns the repository
 */

/**
 * The config for all features
 * @typedef FeaturesConfig
 *
 * @property {Object} changelog - wrapper for the changelog feature
 * @property {Boolean} [changelog.enabled=false] - true if changelog feature is enabled
 * @property {String} [changelog.file='CHANGELOG.md'] - the file to use for changelog tracking
 *
 * @property {Object} comments - wrapper for the pr comments feature
 * @property {Boolean} [comments.enabled=false] - true if comments feature is enabled
 *
 * @property {Object} maxScope - the wrapper for the max bump scope feature
 * @property {Boolean} [maxScope.enabled=false] - true if the feature is enabled
 * @property {String} [maxScope.value='major'] - the maximum scope allowed when the feature is enabled
 */

/**
 * The function to check if a feature is enabled
 * @typedef {Function} isEnabledFunc
 *
 * @param {String} featureName - the name of the feature to check for
 * @returns {Boolean} true if the feature is enabled, else false
 */

/**
 * The configuration object that can be customized with .pr-bumper.json
 * @typedef Config
 *
 * @property {CiConfig} ci - the CI build configuration
 * @property {ComputedConfig} computed - the wrapper for all config options computed from env
 * @property {FeaturesConfig} features - the wrapper for all feature configuration
 * @property {VcsConfig} vcs - the VCS configuration
 *
 * @property {isEnabledFunc} isEnabled - check if a given feature is enabled
 */

// ==========================================================================================================
// Version Control
// ==========================================================================================================

/**
 * The representation of a commit within the GitHub API
 * @typedef GitHubCommit
 * @property {String} sha - the SHA hash for the commit
 */

/**
 * The shape of the PR pulled from GitHub's `/repos/:owner/:repo/pulls` API
 * {@link https://developer.github.com/v3/pulls/}
 *
 * @typedef GitHubPullRequest
 * @property {Number} number - the PR #
 * @property {String} body - the description of the PR
 * @property {String} html_url - the URL for the web interface of the PR
 * @property {GitHubCommit} head - representation of the tip commit from the branch being merged
 * @property {GitHubCommit} base - representation of the tip commit from the branch being merged into
 */

/**
 * Generic Pull Request representation
 *
 * @typedef PullRequest
 * @property {Number} number - the PR #
 * @property {String} description - the description of the PR
 * @property {String} url - the URL for the web interface of the PR
 */

/**
 * Generic Pull Request info (used for updating package.json and CHANGELOG.md files)
 *
 * @typedef PrInfo
 * @property {String} changelog - the changelog text
 * @property {Number} number - the PR #
 * @property {String} scope - the scope of the PR
 * @property {String} url - the URL for the web interface of the PR
 * @property {String} version - the new version after bumping based on scope
 */

/**
 * A Promise that will be resolved with a PullRequest
 *
 * @typedef PrPromise
 */

/**
 * Generic interface for a version control system (i.e. github.com)
 *
 * @interface Vcs
 */

/**
 * Sometimes, based on the CI system, one might need to create a git remote to
 * be able to push, this method provides a hook to do just that.
 *
 * @function
 * @name Vcs#addRemoteForPush
 * @return Promise - a promise resolved with the result of the git command
 */

/**
 * Get the given PR from the vcs system
 *
 * @function
 * @name Vcs#getPr
 * @param {String} prNumber - the number of the pull request being fetched
 * @return PrPromise - a promise resolved with a pull request object
 */

// ==========================================================================================================
// Continuous Integration
// ==========================================================================================================

/**
 * Generic interface for a CI system (i.e. travis)
 *
 * @interface Ci
 */

/**
 * Add changed files
 *
 * @function
 * @name Ci#add
 * @param {String[]} files - the files to add
 * @returns {Promise} - a promise resolved with result of git commands
 */

/**
 * Commit local changes
 *
 * @function
 * @name Ci#commit
 * @param {String} summary - the git commit summary
 * @param {String} message - the detailed commit message
 * @returns {Promise} - a promise resolved with result of git commands
 */

/**
 * Push local changes to the remote server
 *
 * @function
 * @name Ci#push
 * @returns {Promise} - a promise resolved with result of git commands
 */

/**
 * Setup the local git environment (make sure you're in a proper branch, with proper user attribution, etc
 *
 * @function
 * @name Ci#setupGitEnv
 * @returns {Promise} - a promise resolved with result of git commands
 */

/**
 * Create a local tag
 *
 * @function
 * @name Ci#tag
 * @param {String} name - the name of the tag to create
 * @returns {Promise} - a promise resolved with result of git commands
 */
