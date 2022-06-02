jest.mock('../../node-wrappers')
jest.mock('../../logger')

const {Logger} = require('../../logger')
const {exec} = require('../../node-wrappers')
const CiBase = require('../base')
const Travis = require('../travis')
const {ensureCiBaseMethodIsUsed} = require('../test-utils')

describe('CI / Travis', () => {
  const ctx = {}
  let config
  let travis

  beforeEach(() => {
    config = {
      computed: {
        ci: {
          branch: 'my-branch',
        },
      },
    }
    travis = new Travis(config, {id: 'vcs'})
    ctx.ci = travis
  })

  it('should save the config', () => {
    expect(travis.config).toBe(config)
  })

  it('should save the vcs', () => {
    expect(travis.vcs).toEqual({id: 'vcs'})
  })

  it('should extend CiBase', () => {
    expect(travis).toBeInstanceOf(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')

  describe('.push()', () => {
    let result

    beforeEach(() => {
      travis.vcs = {addRemoteForPush() {}}
      jest.spyOn(travis.vcs, 'addRemoteForPush').mockReturnValue(Promise.resolve('ci-origin'))
      exec.mockReturnValue(Promise.resolve({stdout: 'pushed'}))

      return travis.push().then((res) => {
        result = res
      })
    })

    afterEach(() => {
      travis.vcs.addRemoteForPush.mockRestore()
    })

    it('should add the push remote via the vcs', () => {
      expect(travis.vcs.addRemoteForPush).toHaveBeenCalledTimes(1)
    })

    it('should log that it is about to push ci-my-branch to the new remote', () => {
      expect(Logger.log).toHaveBeenCalledWith('Pushing ci-my-branch to ci-origin')
    })

    it('should push the ci-my-branch branch to new remote', () => {
      expect(exec).toHaveBeenCalledWith('git push ci-origin ci-my-branch:refs/heads/my-branch --tags')
    })

    it('should resolve with result of the git push', () => {
      expect(result).toBe('pushed')
    })
  })

  describe('.setupGitEnv()', () => {
    let result

    beforeEach(() => {
      jest.spyOn(CiBase.prototype, 'setupGitEnv').mockReturnValue(Promise.resolve())
      exec.mockReturnValue(Promise.resolve({stdout: 'checked-out'}))

      return travis.setupGitEnv().then((res) => {
        result = res
      })
    })

    afterEach(() => {
      CiBase.prototype.setupGitEnv.mockRestore()
    })

    it('should call the base .setupGitEnv()', () => {
      expect(CiBase.prototype.setupGitEnv).toHaveBeenCalledTimes(1)
    })

    it('should create and check out ci-my-branch branch', () => {
      expect(exec).toHaveBeenCalledWith('git checkout -b ci-my-branch')
    })

    it('should resolve with the result of the git checkout', () => {
      expect(result).toBe('checked-out')
    })
  })
})
