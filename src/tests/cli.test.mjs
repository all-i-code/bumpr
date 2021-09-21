jest.mock('../logger.mjs')
jest.mock('../utils.mjs')
jest.mock('../bumpr.mjs')
jest.mock('../ci/circle.mjs')
jest.mock('../ci/travis.mjs')
jest.mock('../vcs/github.mjs')

// Need to mock out imports, so jest calls need to go above them (@job13er 2021-09-21)
/* eslint-disable import/first */
import chalk from 'chalk'
import Bumpr from '../bumpr.mjs'
import Circle from '../ci/circle.mjs'
import Travis from '../ci/travis.mjs'
import createBumpr from '../cli.mjs'
import {getConfig} from '../utils.mjs'
import GitHub from '../vcs/github.mjs'
/* eslint-enable import/first */

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
    vcs: {provider: 'github'}
  }

  let bumpr

  afterEach(() => {
    Bumpr.mockReset()
    getConfig.mockReset()
  })

  describe('When travis/github are configured', () => {
    beforeEach(() => {
      getConfig.mockReturnValue(Promise.resolve(cfg))
      return createBumpr().then(b => {
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
      vcs: {provider: 'github'}
    }
    beforeEach(() => {
      getConfig.mockReturnValue(Promise.resolve(circleCfg))
      return createBumpr().then(b => {
        bumpr = b
      })
    })

    it('should return an instance of Bumpr', () => {
      expect(bumpr).toBeInstanceOf(Bumpr)
    })

    itShouldCreateBumprWith(circleCfg, Circle, GitHub)
  })

  describe('with invalid ci provider', () => {
    let err
    beforeEach(() => {
      bumpr = null
      getConfig.mockReturnValue(
        Promise.resolve({
          ci: {provider: 'fizz-bang'},
          vcs: {provider: 'github'}
        })
      )

      return createBumpr().catch(e => {
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
      getConfig.mockReturnValue(
        Promise.resolve({
          ci: {provider: 'travis'},
          vcs: {provider: 'fizz-bang'}
        })
      )

      return createBumpr().catch(e => {
        err = e
      })
    })

    it('should error', () => {
      expect(err).toEqual(new Error(`Invalid vcs provider: ${chalk.red('fizz-bang')}`))
    })
  })
})
