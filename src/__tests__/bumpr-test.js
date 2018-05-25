jest.mock('replace-in-file')
jest.mock('../node-wrappers')
jest.mock('../logger')
jest.mock('../utils')

const cp = require('child_process')
const {set} = require('lodash')
const path = require('path')
const Promise = require('promise')
const replace = require('replace-in-file')

const pkgJson = require('../../package.json')
const Bumpr = require('../bumpr')
const {Logger} = require('../logger')
const {exec, writeFile} = require('../node-wrappers')
const utils = require('../utils')

const realExec = Promise.denodeify(cp.exec)

function getVersionCmd(filename) {
  return `node -e "console.log(require('./${filename}').version)"`
}

class FileNotFoundError extends Error {
  constructor(...args) {
    super(args)
    this.code = 'ENOENT'
  }
}

/**
 * Helper for performing repetative tasks in setting up _maybeBumpVersion tests
 *
 * @param {Object} ctx - the context object so the function can pass some info back to the tests for validation
 * @param {String} filename - the name of the file to test with
 * @param {String} scope - the scope to bump
 * @param {String} expectedVersion - the expected version after the bump
 */
function itShouldBumpVersion(ctx, filename, scope, expectedVersion) {
  describe(`a ${scope}`, () => {
    let info
    let newVersion
    beforeEach(() => {
      const {bumpr} = ctx
      bumpr.config.files = [filename]
      info = bumpr.maybeBumpVersion({scope, modifiedFiles: []})

      return realExec(getVersionCmd(filename)).then(stdout => {
        newVersion = stdout.replace('\n', '')
      })
    })

    it('should create the correct version', () => {
      expect(newVersion).toBe(expectedVersion)
    })

    if (scope === 'none') {
      it('should not include the version', () => {
        expect(info.version).toBe(undefined)
      })

      it(`should not add "${filename}" to the list of modified files`, () => {
        expect(info.modifiedFiles).not.toContain(filename)
      })
    } else {
      it('should return the correct version', () => {
        expect(info.version).toBe(expectedVersion)
      })

      it(`should add "${filename}" to the list of modified files`, () => {
        expect(info.modifiedFiles).toContain(filename)
      })
    }
  })
}

describe('Bumpr', () => {
  let bumpr

  beforeEach(() => {
    bumpr = new Bumpr({
      ci: [],
      config: {
        isEnabled: jest.fn(() => ({}))
      },
      vcs: {}
    })
  })

  afterEach(() => {
    Logger.log.mockReset()
  })

  describe('.check()', () => {
    beforeEach(() => {
      jest.spyOn(bumpr, 'getOpenPrInfo').mockReturnValue(Promise.resolve({scope: 'minor'}))
    })

    afterEach(() => {
      bumpr.getOpenPrInfo.mockRestore()
    })

    describe('when not a PR build', () => {
      beforeEach(() => {
        set(bumpr.config, 'computed.ci.isPr', false)
        return bumpr.check()
      })

      it('should notify user that it is skipping the check', () => {
        expect(Logger.log).toHaveBeenCalledWith('Not a PR build, skipping check')
      })

      it('should not look for open pr info', () => {
        expect(bumpr.getOpenPrInfo).toHaveBeenCalledTimes(0)
      })
    })

    describe('when it is a PR build', () => {
      beforeEach(() => {
        set(bumpr.config, 'computed.ci.isPr', true)
        return bumpr.check()
      })

      it('should look for open pr info', () => {
        expect(bumpr.getOpenPrInfo).toHaveBeenCalledTimes(1)
      })

      it('should notify user of the scope it found', () => {
        expect(Logger.log).toHaveBeenCalledWith('Found a minor bump for the current PR')
      })
    })
  })

  describe('.bump()', () => {
    let result
    let info
    let error

    beforeEach(() => {
      result = null
      error = null
      bumpr.config.foo = 'bar'
      bumpr.vcs = {foo: 'bar'}
      bumpr.ci = {push() {}}
      info = {scope: 'minor', changelog: '', version: '1.2.0'}
      jest.spyOn(bumpr, 'getMergedPrInfo').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeBumpVersion').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeCommitChanges').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeCreateTag').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeUpdateChangelog').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybePushChanges').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeLogChanges').mockReturnValue(Promise.resolve('logged'))
    })

    afterEach(() => {
      bumpr.getMergedPrInfo.mockRestore()
      bumpr.maybeBumpVersion.mockRestore()
      bumpr.maybeCommitChanges.mockRestore()
      bumpr.maybeCreateTag.mockRestore()
      bumpr.maybeUpdateChangelog.mockRestore()
      bumpr.maybePushChanges.mockRestore()
      bumpr.maybeLogChanges.mockRestore()
    })

    describe('when a merge build', () => {
      beforeEach(done => {
        bumpr
          .bump()
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should get the merged pr info', () => {
        expect(bumpr.getMergedPrInfo).toHaveBeenCalledTimes(1)
      })

      it('should maybe bump the version', () => {
        expect(bumpr.maybeBumpVersion).toHaveBeenCalledWith(info)
      })

      it('should maybe update the changelog', () => {
        expect(bumpr.maybeUpdateChangelog).toHaveBeenCalledWith(info)
      })

      it('should maybe commit the change', () => {
        expect(bumpr.maybeCommitChanges).toHaveBeenCalledWith(info)
      })

      it('should maybe create the tag', () => {
        expect(bumpr.maybeCreateTag).toHaveBeenCalledWith(info)
      })

      it('should maybe push the changes', () => {
        expect(bumpr.maybePushChanges).toHaveBeenCalledWith(info)
      })

      it('should maybe log the changes', () => {
        expect(bumpr.maybeLogChanges).toHaveBeenCalledWith(info)
      })

      it('should resolve with the result of the maybeLogChanges() call', () => {
        expect(result).toBe('logged')
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })

    describe('when not a merge build', () => {
      beforeEach(done => {
        set(bumpr.config, 'computed.ci.isPr', true)
        bumpr
          .bump()
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should log that non merge builds are skipped', () => {
        expect(Logger.log).toHaveBeenCalledWith('Not a merge build, skipping bump')
      })

      it('should not lookup merged PR info', () => {
        expect(bumpr.getMergedPrInfo).toHaveBeenCalledTimes(0)
      })

      it('should not maybe bump version', () => {
        expect(bumpr.maybeBumpVersion).toHaveBeenCalledTimes(0)
      })

      it('should not maybe update changelog', () => {
        expect(bumpr.maybeUpdateChangelog).toHaveBeenCalledTimes(0)
      })

      it('should not maybe commit changes', () => {
        expect(bumpr.maybeCommitChanges).toHaveBeenCalledTimes(0)
      })

      it('should not maybe create a tag', () => {
        expect(bumpr.maybeCreateTag).toHaveBeenCalledTimes(0)
      })

      it('should not maybe push commit', () => {
        expect(bumpr.maybePushChanges).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })
  })

  describe('.log()', () => {
    beforeEach(() => {
      set(bumpr.config, 'features.logging.file', 'the-log-file')
    })

    afterEach(() => {
      utils.readJsonFile.mockReset()
    })

    describe('when file not found', () => {
      let rejection
      beforeEach(() => {
        utils.readJsonFile.mockImplementation(() => {
          throw new FileNotFoundError()
        })

        return bumpr.log('foo').catch(err => {
          rejection = err
        })
      })

      it('should reject with the proper error', () => {
        expect(rejection).toEqual(new Bumpr.NoLogFileError('the-log-file'))
      })
    })

    describe('when some other error is thrown when reading file', () => {
      let rejection
      beforeEach(() => {
        utils.readJsonFile.mockImplementation(() => {
          throw new Error('oh snap!')
        })

        return bumpr.log('foo').catch(err => {
          rejection = err
        })
      })

      it('should reject with the raw error', () => {
        expect(rejection).toEqual(new Error('oh snap!'))
      })
    })

    describe('when key is not found', () => {
      let rejection
      beforeEach(() => {
        utils.readJsonFile.mockReturnValue({foo: 'bar'})
        return bumpr.log('fizz').catch(err => {
          rejection = err
        })
      })

      it('should notify of the missing key', () => {
        expect(rejection).toEqual(new Bumpr.MissingKeyError('fizz', 'the-log-file'))
      })
    })

    describe('when key is found', () => {
      let resolution
      beforeEach(() => {
        utils.readJsonFile.mockReturnValue({foo: 'bar'})
        return bumpr.log('foo').then(value => {
          resolution = value
        })
      })

      it('should resolve with the value', () => {
        expect(resolution).toEqual('bar')
      })
    })
  })

  describe('.publish()', () => {
    afterEach(() => {
      bumpr.log.mockReset()
      writeFile.mockReset()
      exec.mockReset()
    })

    describe('when file not found', () => {
      beforeEach(() => {
        jest.spyOn(bumpr, 'log').mockReturnValue(Promise.reject(new Bumpr.NoLogFileError()))
        return bumpr.publish()
      })

      it('should look up the scope from the log', () => {
        expect(bumpr.log).toHaveBeenCalledWith('scope')
      })

      it('should log message about why skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping publish because no scope found.', true)
      })
    })

    describe('when key is not found', () => {
      beforeEach(() => {
        jest.spyOn(bumpr, 'log').mockReturnValue(Promise.reject(new Bumpr.MissingKeyError()))
        return bumpr.publish()
      })

      it('should log message about why skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping publish because no scope found.', true)
      })
    })

    describe('when some other error is thrown when reading log', () => {
      let rejection
      beforeEach(() => {
        jest.spyOn(bumpr, 'log').mockReturnValue(Promise.reject(new Error('oh snap!')))
        return bumpr.publish().catch(err => {
          rejection = err
        })
      })

      it('should reject with the raw error', () => {
        expect(rejection).toEqual(new Error('oh snap!'))
      })
    })

    describe('when scope is "none"', () => {
      beforeEach(() => {
        jest.spyOn(bumpr, 'log').mockReturnValue(Promise.resolve('none'))
        return bumpr.publish()
      })

      it('should log message about why skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping publish because of "none" scope.', true)
      })
    })

    describe('when scope is not "none"', () => {
      beforeEach(() => {
        jest.spyOn(bumpr, 'log').mockReturnValue(Promise.resolve('minor'))
        writeFile.mockReturnValue(Promise.resolve())
        exec.mockReturnValue(Promise.resolve())
        return bumpr.publish()
      })

      it('should not log anything', () => {
        expect(Logger.log).not.toHaveBeenCalled()
      })

      it('should write out the .npmrc file', () => {
        expect(writeFile).toHaveBeenCalledWith('.npmrc', '//registry.npmjs.org/:_authToken=$NPM_TOKEN')
      })

      it('should publish', () => {
        expect(exec).toHaveBeenCalledWith('npm publish .')
      })
    })
  })

  describe('.getLastPr()', () => {
    let resolver
    let resolution
    let rejection
    let promise

    beforeEach(() => {
      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })
      bumpr.vcs = {
        getPr: jest.fn().mockReturnValue(resolver.promise)
      }

      // actual results of git log -10 --oneline on pr-bumper repo
      const gitLog =
        '98a148c Added some more tests, just a few more to go\n' +
        '1b1bd97 Added some real unit tests\n' +
        'edf85e0 Merge pull request #30 from job13er/remove-newline\n' +
        'fa066f2 Removed newline from parsed PR number\n' +
        'fc416cc Merge pull request #29 from job13er/make-bumping-more-robust\n' +
        '67db358 Fix for #26 by reading PR # from git commit\n' +
        '4a61a20 Automated version bump\n' +
        '7db44e1 Merge pull request #24 from sandersky/master\n' +
        'f571451 add pullapprove config\n' +
        '4398a26 address PR concerns\n'

      exec.mockReturnValue(Promise.resolve(gitLog))
      promise = bumpr
        .getLastPr()
        .then(pr => {
          resolution = pr
          return pr
        })
        .catch(err => {
          rejection = err
          throw err
        })
    })

    it('should call git log', () => {
      expect(exec).toHaveBeenCalledWith('git log -10 --oneline')
    })

    describe('when getPr() succeeds', () => {
      beforeEach(() => {
        resolver.resolve('the-pr')
        return promise
      })

      it('should parse out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(bumpr.vcs.getPr).toHaveBeenCalledWith('30')
      })

      it('should resolve with the pr', () => {
        expect(resolution).toBe('the-pr')
      })
    })

    describe('when getPr() fails', () => {
      beforeEach(done => {
        resolver.reject('the-error')
        promise.catch(() => {
          done()
        })
      })

      it('should parse out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(bumpr.vcs.getPr).toHaveBeenCalledWith('30')
      })

      it('should reject with the error', () => {
        expect(rejection).toBe('the-error')
      })
    })
  })

  describe('.getMergedPrInfo()', () => {
    ;['major', 'minor', 'patch'].forEach(scope => {
      describe(`when scope is ${scope}`, () => {
        let result

        beforeEach(() => {
          bumpr.config = {
            features: {
              maxScope: {
                value: 'minor'
              }
            },
            foo: 'bar',
            isEnabled: jest.fn()
          }
          bumpr.vcs = {bar: 'baz'}

          jest.spyOn(bumpr, 'getLastPr').mockReturnValue(Promise.resolve('the-pr'))
          utils.getChangelogForPr.mockReturnValue('my-changelog')
          utils.getScopeForPr.mockReturnValue(scope)
        })

        afterEach(() => {
          bumpr.getLastPr.mockRestore()
          utils.getChangelogForPr.mockReset()
          utils.getScopeForPr.mockReset()
        })

        describe('when maxScope is enabled', () => {
          beforeEach(() => {
            bumpr.config.isEnabled.mockImplementation(name => name === 'maxScope')
          })

          describe('when changelog feature is enabled', () => {
            beforeEach(() => {
              bumpr.config.isEnabled.mockImplementation(name => ['changelog', 'maxScope'].includes(name))
              return bumpr.getMergedPrInfo().then(res => {
                result = res
              })
            })

            it('should get the last PR to be merged', () => {
              expect(bumpr.getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'minor')
            })

            it('should get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr')
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: 'my-changelog', modifiedFiles: [], scope})
            })
          })

          describe('when changelog feature is not enabled', () => {
            /* eslint-disable arrow-body-style */
            beforeEach(() => {
              return bumpr.getMergedPrInfo().then(res => {
                result = res
              })
            })
            /* eslint-enable arrow-body-style */

            it('should get the last PR to be merged', () => {
              expect(bumpr.getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'minor')
            })

            it('should not get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: '', modifiedFiles: [], scope})
            })
          })
        })

        describe('when maxScope is disabled', () => {
          beforeEach(() => {
            bumpr.config.isEnabled.mockReturnValue(false)
          })

          describe('when changelog feature is enabled', () => {
            beforeEach(() => {
              bumpr.config.isEnabled.mockImplementation(name => name === 'changelog')
              return bumpr.getMergedPrInfo().then(res => {
                result = res
              })
            })

            it('should get the last PR to be merged', () => {
              expect(bumpr.getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
            })

            it('should get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr')
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: 'my-changelog', modifiedFiles: [], scope})
            })
          })

          describe('when changelog feature is not enabled', () => {
            /* eslint-disable arrow-body-style */
            beforeEach(() => {
              return bumpr.getMergedPrInfo().then(res => {
                result = res
              })
            })
            /* eslint-enable arrow-body-style */

            it('should get the last PR to be merged', () => {
              expect(bumpr.getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
            })

            it('should not get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: '', modifiedFiles: [], scope})
            })
          })
        })
      })
    })

    describe('when scope is none', () => {
      let result

      beforeEach(() => {
        bumpr.config = {foo: 'bar', isEnabled: jest.fn()}
        bumpr.vcs = {bar: 'baz'}

        jest.spyOn(bumpr, 'getLastPr').mockReturnValue(Promise.resolve('the-pr'))
        utils.getScopeForPr.mockReturnValue('none')
        utils.getChangelogForPr.mockReturnValue('my-changelog')
      })

      afterEach(() => {
        bumpr.getLastPr.mockRestore()
        utils.getScopeForPr.mockReset()
        utils.getChangelogForPr.mockReset()
      })

      describe('and changelog feature is enabled', () => {
        beforeEach(() => {
          bumpr.config.isEnabled.mockImplementation(name => name === 'changelog')
          return bumpr.getMergedPrInfo().then(res => {
            result = res
          })
        })

        it('should get the last PR to be merged', () => {
          expect(bumpr.getLastPr).toHaveBeenCalledTimes(1)
        })

        it('should gets the scope for the given pr', () => {
          expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
        })

        it('should not get the changelog for the given pr', () => {
          expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
        })

        it('should resolve with the info', () => {
          expect(result).toEqual({changelog: '', modifiedFiles: [], scope: 'none'})
        })
      })

      describe('and changelog feature is not enabled', () => {
        beforeEach(() => {
          bumpr.config.isEnabled.mockReturnValue(false)
          return bumpr.getMergedPrInfo().then(res => {
            result = res
          })
        })

        it('should get the last PR to be merged', () => {
          expect(bumpr.getLastPr).toHaveBeenCalledTimes(1)
        })

        it('should gets the scope for the given pr', () => {
          expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
        })

        it('should not get the changelog for the given pr', () => {
          expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
        })

        it('should resolve with the info', () => {
          expect(result).toEqual({changelog: '', modifiedFiles: [], scope: 'none'})
        })
      })
    })
  })

  describe('.getOpenPrInfo()', () => {
    let result

    beforeEach(() => {
      bumpr.config = {
        foo: 'bar',
        computed: {
          ci: {
            prNumber: '123'
          }
        },
        isEnabled: jest.fn()
      }
      bumpr.vcs = {
        getPr: jest.fn().mockReturnValue(Promise.resolve('the-pr'))
      }
      utils.getChangelogForPr.mockReturnValue('the-changelog')
      utils.getScopeForPr.mockReturnValue('patch')
      utils.maybePostCommentOnError
        .mockReturnValueOnce({
          pr: 'the-pr',
          scope: 'the-scope'
        })
        .mockReturnValueOnce({
          changelog: 'the-changelog',
          scope: 'the-scope'
        })
    })

    afterEach(() => {
      utils.getScopeForPr.mockReset()
      utils.getChangelogForPr.mockReset()
      utils.maybePostCommentOnError.mockReset()
    })

    describe('when optional features are disabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)
        return bumpr.getOpenPrInfo().then(res => {
          result = res
        })
      })

      it('should fetch the PR', () => {
        expect(bumpr.vcs.getPr).toHaveBeenCalledWith('123')
      })

      it('should call maybePostCommentOnError() once', () => {
        expect(utils.maybePostCommentOnError).toHaveBeenCalledTimes(1)
      })

      it('should not look up the scope of the PR', () => {
        expect(utils.getScopeForPr).toHaveBeenCalledTimes(0)
      })

      it('should not look up the changelog of the PR', () => {
        expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toEqual({
          changelog: '',
          scope: 'the-scope'
        })
      })

      describe('the first call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          ;[args] = utils.maybePostCommentOnError.mock.calls
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumpr.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumpr.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret

          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the scope', () => {
            expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
          })

          it('should return the pr and scope', () => {
            expect(ret).toEqual({
              pr: 'the-pr',
              scope: 'patch'
            })
          })
        })
      })
    })

    describe('when maxScope is enabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation(name => name === 'maxScope')
        set(bumpr.config, 'features.maxScope.value', 'minor')
        return bumpr.getOpenPrInfo().then(res => {
          result = res
        })
      })

      it('should fetch the PR', () => {
        expect(bumpr.vcs.getPr).toHaveBeenCalledWith('123')
      })

      it('should call maybePostCommentOnError() once', () => {
        expect(utils.maybePostCommentOnError).toHaveBeenCalledTimes(1)
      })

      it('should not look up the scope of the PR', () => {
        expect(utils.getScopeForPr).toHaveBeenCalledTimes(0)
      })

      it('should not look up the changelog of the PR', () => {
        expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toEqual({
          changelog: '',
          scope: 'the-scope'
        })
      })

      describe('the first call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          ;[args] = utils.maybePostCommentOnError.mock.calls
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumpr.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumpr.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret

          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the scope', () => {
            expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'minor')
          })

          it('should return the pr and scope', () => {
            expect(ret).toEqual({
              pr: 'the-pr',
              scope: 'patch'
            })
          })
        })
      })
    })

    describe('when changelog is enabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation(name => name === 'changelog')
        return bumpr.getOpenPrInfo().then(res => {
          result = res
        })
      })

      it('should fetch the PR', () => {
        expect(bumpr.vcs.getPr).toHaveBeenCalledWith('123')
      })

      it('should call maybePostCommentOnError() twice', () => {
        expect(utils.maybePostCommentOnError).toHaveBeenCalledTimes(2)
      })

      it('should not look up the scope of the PR', () => {
        expect(utils.getScopeForPr).toHaveBeenCalledTimes(0)
      })

      it('should not look up the changelog of the PR', () => {
        expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toEqual({
          changelog: 'the-changelog',
          scope: 'the-scope'
        })
      })

      describe('the first call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          ;[args] = utils.maybePostCommentOnError.mock.calls
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumpr.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumpr.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret

          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the scope', () => {
            expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
          })

          it('should return the pr and scope', () => {
            expect(ret).toEqual({
              pr: 'the-pr',
              scope: 'patch'
            })
          })
        })
      })

      describe('the second call to maybePostCommentOnError()', () => {
        let args
        beforeEach(() => {
          ;[, args] = utils.maybePostCommentOnError.mock.calls
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumpr.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumpr.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret
          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the changelog', () => {
            expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr')
          })

          it('should return the changelog and scope', () => {
            expect(ret).toEqual({
              changelog: 'the-changelog',
              scope: 'the-scope'
            })
          })
        })
      })
    })
  })

  describe('.maybeBumpVersion()', () => {
    const ctx = {}

    beforeEach(() => {
      ctx.bumpr = bumpr

      const original = path.join(__dirname, '_package.json')
      const otherOriginal = path.join(__dirname, '_package-with-pre-release.json')
      return realExec(`cp ${original} _package.json`).then(() =>
        realExec(`cp ${otherOriginal} _package-with-pre-release.json`)
      )
    })

    afterEach(() => realExec('rm -f _package.json _package-with-pre-release.json'))

    itShouldBumpVersion(ctx, '_package.json', 'none', '1.2.3')
    itShouldBumpVersion(ctx, '_package.json', 'patch', '1.2.4')
    itShouldBumpVersion(ctx, '_package.json', 'minor', '1.3.0')
    itShouldBumpVersion(ctx, '_package.json', 'major', '2.0.0')

    itShouldBumpVersion(ctx, '_package-with-pre-release.json', 'none', '1.2.3-alpha.4')
    itShouldBumpVersion(ctx, '_package-with-pre-release.json', 'patch', '1.2.3-alpha.5')

    describe('an invalid scope', () => {
      let info
      beforeEach(() => {
        bumpr.config.files = ['_package.json']
        info = {scope: 'foo'}
      })

      it('should throw an Error', () => {
        expect(() => {
          bumpr.maybeBumpVersion(info)
        }).toThrow('Invalid scope [foo]')
      })
    })
  })

  describe('._maybeCommitChanges()', () => {
    let info
    let result
    let error

    beforeEach(() => {
      info = {
        changelog: 'stuff changed',
        modifiedFiles: [],
        scope: 'patch',
        version: '1.2.3'
      }
      set(bumpr.config, 'computed.ci.buildNumber', '12345')

      bumpr.ci = {
        add: jest.fn().mockReturnValue(Promise.resolve()),
        commit: jest.fn().mockReturnValue(Promise.resolve()),
        setupGitEnv: jest.fn().mockReturnValue(Promise.resolve())
      }
    })

    describe('when no files were modified', () => {
      beforeEach(done => {
        result = null
        error = null
        bumpr
          .maybeCommitChanges(info)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should log info about skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping commit because no files were changed.')
      })

      it('should not set up the git env', () => {
        expect(bumpr.ci.setupGitEnv).toHaveBeenCalledTimes(0)
      })

      it('should not add any files', () => {
        expect(bumpr.ci.add).toHaveBeenCalledTimes(0)
      })

      it('should not commit any files', () => {
        expect(bumpr.ci.commit).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when files were modified', () => {
      beforeEach(done => {
        info.modifiedFiles = ['fizz', 'bang']
        result = null
        error = null
        bumpr
          .maybeCommitChanges(info)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should not log info about skipping', () => {
        expect(Logger.log).toHaveBeenCalledTimes(0)
      })

      it('should set up the git env', () => {
        expect(bumpr.ci.setupGitEnv).toHaveBeenCalledTimes(1)
      })

      it('should add the rightfiles', () => {
        expect(bumpr.ci.add).toHaveBeenCalledWith(['fizz', 'bang'])
      })

      it('should commit with version bump message', () => {
        const msg = `[ci skip] [${pkgJson.name}] Version bump to 1.2.3`
        const descr = 'From CI build 12345'
        expect(bumpr.ci.commit).toHaveBeenCalledWith(msg, descr)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('.maybeCreateTag()', () => {
    let result
    let info

    beforeEach(() => {
      info = {
        version: '1.2.3'
      }
      set(bumpr.config, 'computed.ci.buildNumber', '12345')
      bumpr.ci = {
        tag: jest.fn().mockReturnValue(Promise.resolve('tagged'))
      }
      exec.mockReturnValue(Promise.resolve())
    })

    describe('when scope is not "none"', () => {
      /* eslint-disable arrow-body-style */
      beforeEach(() => {
        return bumpr.maybeCreateTag(info).then(res => {
          result = res
        })
      })
      /* eslint-enable arrow-body-style */

      it('should create a tag', () => {
        expect(bumpr.ci.tag).toHaveBeenCalledWith('v1.2.3', 'Generated tag from CI build 12345')
      })

      it('should resolve with the result of the tag', () => {
        expect(result).toBe(info)
      })
    })

    describe('when scope is "none"', () => {
      beforeEach(() => {
        info.scope = 'none'
        return bumpr.maybeCreateTag(info).then(res => {
          result = res
        })
      })

      it('should not create a tag', () => {
        expect(bumpr.ci.tag).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the result of the tag', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('.maybeUpdateChangelog()', () => {
    let result
    let info

    beforeEach(() => {
      info = {
        changelog: 'the-changelog-content',
        scope: 'patch',
        modifiedFiles: [],
        version: '1.2.3'
      }
      set(bumpr.config, 'features.changelog.file', 'the-changelog-file')
      replace.mockReturnValue(Promise.resolve('return-value'))
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)

        return bumpr.maybeUpdateChangelog(info).then(resp => {
          result = resp
        })
      })

      it('should log a message explaining why it is skipping', () => {
        const msg = 'Skipping update changelog because of config option.'
        expect(Logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not update the changelog', () => {
        expect(replace).toHaveBeenCalledTimes(0)
      })

      it('should not add the changelog file to the modifiedFiles list', () => {
        expect(info.modifiedFiles).not.toContain('the-changelog-file')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled, and scope is "none"', () => {
      beforeEach(() => {
        info.scope = 'none'
        delete info.version
        bumpr.config.isEnabled.mockImplementation(name => name === 'changelog')

        return bumpr.maybeUpdateChangelog(info).then(resp => {
          result = resp
        })
      })

      it('should log a message explaining why it is skipping', () => {
        const msg = 'Skipping update changelog because of "none" scope.'
        expect(Logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not update the changelog', () => {
        expect(replace).toHaveBeenCalledTimes(0)
      })

      it('should not add the changelog file to the modifiedFiles list', () => {
        expect(info.modifiedFiles).not.toContain('the-changelog-file')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled and scope is not "none"', () => {
      beforeEach(() => {
        info.scope = 'patch'
        bumpr.config.isEnabled.mockImplementation(name => name === 'changelog')
        bumpr.config.changelogFile = 'the-changelog-file'

        return bumpr.maybeUpdateChangelog(info).then(resp => {
          result = resp
        })
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(Logger.log).toHaveBeenCalledTimes(0)
      })

      it('should update the changelog', () => {
        const now = new Date()
        const dateString = now
          .toISOString()
          .split('T')
          .slice(0, 1)
          .join('')
        const data = `<!-- bumpr -->\n\n## [${info.version}] - ${dateString}\n${info.changelog}`
        expect(replace).toHaveBeenCalledWith({
          files: 'the-changelog-file',
          from: /<!-- bumpr -->/,
          to: data
        })
      })

      it('should add the changelog file to the modifiedFiles list', () => {
        expect(info.modifiedFiles).toContain('the-changelog-file')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('maybePushChanges()', () => {
    let result
    let info

    beforeEach(() => {
      info = {
        modifiedFiles: [],
        scope: 'none'
      }

      bumpr.ci = {
        push: jest.fn().mockReturnValue(Promise.resolve('pushed'))
      }
    })

    describe('when nothing changed', () => {
      /* eslint-disable arrow-body-style */
      beforeEach(() => {
        return bumpr.maybePushChanges(info).then(r => {
          result = r
        })
      })
      /* eslint-enable arrow-body-style */

      it('should log a message about why it is skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping push because nothing changed.')
      })

      it('should not push the change', () => {
        expect(bumpr.ci.push).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when something changed', () => {
      beforeEach(() => {
        info.modifiedFiles = ['package.json']
        return bumpr.maybePushChanges(info).then(r => {
          result = r
        })
      })

      it('should not log a message about why it is skipping', () => {
        expect(Logger.log).toHaveBeenCalledTimes(0)
      })

      it('should push the change', () => {
        expect(bumpr.ci.push).toHaveBeenCalled()
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('.maybeLogChanges()', () => {
    let result
    let info

    beforeEach(() => {
      info = {
        changelog: 'the-changelog-content',
        scope: 'patch',
        modifiedFiles: [],
        version: '1.2.3'
      }
      set(bumpr.config, 'features.logging.file', 'the-log-file')
      writeFile.mockReturnValue(Promise.resolve())
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)

        return bumpr.maybeLogChanges(info).then(resp => {
          result = resp
        })
      })

      it('should log a message explaining why it is skipping', () => {
        const msg = 'Skipping logging because of config option.'
        expect(Logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not write the log', () => {
        expect(writeFile).not.toHaveBeenCalled()
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation(name => name === 'logging')

        return bumpr.maybeLogChanges(info).then(resp => {
          result = resp
        })
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(Logger.log).toHaveBeenCalledTimes(0)
      })

      it('should write the log', () => {
        const logInfo = {
          changelog: 'the-changelog-content',
          scope: 'patch',
          version: '1.2.3'
        }
        expect(writeFile).toHaveBeenCalledWith('the-log-file', JSON.stringify(logInfo, null, 2))
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })
})
