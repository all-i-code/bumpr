import chalk from 'chalk'
import Bumpr from '../bumpr.js'
import Circle from '../ci/circle.js'
import GitHubActions from '../ci/github.js'
import Travis from '../ci/travis.js'
import {createBumpr} from '../cli.js'
import utils from '../utils.js'
import GitHub from '../vcs/github.js'

jest.mock('../logger.js')
jest.mock('../utils.js')
jest.mock('../bumpr.js')
jest.mock('../ci/circle.js')
jest.mock('../ci/github.js')
jest.mock('../ci/travis.js')
jest.mock('../vcs/github.js')

function itShouldCreateBumprWith(cfg, CiBase, VcsBase) {
  describe('Bumpr instantiation', () => {
    let ci
    let config
    let vcs
    beforeEach(() => {
      ;[[{ci, config, vcs}]] = Bumpr.mock.calls
    })

    it('should instantiate the bumper with the config', () => {
      expect(config).toEqual(cfg)
    })

    it('should instantiate the bumper with travis ci', () => {
      expect(ci).toBeInstanceOf(CiBase)
    })

    it('should instantiate the bumper with github vcs', () => {
      expect(vcs).toBeInstanceOf(VcsBase)
    })
  })
}

describe('createBumpr()', () => {
  const cfg = {
    ci: {provider: 'travis'},
    vcs: {provider: 'github'},
  }

  let bumpr

  afterEach(() => {
    Bumpr.mockReset()
    utils.getConfig.mockReset()
  })

  describe('When travis/github are configured', () => {
    beforeEach(() => {
      utils.getConfig.mockReturnValue(Promise.resolve(cfg))
      return createBumpr().then((b) => {
        bumpr = b
      })
    })

    it('should return an instance of Bumpr', () => {
      expect(bumpr).toBeInstanceOf(Bumpr)
    })

    itShouldCreateBumprWith(cfg, Travis, GitHub)
  })

  describe('When circle/github are configured', () => {
    const circleCfg = {
      ci: {provider: 'circle'},
      vcs: {provider: 'github'},
    }
    beforeEach(() => {
      utils.getConfig.mockReturnValue(Promise.resolve(circleCfg))
      return createBumpr().then((b) => {
        bumpr = b
      })
    })

    it('should return an instance of Bumpr', () => {
      expect(bumpr).toBeInstanceOf(Bumpr)
    })

    itShouldCreateBumprWith(circleCfg, Circle, GitHub)
  })

  describe('When github/github are configured', () => {
    const githubCfg = {
      ci: {provider: 'github'},
      vcs: {provider: 'github'},
    }
    beforeEach(() => {
      utils.getConfig.mockReturnValue(Promise.resolve(githubCfg))
      return createBumpr().then((b) => {
        bumpr = b
      })
    })

    it('should return an instance of Bumpr', () => {
      expect(bumpr).toBeInstanceOf(Bumpr)
    })

    itShouldCreateBumprWith(githubCfg, GitHubActions, GitHub)
  })

  describe('with invalid ci provider', () => {
    let err
    beforeEach(() => {
      bumpr = null
      utils.getConfig.mockReturnValue(
        Promise.resolve({
          ci: {provider: 'fizz-bang'},
          vcs: {provider: 'github'},
        })
      )

      return createBumpr().catch((e) => {
        err = e
      })
    })

    it('should error', () => {
      expect(err).toEqual(new Error(`Invalid ci provider: ${chalk.red('fizz-bang')}`))
    })
  })

  describe('with invalid vcs provider', () => {
    let err
    beforeEach(() => {
      utils.getConfig.mockReturnValue(
        Promise.resolve({
          ci: {provider: 'travis'},
          vcs: {provider: 'fizz-bang'},
        })
      )

      return createBumpr().catch((e) => {
        err = e
      })
    })

    it('should error', () => {
      expect(err).toEqual(new Error(`Invalid vcs provider: ${chalk.red('fizz-bang')}`))
    })
  })
})
