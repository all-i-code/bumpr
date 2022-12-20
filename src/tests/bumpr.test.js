jest.mock('node-fetch')
jest.mock('replace-in-file')
jest.mock('../node-wrappers')
jest.mock('../logger')
jest.mock('../utils')

const cp = require('child_process')
const {set} = require('lodash')
const fetch = require('node-fetch')
const moment = require('moment-timezone')
const path = require('path')
const Promise = require('promise')
const replace = require('replace-in-file')
const util = require('util')
const pkgJson = require('../../package.json')
const Bumpr = require('../bumpr')
const {Logger} = require('../logger')
const {createReadStream, exec, existsSync, readdir, statSync, writeFile} = require('../node-wrappers')
const utils = require('../utils')

const realExec = util.promisify(cp.exec)

function getVersionCmd(filename) {
  return `node -e "console.log(require('./${filename}').version)"`
}

class FileNotFoundError extends Error {
  constructor(...args) {
    super(args)
    this.code = 'ENOENT'
  }
}

function setupPkgs({exists, isDir, pkgs}) {
  existsSync.mockReturnValueOnce(exists)
  if (exists) {
    const stat = {isDirectory: jest.fn().mockReturnValue(Boolean(isDir))}
    statSync.mockReturnValueOnce(stat)
  }

  if (pkgs) {
    readdir.mockReturnValueOnce(
      Promise.resolve(pkgs.map(({dir, name}) => ({isDirectory: jest.fn().mockReturnValue(dir), name})))
    )
  }
}

/**
 * Helper for performing repetative tasks in setting up _maybeBumpVersion tests
 *
 * @param {Function} bumprFn - function to return the bumpr instance
 * @param {String} filename - the name of the file to test with
 * @param {String} scope - the scope to bump
 * @param {String} expectedVersion - the expected version after the bump
 */
function itShouldBumpVersion(bumprFn, filename, scope, expectedVersion, dirs) {
  const suffix = dirs ? ' (with packages)' : ''
  describe(`a ${scope}${suffix}`, () => {
    let info
    let newVersion
    let bumpr

    beforeEach(() => {
      bumpr = bumprFn()
      bumpr.config.files = [filename]

      if (dirs) {
        setupPkgs({
          exists: true,
          isDir: true,
          pkgs: dirs.map((name) => ({dir: true, name})),
        })
      } else {
        setupPkgs({exists: false})
      }

      return bumpr
        .maybeBumpVersion({scope, modifiedFiles: []})
        .then((i) => {
          info = i
        })
        .then(() => realExec(getVersionCmd(filename)))
        .then(({stdout}) => {
          newVersion = stdout.replace('\n', '')
        })
    })

    if (scope === 'none') {
      it('should not include the version', () => {
        expect(info.version).toBe(undefined)
      })

      it(`should not add "${filename}" to the list of modified files`, () => {
        expect(info.modifiedFiles).not.toContain(filename)
      })

      if (dirs) {
        dirs.forEach((dir) => {
          it(`should not add "packages/${dir}/${filename}" to the list of modified files`, () => {
            expect(info.modifiedFiles).not.toContain(path.join('packages', dir, filename))
          })
        })
      }
    } else {
      it('should return the correct version', () => {
        expect(info.version).toBe(expectedVersion)
      })

      it(`should add "${filename}" to the list of modified files`, () => {
        expect(info.modifiedFiles).toContain(filename)
      })

      it('should update version in file', () => {
        expect(newVersion).toBe(expectedVersion)
      })

      if (dirs) {
        dirs.forEach((dir) => {
          it(`should add "packages/${dir}/${filename}" to the list of modified files`, () => {
            expect(info.modifiedFiles).toContain(path.join('packages', dir, filename))
          })
        })
      }
    }
  })
}

describe('Bumpr', () => {
  let bumpr

  beforeEach(() => {
    bumpr = new Bumpr({
      ci: [],
      config: {
        isEnabled: jest.fn(() => ({})),
      },
      vcs: {},
    })
  })

  afterEach(() => {
    Logger.log.mockReset()
    createReadStream.mockReset()
    exec.mockReset()
    existsSync.mockReset()
    readdir.mockReset()
    statSync.mockReset()
    writeFile.mockReset()
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
      jest.spyOn(bumpr, 'maybeCreateRelease').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeLogChanges').mockReturnValue(Promise.resolve('logged'))
    })

    afterEach(() => {
      bumpr.getMergedPrInfo.mockRestore()
      bumpr.maybeBumpVersion.mockRestore()
      bumpr.maybeCommitChanges.mockRestore()
      bumpr.maybeCreateTag.mockRestore()
      bumpr.maybeUpdateChangelog.mockRestore()
      bumpr.maybePushChanges.mockRestore()
      bumpr.maybeCreateRelease.mockRestore()
      bumpr.maybeLogChanges.mockRestore()
    })

    describe('when a merge build', () => {
      beforeEach((done) => {
        bumpr
          .bump({numExtraCommits: 1})
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should get the merged pr info', () => {
        expect(bumpr.getMergedPrInfo).toHaveBeenCalledWith(1)
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
      beforeEach((done) => {
        set(bumpr.config, 'computed.ci.isPr', true)
        bumpr
          .bump({numExtraCommits: 0})
          .then((res) => {
            result = res
          })
          .catch((err) => {
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

      it('should not maybe create a release', () => {
        expect(bumpr.maybeCreateRelease).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })
  })

  describe('.info()', () => {
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
      jest.spyOn(bumpr, 'maybeCreateRelease').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeLogChanges').mockReturnValue(Promise.resolve('logged'))
    })

    afterEach(() => {
      bumpr.getMergedPrInfo.mockRestore()
      bumpr.maybeBumpVersion.mockRestore()
      bumpr.maybeCommitChanges.mockRestore()
      bumpr.maybeCreateTag.mockRestore()
      bumpr.maybeUpdateChangelog.mockRestore()
      bumpr.maybePushChanges.mockRestore()
      bumpr.maybeCreateRelease.mockRestore()
      bumpr.maybeLogChanges.mockRestore()
    })

    describe('when a merge build', () => {
      beforeEach((done) => {
        bumpr
          .info({numExtraCommits: 1})
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should get the merged pr info', () => {
        expect(bumpr.getMergedPrInfo).toHaveBeenCalledWith(1)
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
      beforeEach((done) => {
        set(bumpr.config, 'computed.ci.isPr', true)
        bumpr
          .info({numExtraCommits: 0})
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should log that non merge builds are skipped', () => {
        expect(Logger.log).toHaveBeenCalledWith('Not a merge build, skipping info')
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

      it('should not maybe create a release', () => {
        expect(bumpr.maybeCreateRelease).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })
  })

  describe('.isPr()', () => {
    let ret
    describe('when not a PR build', () => {
      beforeEach(() => {
        set(bumpr.config, 'computed.ci.isPr', false)
        ret = bumpr.isPr()
      })

      it('should return false', () => {
        expect(ret).toEqual(false)
      })
    })

    describe('when it is a PR build', () => {
      beforeEach(() => {
        set(bumpr.config, 'computed.ci.isPr', true)
        ret = bumpr.isPr()
      })

      it('should return true', () => {
        expect(ret).toEqual(true)
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

        return bumpr.log('foo').catch((err) => {
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

        return bumpr.log('foo').catch((err) => {
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
        return bumpr.log('fizz').catch((err) => {
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
        return bumpr.log('foo').then((value) => {
          resolution = value
        })
      })

      it('should resolve with the value', () => {
        expect(resolution).toEqual('bar')
      })
    })
  })

  describe('.publish()', () => {
    beforeEach(() => {
      jest.spyOn(bumpr, 'maybeSendSlackMessage').mockReturnValue(Promise.resolve('done'))
    })

    afterEach(() => {
      bumpr.maybeSendSlackMessage.mockRestore()
    })

    describe('when file not found', () => {
      beforeEach(() => {
        jest.spyOn(bumpr, 'getLog').mockReturnValue(Promise.reject(new Bumpr.NoLogFileError()))
        return bumpr.publish()
      })

      afterEach(() => {
        bumpr.getLog.mockReset()
      })

      it('should look up the log', () => {
        expect(bumpr.getLog).toHaveBeenCalled()
      })

      it('should log message about why skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping publish because no log file found.', true)
      })

      it('should not maybe send a slack message', () => {
        expect(bumpr.maybeSendSlackMessage).not.toHaveBeenCalled()
      })
    })

    describe('when key is not found', () => {
      beforeEach(() => {
        const log = {foo: 'bar'}
        jest.spyOn(bumpr, 'getLog').mockReturnValue(Promise.resolve({log}))
        return bumpr.publish()
      })

      afterEach(() => {
        bumpr.getLog.mockReset()
      })

      it('should log message about why skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping publish because no scope found.', true)
      })

      it('should not maybe send a slack message', () => {
        expect(bumpr.maybeSendSlackMessage).not.toHaveBeenCalled()
      })
    })

    describe('when some other error is thrown when reading log', () => {
      let rejection
      beforeEach(() => {
        jest.spyOn(bumpr, 'getLog').mockReturnValue(Promise.reject(new Error('oh snap!')))
        return bumpr.publish().catch((err) => {
          rejection = err
        })
      })

      afterEach(() => {
        bumpr.getLog.mockReset()
      })

      it('should reject with the raw error', () => {
        expect(rejection).toEqual(new Error('oh snap!'))
      })

      it('should not maybe send a slack message', () => {
        expect(bumpr.maybeSendSlackMessage).not.toHaveBeenCalled()
      })
    })

    describe('when scope is "none"', () => {
      beforeEach(() => {
        const log = {scope: 'none'}
        jest.spyOn(bumpr, 'getLog').mockReturnValue(Promise.resolve({log}))
        return bumpr.publish()
      })

      afterEach(() => {
        bumpr.getLog.mockReset()
      })

      it('should log message about why skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping publish because of "none" scope.', true)
      })

      it('should not maybe send a slack message', () => {
        expect(bumpr.maybeSendSlackMessage).not.toHaveBeenCalled()
      })
    })

    describe('when scope is not "none" (and no packages file or directory)', () => {
      let result
      beforeEach(() => {
        const log = {scope: 'minor'}
        jest.spyOn(bumpr, 'getLog').mockReturnValue(Promise.resolve({log}))
        setupPkgs({exists: false})
        writeFile.mockReturnValue(Promise.resolve())
        exec.mockReturnValue(Promise.resolve())
        return bumpr.publish().then((r) => {
          result = r
        })
      })

      afterEach(() => {
        bumpr.getLog.mockReset()
      })

      it('should check for packages', () => {
        expect(existsSync).toHaveBeenCalledWith('packages')
      })

      it('should not get stats for packages', () => {
        expect(statSync).not.toHaveBeenCalled()
      })

      it('should log publishing', () => {
        expect(Logger.log).toHaveBeenCalledWith('Publishing to npm')
      })

      it('should write out the .npmrc file', () => {
        // eslint-disable-next-line no-template-curly-in-string
        expect(writeFile).toHaveBeenCalledWith('.npmrc', '//registry.npmjs.org/:_authToken=${NPM_TOKEN}')
      })

      it('should publish', () => {
        expect(exec).toHaveBeenCalledWith('npm publish .', {cwd: '.', maxBuffer: 1024 * 1024})
      })

      it('should maybe send a slack message', () => {
        expect(bumpr.maybeSendSlackMessage).toHaveBeenCalledWith({scope: 'minor'})
      })

      it('should resolve with the result of maybe sending the slack message', () => {
        expect(result).toEqual('done')
      })
    })

    describe('when scope is not "none" (and packages exists but is not a directory)', () => {
      let result
      beforeEach(() => {
        const log = {scope: 'minor'}
        jest.spyOn(bumpr, 'getLog').mockReturnValue(Promise.resolve({log}))
        setupPkgs({exists: true, isDir: false})
        writeFile.mockReturnValue(Promise.resolve())
        exec.mockReturnValue(Promise.resolve())
        return bumpr.publish().then((r) => {
          result = r
        })
      })

      afterEach(() => {
        bumpr.getLog.mockReset()
      })

      it('should check for packages', () => {
        expect(existsSync).toHaveBeenCalledWith('packages')
      })

      it('should get stats for packages', () => {
        expect(statSync).toHaveBeenCalledWith('packages')
      })

      it('should log publishing', () => {
        expect(Logger.log).toHaveBeenCalledWith('Publishing to npm')
      })

      it('should write out the .npmrc file', () => {
        // eslint-disable-next-line no-template-curly-in-string
        expect(writeFile).toHaveBeenCalledWith('.npmrc', '//registry.npmjs.org/:_authToken=${NPM_TOKEN}')
      })

      it('should publish', () => {
        expect(exec).toHaveBeenCalledWith('npm publish .', {cwd: '.', maxBuffer: 1024 * 1024})
      })

      it('should maybe send a slack message', () => {
        expect(bumpr.maybeSendSlackMessage).toHaveBeenCalledWith({scope: 'minor'})
      })

      it('should resolve with the result of maybe sending the slack message', () => {
        expect(result).toEqual('done')
      })
    })

    describe('when scope is not "none" (and packages exists as a directory)', () => {
      let result
      beforeEach(() => {
        const log = {scope: 'minor'}
        jest.spyOn(bumpr, 'getLog').mockReturnValue(Promise.resolve({log}))
        setupPkgs({
          exists: true,
          isDir: true,
          pkgs: [
            {dir: true, name: 'pkg1'},
            {dir: false, name: 'file1'},
            {dir: false, name: 'file2'},
            {dir: true, name: 'pkg2'},
            {dir: false, name: 'file3'},
          ],
        })
        writeFile.mockReturnValue(Promise.resolve())
        exec.mockReturnValue(Promise.resolve())
        return bumpr.publish().then((r) => {
          result = r
        })
      })

      afterEach(() => {
        bumpr.getLog.mockReset()
      })

      it('should check for packages', () => {
        expect(existsSync).toHaveBeenCalledWith('packages')
      })

      it('should get stats for packages', () => {
        expect(statSync).toHaveBeenCalledWith('packages')
      })

      it('should log publishing', () => {
        expect(Logger.log).toHaveBeenCalledWith('Publishing to npm')
      })

      it('should write out the .npmrc file', () => {
        // eslint-disable-next-line no-template-curly-in-string
        expect(writeFile).toHaveBeenCalledWith('.npmrc', '//registry.npmjs.org/:_authToken=${NPM_TOKEN}')
      })

      it('should publish first package', () => {
        expect(exec).toHaveBeenCalledWith('npm publish .', {cwd: 'packages/pkg1', maxBuffer: 1024 * 1024})
      })

      it('should publish second package', () => {
        expect(exec).toHaveBeenCalledWith('npm publish .', {cwd: 'packages/pkg2', maxBuffer: 1024 * 1024})
      })

      it('should not publish file', () => {
        expect(exec).not.toHaveBeenCalledWith('npm publish .', {cwd: 'packages/file1', maxBuffer: 1024 * 1024})
      })

      it('should not publish root', () => {
        expect(exec).not.toHaveBeenCalledWith('npm publish .', {cwd: '.', maxBuffer: 1024 * 1024})
      })

      it('should maybe send a slack message', () => {
        expect(bumpr.maybeSendSlackMessage).toHaveBeenCalledWith({scope: 'minor'})
      })

      it('should resolve with the result of maybe sending the slack message', () => {
        expect(result).toEqual('done')
      })
    })
  })

  describe('.tag()', () => {
    let result
    let info
    let error

    beforeEach(() => {
      result = null
      error = null
      bumpr.config.foo = 'bar'
      bumpr.vcs = {foo: 'bar'}
      bumpr.ci = {
        push() {},
        setupGitEnv: jest.fn().mockReturnValue(Promise.resolve()),
      }
      info = {
        author: '',
        authorUrl: '',
        changelog: '',
        number: -1,
        modifiedFiles: ['CHANGELOG.md', 'package.json'],
        scope: 'patch',
        url: '',
        version: '1.2.3',
      }

      jest.spyOn(bumpr, 'maybeCreateTag').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybePushChanges').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumpr, 'maybeCreateRelease').mockReturnValue(Promise.resolve('released'))
      jest.spyOn(utils, 'readJsonFile').mockReturnValueOnce({version: '1.2.3'})
    })

    afterEach(() => {
      utils.readJsonFile.mockRestore()
      bumpr.maybeCreateTag.mockRestore()
      bumpr.maybePushChanges.mockRestore()
    })

    describe('when a merge build', () => {
      describe('when no infoFile given', () => {
        beforeEach((done) => {
          bumpr
            .tag({infoFile: ''})
            .then((res) => {
              result = res
            })
            .catch((err) => {
              error = err
            })
            .finally(() => {
              done()
            })
        })

        it('should setup git env', () => {
          expect(bumpr.ci.setupGitEnv).toHaveBeenCalled()
        })

        it('should maybe create the tag', () => {
          expect(bumpr.maybeCreateTag).toHaveBeenCalledWith(info)
        })

        it('should maybe push the changes', () => {
          expect(bumpr.maybePushChanges).toHaveBeenCalledWith(info)
        })

        it('should maybe create a release', () => {
          expect(bumpr.maybeCreateRelease).toHaveBeenCalledWith(info)
        })

        it('should resolve with the result of the maybeCreateRelease() call', () => {
          expect(result).toBe('released')
        })

        it('should not reject', () => {
          expect(error).toBe(null)
        })
      })

      describe('when infoFile given', () => {
        let prInfo
        beforeEach((done) => {
          prInfo = {
            author: 'job13er',
            authorUrl: 'https://github.com/job13er',
            changelog: 'some-changelog',
            number: 13,
            scope: 'minor',
            url: 'https://github.com/all-i-code/bumpr/pulls/13',
          }

          utils.readJsonFile.mockReturnValueOnce(prInfo)

          info = {
            ...info,
            ...prInfo,
          }

          // We need to mock returning the correct, updated info (@job13er 2022-12-20)
          bumpr.maybeCreateTag.mockRestore()
          bumpr.maybePushChanges.mockRestore()
          jest.spyOn(bumpr, 'maybeCreateTag').mockReturnValue(Promise.resolve(info))
          jest.spyOn(bumpr, 'maybePushChanges').mockReturnValue(Promise.resolve(info))

          bumpr
            .tag({infoFile: 'some-file'})
            .then((res) => {
              result = res
            })
            .catch((err) => {
              error = err
            })
            .finally(() => {
              done()
            })
        })

        it('should read info file', () => {
          expect(utils.readJsonFile).lastCalledWith('some-file')
        })

        it('should setup git env', () => {
          expect(bumpr.ci.setupGitEnv).toHaveBeenCalled()
        })

        it('should maybe create the tag', () => {
          expect(bumpr.maybeCreateTag).toHaveBeenCalledWith(info)
        })

        it('should maybe push the changes', () => {
          expect(bumpr.maybePushChanges).toHaveBeenCalledWith(info)
        })

        it('should maybe create a release', () => {
          expect(bumpr.maybeCreateRelease).toHaveBeenCalledWith(info)
        })

        it('should resolve with the result of the maybeCreateRelease() call', () => {
          expect(result).toBe('released')
        })

        it('should not reject', () => {
          expect(error).toBe(null)
        })
      })
    })

    describe('when not a merge build', () => {
      beforeEach((done) => {
        set(bumpr.config, 'computed.ci.isPr', true)
        bumpr
          .tag({infoFile: ''})
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should log that non merge builds are skipped', () => {
        expect(Logger.log).toHaveBeenCalledWith('Not a merge build, skipping tag')
      })

      it('should not setup git env', () => {
        expect(bumpr.ci.setupGitEnv).not.toHaveBeenCalled()
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
        getMergedPrBySha: jest.fn().mockReturnValue(resolver.promise),
      }

      // actual results of git rev-list HEAD --max-count=1 on bumpr repo
      const gitRevList = '\n7fcea24fae604a47cdb3436b49ecc18882aa5e31\n'

      exec.mockReturnValue(Promise.resolve({stdout: gitRevList}))
      promise = bumpr
        .getLastPr(1)
        .then((pr) => {
          resolution = pr
          return pr
        })
        .catch((err) => {
          rejection = err
          throw err
        })
    })

    it('should call git rev-list', () => {
      expect(exec).toHaveBeenCalledWith('git rev-list HEAD --max-count=1 --skip=1')
    })

    describe('when getMergedPrBySha() succeeds', () => {
      beforeEach(() => {
        resolver.resolve('the-pr')
        return promise
      })

      it('should lookup merged PR by sha', () => {
        expect(bumpr.vcs.getMergedPrBySha).toHaveBeenCalledWith('7fcea24fae604a47cdb3436b49ecc18882aa5e31')
      })

      it('should resolve with the pr', () => {
        expect(resolution).toBe('the-pr')
      })
    })

    describe('when getMergedPrBySha() fails', () => {
      beforeEach((done) => {
        resolver.reject('the-error')
        promise.catch(() => {
          done()
        })
      })

      it('should reject with the error', () => {
        expect(rejection).toBe('the-error')
      })
    })
  })

  describe('.getMergedPrInfo()', () => {
    ;['major', 'minor', 'patch'].forEach((scope) => {
      describe(`when scope is ${scope}`, () => {
        let result
        let pr

        beforeEach(() => {
          bumpr.config = {
            features: {
              maxScope: {
                value: 'minor',
              },
            },
            foo: 'bar',
            isEnabled: jest.fn(),
          }
          bumpr.vcs = {bar: 'baz'}
          pr = {
            author: 'bot',
            authorUrl: 'bot-profile',
            number: '1',
            url: '/pulls/1',
          }

          jest.spyOn(bumpr, 'getLastPr').mockReturnValue(Promise.resolve(pr))
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
            bumpr.config.isEnabled.mockImplementation((name) => name === 'maxScope')
          })

          describe('when changelog feature is enabled', () => {
            beforeEach(() => {
              bumpr.config.isEnabled.mockImplementation((name) => ['changelog', 'maxScope'].includes(name))
              return bumpr.getMergedPrInfo(1).then((res) => {
                result = res
              })
            })

            it('should get the last PR to be merged', () => {
              expect(bumpr.getLastPr).toHaveBeenCalledWith(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith(pr, 'minor')
            })

            it('should get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledWith(pr, [])
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({
                author: 'bot',
                authorUrl: 'bot-profile',
                changelog: 'my-changelog',
                modifiedFiles: [],
                number: '1',
                scope,
                url: '/pulls/1',
              })
            })
          })

          describe('when changelog feature is not enabled', () => {
            /* eslint-disable arrow-body-style */
            beforeEach(() => {
              return bumpr.getMergedPrInfo(2).then((res) => {
                result = res
              })
            })
            /* eslint-enable arrow-body-style */

            it('should get the last PR to be merged', () => {
              expect(bumpr.getLastPr).toHaveBeenCalledWith(2)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith(pr, 'minor')
            })

            it('should not get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({
                author: 'bot',
                authorUrl: 'bot-profile',
                changelog: '',
                modifiedFiles: [],
                number: '1',
                scope,
                url: '/pulls/1',
              })
            })
          })
        })

        describe('when maxScope is disabled', () => {
          beforeEach(() => {
            bumpr.config.isEnabled.mockReturnValue(false)
          })

          describe('when changelog feature is enabled', () => {
            beforeEach(() => {
              bumpr.config.isEnabled.mockImplementation((name) => name === 'changelog')
              return bumpr.getMergedPrInfo(0).then((res) => {
                result = res
              })
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith(pr, 'major')
            })
          })

          describe('when changelog feature is not enabled', () => {
            /* eslint-disable arrow-body-style */
            beforeEach(() => {
              return bumpr.getMergedPrInfo(0).then((res) => {
                result = res
              })
            })
            /* eslint-enable arrow-body-style */

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith(pr, 'major')
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
          bumpr.config.isEnabled.mockImplementation((name) => name === 'changelog')
          return bumpr.getMergedPrInfo(3).then((res) => {
            result = res
          })
        })

        it('should get the last PR to be merged', () => {
          expect(bumpr.getLastPr).toHaveBeenCalledWith(3)
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
          return bumpr.getMergedPrInfo(0).then((res) => {
            result = res
          })
        })

        it('should get the last PR to be merged', () => {
          expect(bumpr.getLastPr).toHaveBeenCalledWith(0)
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
            prNumber: '123',
          },
        },
        isEnabled: jest.fn(),
      }
      bumpr.vcs = {
        getPr: jest.fn().mockReturnValue(Promise.resolve('the-pr')),
      }
      utils.getChangelogForPr.mockReturnValue('the-changelog')
      utils.getScopeForPr.mockReturnValue('patch')
      utils.maybePostCommentOnError
        .mockReturnValueOnce({
          pr: 'the-pr',
          scope: 'the-scope',
        })
        .mockReturnValueOnce({
          changelog: 'the-changelog',
          scope: 'the-scope',
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
        return bumpr.getOpenPrInfo().then((res) => {
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
          scope: 'the-scope',
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
              scope: 'patch',
            })
          })
        })
      })
    })

    describe('when maxScope is enabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation((name) => name === 'maxScope')
        set(bumpr.config, 'features.maxScope.value', 'minor')
        return bumpr.getOpenPrInfo().then((res) => {
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
          scope: 'the-scope',
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
              scope: 'patch',
            })
          })
        })
      })
    })

    describe('when changelog is enabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation((name) => name === 'changelog')
        return bumpr.getOpenPrInfo().then((res) => {
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
          scope: 'the-scope',
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
              scope: 'patch',
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
            expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr', [])
          })

          it('should return the changelog and scope', () => {
            expect(ret).toEqual({
              changelog: 'the-changelog',
              scope: 'the-scope',
            })
          })
        })
      })
    })

    describe('when changelog is enabled and required set', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation((name) => name === 'changelog')
        bumpr.config.features = {changelog: {enabled: true, required: ['DEV-\\d+']}}

        return bumpr.getOpenPrInfo().then((res) => {
          result = res
        })
      })

      describe('the second call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          ;[, args] = utils.maybePostCommentOnError.mock.calls
        })

        describe('when the wrapped function is called', () => {
          beforeEach(() => {
            args[2]()
          })

          it('should get the changelog and look for required', () => {
            expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr', ['DEV-\\d+'])
          })
        })
      })
    })
  })

  describe('.maybeBumpVersion()', () => {
    beforeEach(() => {
      const original = path.join(__dirname, '_package.json')
      const otherOriginal = path.join(__dirname, '_package-with-pre-release.json')
      const originalPkgs = path.join(__dirname, 'packages')
      return realExec(`cp ${original} _package.json`)
        .then(() => realExec(`cp ${otherOriginal} _package-with-pre-release.json`))
        .then(() => realExec(`cp -r ${originalPkgs} packages`))
    })

    afterEach(() => realExec('rm -rf _package.json _package-with-pre-release.json packages'))

    itShouldBumpVersion(() => bumpr, '_package.json', 'none', '1.2.3')
    itShouldBumpVersion(() => bumpr, '_package.json', 'patch', '1.2.4')
    itShouldBumpVersion(() => bumpr, '_package.json', 'minor', '1.3.0')
    itShouldBumpVersion(() => bumpr, '_package.json', 'major', '2.0.0')

    itShouldBumpVersion(() => bumpr, '_package.json', 'none', '1.2.3', ['pkg1, pkg2'])
    itShouldBumpVersion(() => bumpr, '_package.json', 'patch', '1.2.4', ['pkg1', 'pkg2'])
    itShouldBumpVersion(() => bumpr, '_package.json', 'minor', '1.3.0', ['pkg1', 'pkg2'])
    itShouldBumpVersion(() => bumpr, '_package.json', 'major', '2.0.0', ['pkg1', 'pkg2'])

    itShouldBumpVersion(() => bumpr, '_package-with-pre-release.json', 'none', '1.2.3-alpha.4')
    itShouldBumpVersion(() => bumpr, '_package-with-pre-release.json', 'patch', '1.2.3-alpha.5')

    describe('an invalid scope', () => {
      let info
      let err
      beforeEach(() => {
        bumpr.config.files = ['_package.json']
        info = {scope: 'foo'}
        return bumpr.maybeBumpVersion(info).catch((e) => {
          err = e
        })
      })

      it('should throw an Error', () => {
        expect(err.toString()).toBe('Error: Invalid scope [foo]')
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
        version: '1.2.3',
      }
      set(bumpr.config, 'computed.ci.buildNumber', '12345')

      bumpr.ci = {
        add: jest.fn().mockReturnValue(Promise.resolve()),
        commit: jest.fn().mockReturnValue(Promise.resolve()),
        setupGitEnv: jest.fn().mockReturnValue(Promise.resolve()),
      }
    })

    describe('when no files were modified', () => {
      beforeEach((done) => {
        result = null
        error = null
        bumpr
          .maybeCommitChanges(info)
          .then((r) => {
            result = r
          })
          .catch((e) => {
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
      beforeEach((done) => {
        info.modifiedFiles = ['fizz', 'bang']
        result = null
        error = null
        bumpr
          .maybeCommitChanges(info)
          .then((r) => {
            result = r
          })
          .catch((e) => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should not log info about skipping', () => {
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringMatching(/^Skipping/))
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

  describe('.maybeCreateRelease()', () => {
    let result
    let info

    beforeEach(() => {
      info = {
        version: '1.2.3',
      }
      set(bumpr.config, 'computed.ci.buildNumber', '12345')
      bumpr.vcs = {
        createRelease: jest.fn().mockReturnValue(Promise.resolve({upload_url: 'upload-url{?name,label}'})),
        uploadReleaseAsset: jest.fn().mockReturnValue(Promise.resolve('uploaded')),
      }
    })

    describe('when feature is not enabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)
        return bumpr.maybeCreateRelease(info).then((res) => {
          result = res
        })
      })

      it('should not create a release', () => {
        expect(bumpr.vcs.createRelease).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when scope is "none"', () => {
      beforeEach(() => {
        info.scope = 'none'
        bumpr.config.isEnabled.mockImplementation((name) => name === 'release')
        return bumpr.maybeCreateRelease(info).then((res) => {
          result = res
        })
      })

      it('should not create a release', () => {
        expect(bumpr.vcs.createRelease).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when scope is not "none", but no artifacts exist', () => {
      let dateString
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation((name) => name === 'release')
        bumpr.config.features = {release: {enabled: true}}
        info.scope = 'patch'
        info.changelog = 'the-changelog'
        dateString = bumpr.getDateString()
        return bumpr.maybeCreateRelease(info).then((res) => {
          result = res
        })
      })

      it('should create a release', () => {
        expect(bumpr.vcs.createRelease).toHaveBeenCalledWith(
          'v1.2.3',
          `[1.2.3] - ${dateString}`,
          '## Changelog\nthe-changelog'
        )
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when scope is not "none", with artifacts', () => {
      let dateString
      beforeEach(() => {
        bumpr.config.isEnabled.mockImplementation((name) => name === 'release')
        bumpr.config.features = {release: {enabled: true, artifacts: 'artifacts-dir'}}
        info.scope = 'patch'
        info.changelog = 'the-changelog'
        dateString = bumpr.getDateString()

        readdir.mockReturnValueOnce(Promise.resolve(['file1.txt', 'file2.zip', 'file3.png', 'file4.foo']))
        statSync.mockReturnValueOnce({size: 123})
        statSync.mockReturnValueOnce({size: 321})
        statSync.mockReturnValueOnce({size: 999})
        statSync.mockReturnValueOnce({size: 8888})
        createReadStream.mockReturnValueOnce('stream1')
        createReadStream.mockReturnValueOnce('stream2')
        createReadStream.mockReturnValueOnce('stream3')
        createReadStream.mockReturnValueOnce('stream4')

        return bumpr.maybeCreateRelease(info).then((res) => {
          result = res
        })
      })

      it('should create a release', () => {
        expect(bumpr.vcs.createRelease).toHaveBeenCalledWith(
          'v1.2.3',
          `[1.2.3] - ${dateString}`,
          '## Changelog\nthe-changelog'
        )
      })

      it('should list files in the artifacts dir', () => {
        expect(readdir).toHaveBeenCalledWith('artifacts-dir')
      })

      it('should lookup file size for all artifacts', () => {
        expect(statSync.mock.calls).toEqual([
          ['artifacts-dir/file1.txt'],
          ['artifacts-dir/file2.zip'],
          ['artifacts-dir/file3.png'],
          ['artifacts-dir/file4.foo'],
        ])
      })

      it('should upload all the  artifacts', () => {
        expect(bumpr.vcs.uploadReleaseAsset.mock.calls).toEqual([
          ['upload-url?name=file1.txt', 'text/plain; charset=utf-8', 123, 'stream1'],
          ['upload-url?name=file2.zip', 'application/zip', 321, 'stream2'],
          ['upload-url?name=file3.png', 'image/png', 999, 'stream3'],
          ['upload-url?name=file4.foo', 'application/octet-stream', 8888, 'stream4'],
        ])
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('.maybeCreateTag()', () => {
    let result
    let info

    describe('when feature is enabled (default)', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(true)

        info = {
          version: '1.2.3',
        }
        set(bumpr.config, 'computed.ci.buildNumber', '12345')
        bumpr.ci = {
          tag: jest.fn().mockReturnValue(Promise.resolve('tagged')),
        }
        exec.mockReturnValue(Promise.resolve())
      })

      describe('when scope is not "none"', () => {
        /* eslint-disable arrow-body-style */
        beforeEach(() => {
          return bumpr.maybeCreateTag(info).then((res) => {
            result = res
          })
        })
        /* eslint-enable arrow-body-style */

        it('should check tag feature', () => {
          expect(bumpr.config.isEnabled).lastCalledWith('tag')
        })

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
          return bumpr.maybeCreateTag(info).then((res) => {
            result = res
          })
        })

        it('should check tag feature', () => {
          expect(bumpr.config.isEnabled).lastCalledWith('tag')
        })

        it('should not create a tag', () => {
          expect(bumpr.ci.tag).toHaveBeenCalledTimes(0)
        })

        it('should resolve with the result of the tag', () => {
          expect(result).toBe(info)
        })
      })
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)

        info = {
          version: '1.2.3',
        }
        set(bumpr.config, 'computed.ci.buildNumber', '12345')
        set(bumpr.config, 'features.tag.enabled', false)

        bumpr.ci = {
          tag: jest.fn(),
        }
      })

      describe('when scope is not "none"', () => {
        /* eslint-disable arrow-body-style */
        beforeEach(() => {
          return bumpr.maybeCreateTag(info).then((res) => {
            result = res
          })
        })
        /* eslint-enable arrow-body-style */

        it('should check tag feature', () => {
          expect(bumpr.config.isEnabled).lastCalledWith('tag')
        })

        it('should not create a tag', () => {
          expect(bumpr.ci.tag).not.toHaveBeenCalled()
        })

        it('should resolve with the result of the tag', () => {
          expect(result).toBe(info)
        })
      })

      describe('when scope is "none"', () => {
        beforeEach(() => {
          info.scope = 'none'
          return bumpr.maybeCreateTag(info).then((res) => {
            result = res
          })
        })

        it('should check tag feature', () => {
          expect(bumpr.config.isEnabled).lastCalledWith('tag')
        })

        it('should not create a tag', () => {
          expect(bumpr.ci.tag).not.toHaveBeenCalled()
        })

        it('should resolve with the result of the tag', () => {
          expect(result).toBe(info)
        })
      })
    })
  })

  describe('.maybeUpdateChangelog()', () => {
    let result
    let info

    beforeEach(() => {
      info = {
        changelog: 'the-changelog-content',
        modifiedFiles: [],
        number: 123,
        scope: 'patch',
        url: 'https://github.com/org/repo/pulls/123',
        version: '1.2.3',
      }
      set(bumpr.config, 'features.changelog.file', 'the-changelog-file')
      replace.mockReturnValue(Promise.resolve('return-value'))
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)

        return bumpr.maybeUpdateChangelog(info).then((resp) => {
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
        bumpr.config.isEnabled.mockImplementation((name) => name === 'changelog')

        return bumpr.maybeUpdateChangelog(info).then((resp) => {
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

    describe('when feature is enabled and scope is not "none" (no timzeone set)', () => {
      beforeEach(() => {
        info.scope = 'patch'
        bumpr.config.isEnabled.mockImplementation((name) => name === 'changelog')

        return bumpr.maybeUpdateChangelog(info).then((resp) => {
          result = resp
        })
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringMatching(/^Skipping/))
      })

      it('should update the changelog', () => {
        const dateString = moment().tz('Etc/UTC').format('YYYY-MM-DD')
        const prLink = '[PR 123](https://github.com/org/repo/pulls/123)'
        const data = `<!-- bumpr -->\n\n## [${info.version}] - ${dateString} (${prLink})\n${info.changelog}`
        expect(replace).toHaveBeenCalledWith({
          files: 'the-changelog-file',
          from: /<!-- bumpr -->/,
          to: data,
        })
      })

      it('should add the changelog file to the modifiedFiles list', () => {
        expect(info.modifiedFiles).toContain('the-changelog-file')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled and scope is not "none" (with timezone set)', () => {
      beforeEach(() => {
        info.scope = 'patch'
        bumpr.config.isEnabled.mockImplementation((name) => ['changelog', 'timezone'].includes(name))
        set(bumpr.config, 'features.timezone.zone', 'America/Denver')

        return bumpr.maybeUpdateChangelog(info).then((resp) => {
          result = resp
        })
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringMatching(/^Skipping/))
      })

      it('should update the changelog', () => {
        const dateString = moment().tz('America/Denver').format('YYYY-MM-DD')
        const prLink = '[PR 123](https://github.com/org/repo/pulls/123)'
        const data = `<!-- bumpr -->\n\n## [${info.version}] - ${dateString} (${prLink})\n${info.changelog}`
        expect(replace).toHaveBeenCalledWith({
          files: 'the-changelog-file',
          from: /<!-- bumpr -->/,
          to: data,
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
        scope: 'none',
      }

      bumpr.ci = {
        push: jest.fn().mockReturnValue(Promise.resolve('pushed')),
      }
    })

    describe('when nothing changed', () => {
      /* eslint-disable arrow-body-style */
      beforeEach(() => {
        return bumpr.maybePushChanges(info).then((r) => {
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
        return bumpr.maybePushChanges(info).then((r) => {
          result = r
        })
      })

      it('should not log a message about why it is skipping', () => {
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringMatching(/^Skipping/))
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
        author: 'bot',
        authorUrl: 'bot-profile',
        changelog: 'the-changelog-content',
        modifiedFiles: [],
        number: '1',
        scope: 'patch',
        url: '/pulls/1',
        version: '1.2.3',
      }
      set(bumpr.config, 'features.logging.file', 'the-log-file')
      writeFile.mockReturnValue(Promise.resolve())
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)

        return bumpr.maybeLogChanges(info).then((resp) => {
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
        bumpr.config.isEnabled.mockImplementation((name) => name === 'logging')

        return bumpr.maybeLogChanges(info).then((resp) => {
          result = resp
        })
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringMatching(/^Skipping/))
      })

      it('should write the log', () => {
        const logInfo = {
          changelog: 'the-changelog-content',
          pr: {
            number: '1',
            url: '/pulls/1',
            user: {
              login: 'bot',
              url: 'bot-profile',
            },
          },
          scope: 'patch',
          version: '1.2.3',
        }
        expect(writeFile).toHaveBeenCalledWith('the-log-file', JSON.stringify(logInfo, null, 2))
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('.maybeSendSlackMessage()', () => {
    let info

    beforeEach(() => {
      info = {
        changelog: 'the-changelog-content',
        pr: {
          number: 5,
          url: 'the-pr-url',
          user: {
            login: 'bot',
            url: 'bot-profile',
          },
        },
        scope: 'patch',
        version: '1.2.3',
      }
      writeFile.mockReturnValue(Promise.resolve())
      jest.spyOn(utils, 'readJsonFile').mockReturnValue({name: 'the-package'})
    })

    afterEach(() => {
      utils.readJsonFile.mockRestore()
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumpr.config.isEnabled.mockReturnValue(false)

        return bumpr.maybeSendSlackMessage(info)
      })

      it('should not read in anything', () => {
        expect(utils.readJsonFile).not.toHaveBeenCalled()
      })

      it('should log why it is skipping', () => {
        expect(Logger.log).toHaveBeenCalledWith('Skipping sending slack message because of config option.')
      })

      it('should not send anything', () => {
        expect(fetch).not.toHaveBeenCalled()
      })
    })

    describe('when no channels configured', () => {
      beforeEach(() => {
        set(bumpr.config, 'computed.slackUrl', 'the-slack-url')
        set(bumpr.config, 'features.slack.channels', [])
        bumpr.config.isEnabled.mockImplementation((name) => name === 'slack')
        fetch.mockReturnValue(Promise.resolve())
        return bumpr.maybeSendSlackMessage(info)
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringMatching(/^Skipping/))
      })

      it('should send the slack message', () => {
        expect(fetch).toHaveBeenCalledWith('the-slack-url', {
          headers: {'Content-Type': 'application/json'},
          method: 'POST',
          body: JSON.stringify({
            text: 'Published `the-package@1.2.3` (patch) from <the-pr-url|PR #5> by <bot-profile|bot>',
          }),
        })
      })
    })

    describe('when channels are configured', () => {
      beforeEach(() => {
        set(bumpr.config, 'computed.slackUrl', 'the-slack-url')
        set(bumpr.config, 'features.slack.channels', ['#foo', '#bar', '#baz'])
        bumpr.config.isEnabled.mockImplementation((name) => name === 'slack')
        fetch.mockReturnValue(Promise.resolve())
        return bumpr.maybeSendSlackMessage(info)
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(Logger.log).not.toHaveBeenCalledWith(expect.stringMatching(/^Skipping/))
      })

      it('should send the first slack message', () => {
        expect(fetch).toHaveBeenCalledWith('the-slack-url', {
          headers: {'Content-Type': 'application/json'},
          method: 'POST',
          body: JSON.stringify({
            channel: '#foo',
            text: 'Published `the-package@1.2.3` (patch) from <the-pr-url|PR #5> by <bot-profile|bot>',
          }),
        })
      })

      it('should send the second slack message', () => {
        expect(fetch).toHaveBeenCalledWith('the-slack-url', {
          headers: {'Content-Type': 'application/json'},
          method: 'POST',
          body: JSON.stringify({
            channel: '#bar',
            text: 'Published `the-package@1.2.3` (patch) from <the-pr-url|PR #5> by <bot-profile|bot>',
          }),
        })
      })

      it('should send the third slack message', () => {
        expect(fetch).toHaveBeenCalledWith('the-slack-url', {
          headers: {'Content-Type': 'application/json'},
          method: 'POST',
          body: JSON.stringify({
            channel: '#baz',
            text: 'Published `the-package@1.2.3` (patch) from <the-pr-url|PR #5> by <bot-profile|bot>',
          }),
        })
      })
    })
  })
})
