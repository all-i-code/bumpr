import chalk from 'chalk'
import Bumpr from '../bumpr'
import Circle from '../ci/circle'
import GitHubActions from '../ci/github'
import Travis from '../ci/travis'
import {createBumpr} from '../cli'
import utils from '../utils'
import GitHub from '../vcs/github'

jest.mock('../logger')
jest.mock('../utils')
jest.mock('../bumpr')
jest.mock('../ci/circle')
jest.mock('../ci/github')
jest.mock('../ci/travis')
jest.mock('../vcs/github')

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
