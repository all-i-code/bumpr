jest.mock('cosmiconfig')
jest.mock('fs')
jest.mock('../logger')

const {readFileSync} = require('fs')
const cosmiconfig = require('cosmiconfig')
const {forEach, forIn} = require('lodash')
const path = require('path')

const utils = require('../utils')

function mockJsonFileRead(data) {
  readFileSync.mockImplementationOnce(() => {
    if (data instanceof Error) {
      throw data
    }

    return JSON.stringify(data)
  })
}

/**
 * Save the existing environment variables into an env object
 * @param {String[]} args - the environment variables to save
 * @param {Object} env - the object in which to save the environment variables
 */
function saveEnv(args, env) {
  forEach(args, arg => {
    env[arg] = process.env[arg] // eslint-disable-line no-param-reassign
  })
}

/**
 * Set the environment variables based on the given env hash
 * @param {Object} env - the object from which to set environment variables
 */
function setEnv(env) {
  forIn(env, (value, key) => {
    process.env[key] = value
  })
}

/**
 * Verifiy that getConfig filled in the proper feature defaults
 * @param {Object} ctx - the context object for the tests
 * @param {String[]} propsToSkip - an array of string properties to skip the check for (if they've been overwritten)
 */
function verifyFeatureDefaults(ctx, propsToSkip = []) {
  // NOTE: disabling complexity check here b/c it's just complaining about the conditionals around
  // all the it() blocks now, but they're necessary to test overrides
  /* eslint-disable complexity */
  describe('when using feature defaults', () => {
    if (propsToSkip.indexOf('features.changelog.enabled') === -1) {
      it('should default changelog feature to disabled', () => {
        expect(ctx.config.isEnabled('changelog')).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.changelog.file') === -1) {
      it('should default changelog file to "CHANGELOG.md"', () => {
        expect(ctx.config.features.changelog.file).toBe('CHANGELOG.md')
      })
    }

    if (propsToSkip.indexOf('features.comments.enabled') === -1) {
      it('should default pr comments feature to disabled', () => {
        expect(ctx.config.isEnabled('comments')).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.maxScope.enabled') === -1) {
      it('should default maxScope feature to disabled', () => {
        expect(ctx.config.isEnabled('maxScope')).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.maxScope.value') === -1) {
      it('should default maxScope value to "major"', () => {
        expect(ctx.config.features.maxScope.value).toBe('major')
      })
    }
  })
  /* eslint-enable complexity */
}

/**
 * Verifiy that getConfig filled in the proper Github/Travis defaults
 * @param {Object} ctx - the context object for the tests
 * @param {String[]} propsToSkip - an array of string properties to skip the check for (if they've been overwritten)
 */
function verifyGitHubTravisDefaults(ctx, propsToSkip = []) {
  // NOTE: disabling complexity check here b/c it's just complaining about the conditionals around
  // all the it() blocks now, but they're necessary to test overrides
  /* eslint-disable complexity */
  describe('when using github/travis defaults', () => {
    if (propsToSkip.indexOf('ci.gitUser') === -1) {
      it('should use the proper git user', () => {
        expect(ctx.config.ci.gitUser).toEqual({
          email: 'bumpr@domain.com',
          name: 'Bumpr'
        })
      })
    }

    if (propsToSkip.indexOf('ci.provider') === -1) {
      it('should use the proper ci provider', () => {
        expect(ctx.config.ci.provider).toBe('travis')
      })
    }

    if (propsToSkip.indexOf('computed.ci.branch') === -1) {
      it('should have the proper branch', () => {
        expect(ctx.config.computed.ci.branch).toBe('my-branch')
      })
    }

    if (propsToSkip.indexOf('vcs.domain') === -1) {
      it('should have the proper vcs domain', () => {
        expect(ctx.config.vcs.domain).toBe('github.com')
      })
    }

    if (propsToSkip.indexOf('vcs.provider') === -1) {
      it('should have the proper vcs provider', () => {
        expect(ctx.config.vcs.provider).toBe('github')
      })
    }

    if (propsToSkip.indexOf('computed.vcs.auth') === -1) {
      it('should have the proper vcs auth', () => {
        expect(ctx.config.computed.vcs.auth).toEqual({
          readToken: '12345',
          writeToken: '54321'
        })
      })
    }
  })
  /* eslint-enable complexity */
}

describe('utils', () => {
  describe('.getConfig()', () => {
    let env
    let realEnv
    let resolver

    beforeEach(() => {
      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })

      cosmiconfig.mockReturnValue({
        search: jest.fn().mockReturnValue(resolver.promise)
      })

      realEnv = {}
    })

    afterEach(() => {
      cosmiconfig.mockReset()
      setEnv(realEnv)
    })

    describe('GitHub/Travis (default case)', () => {
      const ctx = {}

      beforeEach(() => {
        env = {
          TRAVIS_BRANCH: 'my-branch',
          TRAVIS_BUILD_NUMBER: '123',
          GITHUB_READ_ONLY_TOKEN: '12345',
          GITHUB_TOKEN: '54321',
          SLACK_URL: 'slack-webhook-url'
        }
      })

      describe('when doing a pull request build', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          resolver.resolve()

          return utils.getConfig().then(config => {
            ctx.config = config
          })
        })

        it('should configure cosmiconfig properly', () => {
          expect(cosmiconfig).toHaveBeenCalledWith('bumpr')
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to true', () => {
          expect(ctx.config.computed.ci.isPr).toBe(true)
        })

        it('should set prNumber to the PR number', () => {
          expect(ctx.config.computed.ci.prNumber).toBe('13')
        })
      })

      describe('when doing a merge build', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          resolver.resolve()

          return utils.getConfig().then(config => {
            ctx.config = config
          })
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to false', () => {
          expect(ctx.config.computed.ci.isPr).toBe(false)
        })

        it('should set prNumber to false', () => {
          expect(ctx.config.computed.ci.prNumber).toBe('false')
        })
      })

      describe('when doing a merge build (with slack feature enabled)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          resolver.resolve({
            config: {
              features: {
                slack: {enabled: true}
              }
            }
          })

          return utils.getConfig().then(config => {
            ctx.config = config
          })
        })

        it('should set prNumber to false', () => {
          expect(ctx.config.computed.slackUrl).toBe('slack-webhook-url')
        })
      })

      describe('when a partial config is given', () => {
        beforeEach(() => {
          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          resolver.resolve({
            config: {
              ci: {
                gitUser: {
                  email: 'some.other.user@domain.com',
                  name: 'Some Other User'
                }
              },
              features: {
                changelog: {
                  enabled: true,
                  file: 'CHANGES.md'
                }
              }
            }
          })

          return utils.getConfig().then(config => {
            ctx.config = config
          })
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser'])
        verifyFeatureDefaults(ctx, ['features.changelog.enabled', 'features.changelog.file'])

        it('should use the overwritten git user', () => {
          expect(ctx.config.ci.gitUser).toEqual({
            email: 'some.other.user@domain.com',
            name: 'Some Other User'
          })
        })

        it('should use the overwritten changelog settings', () => {
          expect(ctx.config.features.changelog).toEqual({
            enabled: true,
            file: 'CHANGES.md'
          })
        })
      })

      describe('when pr env is missing', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = undefined
          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          resolver.resolve()

          return utils.getConfig().then(config => {
            ctx.config = config
          })
        })

        it('should not consider it a PR', () => {
          expect(ctx.config.computed.ci.isPr).toBe(false)
        })
      })
    })
  })

  describe('.getValidatedScope()', () => {
    const prUrl = 'my-pr-url'
    const prNumber = '12345'
    const scopes = ['patch', 'minor', 'major', 'none']

    forEach(scopes, scope => {
      it(`should handle a scope of "${scope}"`, () => {
        const ret = utils.getValidatedScope({
          scope,
          prNumber,
          prUrl
        })
        expect(ret).toBe(scope)
      })
    })

    it('should throw an error on invalid scope', () => {
      const fn = () => {
        utils.getValidatedScope({
          scope: 'foo-bar',
          prNumber,
          prUrl
        })
      }

      expect(fn).toThrow('Invalid version-bump scope "foo-bar" found for PR #12345 (my-pr-url)')
    })

    describe('when max scope is set', () => {
      const maxScopes = {
        none: {
          valid: ['none'],
          invalid: ['patch', 'minor', 'major']
        },
        patch: {
          valid: ['none', 'patch'],
          invalid: ['minor', 'major']
        },
        minor: {
          valid: ['none', 'patch', 'minor'],
          invalid: ['major']
        },
        major: {
          valid: ['none', 'patch', 'minor', 'major'],
          invalid: []
        }
      }

      Object.keys(maxScopes).forEach(maxScope => {
        const {invalid, valid} = maxScopes[maxScope]
        describe(`with a maxScope of "${maxScope}"`, () => {
          valid.forEach(scope => {
            it(`should be fine when scope is "${scope}"`, () => {
              const ret = utils.getValidatedScope({
                scope,
                maxScope,
                prNumber,
                prUrl
              })

              expect(ret).toBe(scope)
            })
          })

          invalid.forEach(scope => {
            it(`should throw an error when scope is "${scope}"`, () => {
              const fn = () => {
                utils.getValidatedScope({
                  scope,
                  maxScope,
                  prNumber,
                  prUrl
                })
              }
              const prStr = `PR #${prNumber} (${prUrl})`
              const msg = `Version-bump scope "${scope}" is higher than the maximum "${maxScope}" for ${prStr}`
              expect(fn).toThrow(msg)
            })
          })
        })
      })
    })
  })

  describe('.getScopeForPr()', () => {
    let pr

    beforeEach(() => {
      pr = {
        description: '',
        number: '12345',
        url: 'my-pr-url'
      }
    })

    it('should throw error when no version-bump present', () => {
      pr.description = 'My super-cool new feature'
      const example = 'Please include a scope (e.g. `#major#`, `#minor#`, `#patch#`) in your PR description.'
      const exampleLink = 'See https://github.com/all-i-code/bumpr#pull-requests for more details.'
      expect(() => {
        utils.getScopeForPr(pr)
      }).toThrow(`No version-bump scope found for [PR #12345](my-pr-url)\n${example}\n${exampleLink}`)
    })

    it('should throw error when multiple version-bumps are present', () => {
      pr.description = 'This is my cool #minor# change or is it a #patch#?'
      expect(() => {
        utils.getScopeForPr(pr)
      }).toThrow('Too many version-bump scopes found for [PR #12345](my-pr-url)')
    })

    it('should return scope when a single version-bump is present', () => {
      pr.description = 'This is my super-cool #minor#'
      expect(utils.getScopeForPr(pr)).toBe('minor')
    })

    describe('when given a maxScope', () => {
      beforeEach(() => {
        pr.description = 'This is my super-cool #minor#'
      })

      it('should return the scope when less than max scope', () => {
        expect(utils.getScopeForPr(pr, 'major')).toBe('minor')
      })

      it('should return the scope when same as max scope', () => {
        expect(utils.getScopeForPr(pr, 'minor')).toBe('minor')
      })

      it('should throw error when greater than max scope', () => {
        expect(() => {
          utils.getScopeForPr(pr, 'patch')
        }).toThrow('Version-bump scope "minor" is higher than the maximum "patch" for PR #12345 (my-pr-url)')
      })
    })

    it('should return scope when GFM checkbox syntax is present with one scope checked', () => {
      pr.description = `
### Check the scope of this pr:
- [ ] #none# - documentation fixes and/or test additions
- [ ] #patch# - bugfix, dependency update
- [x] #minor# - new feature, backwards compatible
- [ ] #major# - major feature, probably breaking API`
      expect(utils.getScopeForPr(pr)).toBe('minor')
    })

    it('should throw error when GFM checkbox syntax is present with multiple scopes checked', () => {
      pr.description = `
### Check the scope of this pr:
- [x] #patch# - bugfix, dependency update
- [ ] #minor# - new feature, backwards compatible
- [x] #major# - major feature, probably breaking API`
      expect(() => {
        utils.getScopeForPr(pr)
      }).toThrow('Too many version-bump scopes found for [PR #12345](my-pr-url)')
    })

    it('should throw error when GFM checkbox syntax is present with no scopes checked', () => {
      pr.description = `
### Check the scope of this pr:
- [ ] #patch# - bugfix, dependency update
- [ ] #minor# - new feature, backwards compatible
- [ ] #major# - major feature, probably breaking API`
      expect(() => {
        utils.getScopeForPr(pr)
      }).toThrow('No version-bump scope found for [PR #12345](my-pr-url)')
    })

    it('should return scope when GFM checkbox syntax is present with one scope checked and other scopes mentioned', () => {
      pr.description = `
  ### Check the scope of this pr:
  - [ ] #patch# - bugfix, dependency update
  - [x] #minor# - new feature, backwards compatible
  - [ ] #major# - major feature, probably breaking API

  Thought this might be #major# but on second thought it is a minor change
  `
      expect(utils.getScopeForPr(pr)).toBe('minor')
    })
  })

  describe('.getChangelogForPr()', () => {
    const link = 'https://github.com/all-i-code/bumpr#changelog'
    const errorMsg =
      'No CHANGELOG content found in PR description.\n' +
      'Please add a `## CHANGELOG` section to your PR description with some content describing your change.\n' +
      `See ${link} for details.`

    let pr
    let changelog
    beforeEach(() => {
      pr = {
        description: '',
        number: '12345',
        url: 'my-pr-url'
      }
    })

    describe('when no changelog present', () => {
      beforeEach(() => {
        pr.description = 'My super-cool new feature'
      })

      it('should throw an error', () => {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).toThrow(Error, errorMsg)
      })
    })

    describe('when changelog empty', () => {
      beforeEach(() => {
        pr.description = 'My super-cool new feature\n ## CHANGELOG'
      })

      it('should throw an error', () => {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).toThrow(Error, errorMsg)
      })
    })

    describe('when multiple changelog sections are present', () => {
      beforeEach(() => {
        pr.description = '##CHANGELOG\n### Fixes\nFoo, Bar, Baz\n##changelog\n## Features\nFizz, Bang'
      })

      it('should throw an error', () => {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).toThrow(Error, 'Multiple changelog sections found. Line 1 and line 4.')
      })
    })

    describe('when changelog section is present', () => {
      beforeEach(() => {
        pr.description = '##changelog\r\n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', () => {
        expect(changelog).toEqual('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })

    describe('when changelog section has extra space at the end', () => {
      beforeEach(() => {
        pr.description = '## CHANGELOG    \n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', () => {
        expect(changelog).toEqual('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })
  })

  describe('.maybePostComment()', () => {
    let config
    let resolver
    let vcs
    let result
    let error

    beforeEach(() => {
      config = {
        computed: {
          ci: {
            isPr: true,
            prNumber: '123'
          }
        },
        isEnabled: jest.fn()
      }

      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })

      vcs = {
        postComment: jest.fn().mockReturnValue(resolver.promise)
      }

      result = null
      error = null
    })

    describe('when feature is not enabled', () => {
      beforeEach(done => {
        config.isEnabled.mockReturnValue(false)
        utils
          .maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })
    })

    describe('when feature is enabled, but isPr is false', () => {
      beforeEach(done => {
        config.computed.ci.isPr = false
        config.isEnabled.mockImplementation(name => name === 'comments')

        utils
          .maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })
    })

    describe('when feature is enabled, and isPr is true, but SKIP_COMMENTS is in env', () => {
      let realSkipComments

      beforeEach(done => {
        realSkipComments = process.env.SKIP_COMMENTS
        process.env.SKIP_COMMENTS = '1'
        config.computed.ci.isPr = true
        config.isEnabled.mockImplementation(name => name === 'comments')
        utils
          .maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      afterEach(() => {
        if (realSkipComments !== undefined) {
          process.env.SKIP_COMMENTS = realSkipComments
        } else {
          delete process.env.SKIP_COMMENTS
        }
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })
    })

    describe('when feature is enabled and isPr is true (and no SKIP_COMMENTS is present)', () => {
      let promise

      beforeEach(() => {
        config.isEnabled.mockImplementation(name => name === 'comments')
        promise = utils
          .maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
            throw err
          })
      })

      it('should post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledWith(config.computed.ci.prNumber, 'fizz-bang')
      })

      it('should not reject yet', () => {
        expect(error).toBe(null)
      })

      it('should not resolve yet', () => {
        expect(result).toBe(null)
      })

      describe('when postComment succeeds', () => {
        beforeEach(() => {
          resolver.resolve()
          return promise
        })

        it('should not reject', () => {
          expect(error).toBe(null)
        })

        it('should resolve', () => {
          expect(result).toBe(undefined)
        })
      })

      describe('when postComment fails', () => {
        beforeEach(done => {
          resolver.reject(new Error('Aw snap!'))
          promise.catch(() => {
            done()
          })
        })

        it('should reject with a combined error', () => {
          const msg = 'Received error: Aw snap! while trying to post PR comment: fizz-bang'
          expect(error.message).toBe(msg)
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })
    })

    describe('when feature is enabled and isPr is true, and isError is true', () => {
      let promise

      beforeEach(() => {
        config.isEnabled.mockImplementation(name => name === 'comments')
        promise = utils
          .maybePostComment(config, vcs, 'fizz-bang', true)
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
            throw err
          })
      })

      it('should post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledWith(config.computed.ci.prNumber, '## ERROR\nfizz-bang')
      })

      it('should not reject yet', () => {
        expect(error).toBe(null)
      })

      it('should not resolve yet', () => {
        expect(result).toBe(null)
      })

      describe('when postComment succeeds', () => {
        beforeEach(() => {
          resolver.resolve()
          return promise
        })

        it('should not reject', () => {
          expect(error).toBe(null)
        })

        it('should resolve', () => {
          expect(result).toBe(undefined)
        })
      })

      describe('when postComment fails', () => {
        beforeEach(done => {
          resolver.reject(new Error('Aw snap!'))
          promise.catch(() => {
            done()
          })
        })

        it('should reject with a combined error', () => {
          const msg = 'Received error: Aw snap! while trying to post PR comment: ## ERROR\nfizz-bang'
          expect(error.message).toBe(msg)
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })
    })
  })

  describe('.maybePostCommentOnError()', () => {
    let config
    let resolver
    let vcs
    let func
    let result
    let error

    beforeEach(() => {
      config = {
        computed: {
          ci: {
            isPr: true,
            prNumber: '123'
          }
        },
        isEnabled: jest.fn()
      }

      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })

      vcs = {
        postComment: jest.fn().mockReturnValue(resolver.promise)
      }

      func = jest.fn()
      result = null
      error = null
    })

    describe('when func succeeds', () => {
      beforeEach(() => {
        func.mockReturnValue('foo')
        return utils
          .maybePostCommentOnError(config, vcs, func)
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
            throw err
          })
      })

      it('should call the func', () => {
        expect(func).toHaveBeenCalledTimes(1)
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve with the return value of func', () => {
        expect(result).toBe('foo')
      })
    })

    describe('when func throws an error', () => {
      beforeEach(() => {
        func.mockImplementation(() => {
          throw new Error('Uh oh!')
        })
      })

      describe('and feature is not enabled', () => {
        beforeEach(done => {
          config.isEnabled.mockReturnValue(false)
          utils
            .maybePostCommentOnError(config, vcs, func)
            .then(resp => {
              result = resp
            })
            .catch(err => {
              error = err
              done()
            })
        })

        it('should call the func', () => {
          expect(func).toHaveBeenCalledTimes(1)
        })

        it('should not post a comment', () => {
          expect(vcs.postComment).toHaveBeenCalledTimes(0)
        })

        it('should reject with the error thrown', () => {
          expect(error).toEqual(new Error('Uh oh!'))
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })

      describe('and feature is enabled but isPr is false', () => {
        beforeEach(done => {
          config.computed.ci.isPr = false
          config.isEnabled.mockImplementation(name => name === 'comments')
          utils
            .maybePostCommentOnError(config, vcs, func)
            .then(resp => {
              result = resp
            })
            .catch(err => {
              error = err
              done()
            })
        })

        it('should call the func', () => {
          expect(func).toHaveBeenCalledTimes(1)
        })

        it('should not post a comment', () => {
          expect(vcs.postComment).toHaveBeenCalledTimes(0)
        })

        it('should reject with the error thrown', () => {
          expect(error).toEqual(new Error('Uh oh!'))
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })

      describe('and prComments is true and isPr is true', () => {
        let promise

        beforeEach(() => {
          config.computed.ci.isPr = true
          config.isEnabled.mockImplementation(name => name === 'comments')
          promise = utils
            .maybePostCommentOnError(config, vcs, func)
            .then(resp => {
              result = resp
            })
            .catch(err => {
              error = err
              throw err
            })
        })

        it('should call the func', () => {
          expect(func).toHaveBeenCalledTimes(1)
        })

        it('should post a comment', () => {
          expect(vcs.postComment).toHaveBeenCalledWith(config.computed.ci.prNumber, '## ERROR\nUh oh!')
        })

        it('should not reject yet', () => {
          expect(error).toBe(null)
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })

        describe('when postComment succeeds', () => {
          beforeEach(done => {
            resolver.resolve()
            promise.catch(() => {
              done()
            })
          })

          it('should reject with the original error', () => {
            expect(error.message).toBe('Uh oh!')
          })

          it('should not resolve', () => {
            expect(result).toBe(null)
          })
        })

        describe('when postComment fails', () => {
          beforeEach(done => {
            resolver.reject(new Error('Aw snap!'))
            promise.catch(() => {
              done()
            })
          })

          it('should reject with a combined error', () => {
            const msg = 'Received error: Aw snap! while trying to post PR comment about error: Uh oh!'
            expect(error.message).toBe(msg)
          })

          it('should not resolve', () => {
            expect(result).toBe(null)
          })
        })
      })
    })
  })

  describe('.readJsonFile()', () => {
    let cwd
    let json
    beforeEach(() => {
      cwd = process.cwd()
      mockJsonFileRead({foo: 'bar'})
      json = utils.readJsonFile('foo.json')
    })

    it('should read appropriate file', () => {
      expect(readFileSync).toHaveBeenCalledWith(path.join(cwd, 'foo.json'), {encoding: 'utf8'})
    })

    it('should return the contents of the file, parsed', () => {
      expect(json).toEqual({foo: 'bar'})
    })
  })
})
