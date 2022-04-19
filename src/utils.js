/* eslint no-useless-escape: 0 */

require('./typedefs')

const {cosmiconfig} = require('cosmiconfig')
const fs = require('fs')
const path = require('path')
const {get, isArray, isObject, set} = require('lodash')

const {Logger} = require('./logger')

const GFM_CHECKBOX_CHECKED_REGEX = /(-|\*)\s+\[x\].*?#(\w+)#/gi
const GFM_CHECKBOX_UNCHECKED_REGEX = /(-|\*)\s+\[\s\].*?#(\w+)#/gi
const DEPENDABOT_IDENTIFIER = '<summary>Dependabot commands and options</summary>'

/**
 * Walk the properties of an object (recursively) while converting it to a flat representation of the leaves of the
 * object (properties with primitive, non-object types which need their default value set).
 * representing the leaves (the actual values that need defaults)
 * @param {String} prefix - the key prefix for the object being processed
 * @param {Object} object - the complex, nested object of default values currently being processed
 * @param {Object} leaves - the simple key-value mapping of object path -> value
 */
function walkObject(prefix, object, leaves) {
  Object.keys(object).forEach((key) => {
    const value = object[key]
    const fullPrefix = prefix ? `${prefix}.${key}` : key
    if (isObject(value) && !isArray(value)) {
      walkObject(fullPrefix, value, leaves)
    } else {
      leaves[fullPrefix] = value // eslint-disable-line no-param-reassign
    }
  })
}

/**
 * Given a PR description, find the index of the # CHANGELOG section
 * @param {String[]} lines - lines in the pr description
 * @returns {Number} the index of the # CHANGELOG section (or -1)
 * @throws Error if there is more than one matching line
 */
function getChangelogSectionIndex(lines) {
  const validSectionHeaders = ['##changelog', '## changelog']

  let index = -1
  for (let i = 0; i < lines.length; i += 1) {
    const processedLine = lines[i].trim().toLowerCase()
    if (validSectionHeaders.indexOf(processedLine) !== -1) {
      if (index !== -1) {
        throw new Error(`Multiple changelog sections found. Line ${index + 1} and line ${i + 1}.`)
      }
      index = i
    }
  }

  return index
}

/**
 * Get the given key from process.env, substituting "undefined" for the real undefined
 * @param {String} key - the environment variable we want to get
 * @param {*} defaultValue - value to return if key not in env, or if it is 'undefined'
 * @returns {*} whatever is at process.env[key] with the one exception of "undefined" being translated to undefined
 */
function getEnv(key, defaultValue) {
  let value = process.env[key]
  if (value === 'undefined') {
    value = undefined
  }

  return value === undefined ? defaultValue : value
}

function throwIfInvalidScope(matches, prDescription, prLink, selectedScopes) {
  if (selectedScopes.length === 0) {
    const gfmCheckboxMatches = prDescription.match(GFM_CHECKBOX_UNCHECKED_REGEX)

    if (Array.isArray(gfmCheckboxMatches) && matches.length === gfmCheckboxMatches.length) {
      throw new Error(`No version-bump scope found for ${prLink}`)
    }
  }

  if (selectedScopes.length !== 1) {
    throw new Error(`Too many version-bump scopes found for ${prLink}`)
  }
}

/**
 * Process the environment variable sections in the config and fill in the computed properties within it
 * @param {Config} config - the config object to process (will be mutated in-place)
 */
function processEnv(config) {
  // Grab the CI stuff from env
  /* eslint-disable no-param-reassign */
  config.computed.ci.buildNumber = getEnv(config.ci.env.buildNumber)
  config.computed.ci.prNumber = getEnv(config.ci.env.prNumber, 'false')

  // If no prNumber, check prUrl (some CIs don't have prNumber on branch builds)
  if (config.computed.ci.prNumber === 'false') {
    const parts = getEnv(config.ci.env.prUrl, '').split('/')
    if (parts.length > 1) {
      config.computed.ci.prNumber = parts[parts.length - 1] || 'false'
    }
  }

  config.computed.ci.isPr = config.computed.ci.prNumber !== 'false'
  config.computed.ci.branch = getEnv(config.ci.env.branch, config.vcs.repository.mainBranch)

  // Grab slack URL from env (if feature enabled)
  if (config.features.slack.enabled) {
    config.computed.slackUrl = getEnv(config.features.slack.env.url)
  }

  Logger.log(`bumpr::config: prNumber [${config.computed.ci.prNumber}], isPr [${config.computed.ci.isPr}]`)

  // Grab the VCS stuff from the env
  config.computed.vcs.auth = {
    readToken: getEnv(config.vcs.env.readToken),
    writeToken: getEnv(config.vcs.env.writeToken),
  }
  /* eslint-enable no-param-reassign */
}

const utils = {
  /**
   * Read in the config from a file and apply defaults
   * @returns {Config} the config object
   */
  getConfig() {
    return cosmiconfig('bumpr')
      .search()
      .then((result) => {
        let config = {}
        if (result && result.config) {
          config = result.config // eslint-disable-line prefer-destructuring
        } else {
          Logger.log('No config file found, using defaults')
        }

        const leaves = {}
        const defaults = {
          ci: {
            env: {
              branch: 'TRAVIS_BRANCH',
              buildNumber: 'TRAVIS_BUILD_NUMBER',
              prNumber: 'TRAVIS_PULL_REQUEST',
              prUrl: '',
            },
            gitUser: {
              email: 'bumpr@domain.com',
              name: 'Bumpr',
            },
            provider: 'travis',
          },
          // This is where we put everything we calculate/compute based on other settings (@job13er 2017-06-16)
          computed: {
            ci: {
              buildNumber: '',
              branch: '',
              isPr: false,
              prNumber: '',
            },
            vcs: {
              auth: {
                readToken: '',
                writeToken: '',
              },
            },
          },
          features: {
            changelog: {
              enabled: false,
              file: 'CHANGELOG.md',
            },
            comments: {
              enabled: false,
            },
            maxScope: {
              enabled: false,
              value: 'major',
            },
            logging: {
              enabled: false,
              file: '.bumpr-log.json',
            },
            release: {
              enabled: false,
              artifacts: '',
            },
            slack: {
              enabled: false,
              env: {
                url: 'SLACK_URL',
              },
              channels: [],
            },
            timezone: {
              enabled: false,
              zone: 'Etc/UTC',
            },
          },
          files: ['package.json'],
          vcs: {
            domain: 'github.com',
            env: {
              readToken: 'GITHUB_READ_ONLY_TOKEN',
              writeToken: 'GITHUB_TOKEN',
            },
            provider: 'github',
            repository: {
              mainBranch: 'main',
              name: '',
              owner: '',
            },
          },
        }

        walkObject('', defaults, leaves)
        Object.keys(leaves).forEach((key) => {
          const value = leaves[key]
          if (get(config, key) === undefined) {
            set(config, key, value)
          }
        })

        processEnv(config)

        /**
         * Check if given feature is enabled
         * @param {String} featureName - the name of the feature to check
         * @returns {Boolean} true if feature enabled, else false
         */
        config.isEnabled = function isEnabled(featureName) {
          return get(this, `features.${featureName}.enabled`) || false
        }

        return config
      })
  },

  /**
   * Make sure scope is one of 'patch', 'minor', 'major', 'none' (or their aliases)
   *
   * @param {Object} params - the params object
   * @param {String} params.scope - the scope to check
   * @param {String} params.maxScope - the maximum scope allowed
   * @param {String} params.prNumber - the # of the PR
   * @param {String} params.prUrl - the url of the PR
   * @returns {String} the validated scope
   * @throws Error if scope is invalid
   */
  getValidatedScope({maxScope = 'major', prNumber, prUrl, scope}) {
    const scopeWeights = {
      none: 1,
      patch: 2,
      minor: 3,
      major: 4,
    }

    const scopeWeight = scopeWeights[scope]
    const prStr = `PR #${prNumber} (${prUrl})`

    if (!scopeWeight) {
      throw new Error(`Invalid version-bump scope "${scope}" found for ${prStr}`)
    }

    if (scopeWeight > scopeWeights[maxScope]) {
      throw new Error(`Version-bump scope "${scope}" is higher than the maximum "${maxScope}" for ${prStr}`)
    }

    return scope
  },

  /**
   * Extract the scope string ('patch', 'minor', 'major', 'none') from the PR object
   * @param {PullRequest} pr - the PR object
   * @param {String} maxScope - the max valid scope
   * @returns {String} the scope of the PR (from the pr description)
   * @throws Error if there is not a single, valid scope in the PR description
   */
  getScopeForPr(pr, maxScope = 'major') {
    // First check for dependabot PR description
    if (pr.description.includes(DEPENDABOT_IDENTIFIER)) {
      return utils.getValidatedScope({
        scope: 'patch',
        maxScope,
        prNumber: pr.number,
        prUrl: pr.url,
      })
    }

    const matches = pr.description.match(/#[A-Za-z]+#/g)
    const prLink = `[PR #${pr.number}](${pr.url})`

    if (!matches) {
      const example = 'Please include a scope (e.g. `#major#`, `#minor#`, `#patch#`) in your PR description.'
      const exampleLink = 'See https://github.com/all-i-code/bumpr#pull-requests for more details.'
      throw new Error(`No version-bump scope found for ${prLink}\n${example}\n${exampleLink}`)
    }

    let scope

    if (matches.length > 1) {
      const selectedScopes = []
      let checkboxMatches = GFM_CHECKBOX_CHECKED_REGEX.exec(pr.description)
      while (checkboxMatches !== null) {
        selectedScopes.push(checkboxMatches[2])
        checkboxMatches = GFM_CHECKBOX_CHECKED_REGEX.exec(pr.description)
      }

      throwIfInvalidScope(matches, pr.description, prLink, selectedScopes)
      ;[scope] = selectedScopes
    } else {
      scope = matches[0].replace(/#/g, '')
    }

    return utils.getValidatedScope({
      scope: scope.toLowerCase(),
      maxScope,
      prNumber: pr.number,
      prUrl: pr.url,
    })
  },

  /**
   * Extract the changelog string from the PR object
   * @param {PullRequest} pr - the PR object
   * @param {String[]} required - regular expression patterns that changelog must match
   * @returns {String} the changelog of the PR (from the pr description, if one exists, else '')
   */
  getChangelogForPr(pr, required) {
    let changelog = ''

    // First check for dependabot PR description
    if (pr.description.includes(DEPENDABOT_IDENTIFIER)) {
      changelog = `### Security\n- [Dependabot] ${pr.name}`
    }

    const lines = pr.description.split('\n')
    const index = getChangelogSectionIndex(lines)

    if (index >= 0) {
      changelog = lines.slice(index + 1).join('\n')
    }

    if (changelog.trim() === '') {
      const link = 'https://github.com/all-i-code/bumpr#changelog'
      const msg =
        'No CHANGELOG content found in PR description.\n' +
        'Please add a `## CHANGELOG` section to your PR description with some content describing your change.\n' +
        `See ${link} for details.`
      throw new Error(msg)
    }

    required.forEach((pattern) => {
      if (!new RegExp(pattern).test(changelog)) {
        throw new Error(`Changelog does not match pattern: ${pattern}`)
      }
    })

    return changelog
  },

  /**
   * Maybe post a comment to the PR, if prComments is enabled
   * @param {Config} config - the bumper config
   * @param {Vcs} vcs - the vcs instance for the bumper
   * @param {String} msg - the message to post
   * @param {Boolean} isError - if true, prefix the msg with an ## ERROR heading
   * @returns {Promise} a promise resolved when success, rejected on error
   */
  maybePostComment(config, vcs, msg, isError) {
    if (!process.env.SKIP_COMMENTS && config.computed.ci.isPr && config.isEnabled('comments')) {
      const comment = isError ? `## ERROR\n${msg}` : msg
      return vcs.postComment(config.computed.ci.prNumber, comment).catch((err) => {
        const newMessage = `Received error: ${err.message} while trying to post PR comment: ${comment}`
        throw new Error(newMessage)
      })
    }

    return Promise.resolve()
  },

  /**
   * Maybe post a comment to the PR, if the function given throws an error, and prComments is enabled
   * @param {Object} config - the config for a bumper instance
   * @param {Vcs} vcs - the vcs instance for a bumper instance
   * @param {Function} func - the function to execute and check for errors on
   * @returns {Promise} a promise resolved if all goes well, rejected if an error is thrown
   */
  maybePostCommentOnError(config, vcs, func) {
    let ret
    try {
      ret = func()
    } catch (e) {
      if (config.computed.ci.isPr && config.isEnabled('comments')) {
        return vcs
          .postComment(config.computed.ci.prNumber, `## ERROR\n${e.message}`)
          .then(() => {
            throw e
          })
          .catch((err) => {
            if (err !== e) {
              const msg = `Received error: ${err.message} while trying to post PR comment about error: ${e.message}`
              throw new Error(msg)
            }

            throw e
          })
      }
      return Promise.reject(e)
    }

    return Promise.resolve(ret)
  },

  /**
   * Read in a JSON file and return the parsed json
   * @param {String} filename - the name of the file to read
   * @returns {Object} the json object
   */
  readJsonFile(filename) {
    const fullPath = path.join(process.cwd(), filename)
    return JSON.parse(fs.readFileSync(fullPath, {encoding: 'utf8'}))
  },
}

module.exports = utils
