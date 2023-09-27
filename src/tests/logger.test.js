import {Logger} from '../logger.js'
import pkgJson from '../../package.json' assert {type: 'json'}

const {name} = pkgJson

/* eslint-disable no-console */

describe('Logger', () => {
  let realVerbose

  beforeEach(() => {
    realVerbose = process.env.VERBOSE
  })

  afterEach(() => {
    process.env.VERBOSE = realVerbose
  })

  describe('.log()', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      console.log.mockRestore()
    })

    describe('when VERBOSE is not in env', () => {
      beforeEach(() => {
        delete process.env.VERBOSE
      })

      it('should not log to console when force is omited', () => {
        Logger.log('foo bar baz')
        expect(console.log).toHaveBeenCalledTimes(0)
      })

      it('should not log to console when force is false', () => {
        Logger.log('foo bar baz', false)
        expect(console.log).toHaveBeenCalledTimes(0)
      })

      it('should log to console when force is true', () => {
        Logger.log('foo bar baz', true)
        expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })
    })

    describe('when VERBOSE is in env', () => {
      beforeEach(() => {
        process.env.VERBOSE = '1'
      })

      it('should log to console when force is omited', () => {
        Logger.log('foo bar baz')
        expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })

      it('should log to console when force is false', () => {
        Logger.log('foo bar baz', false)
        expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })

      it('should log to console when force is true', () => {
        Logger.log('foo bar baz', true)
        expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })
    })
  })

  describe('.error()', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      console.error.mockRestore()
    })

    describe('when VERBOSE is not in the env', () => {
      beforeEach(() => {
        delete process.env.VERBOSE
      })

      it('should log to console', () => {
        Logger.error('foo bar baz')
        expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })
    })

    describe('when VERBOSE is in the env', () => {
      beforeEach(() => {
        process.env.VERBOSE = '1'
      })

      it('should log to console', () => {
        Logger.error('foo bar baz')
        expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })
    })
  })
})
