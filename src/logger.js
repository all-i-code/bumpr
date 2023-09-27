import {readFileSync} from 'fs'
import path from 'path'

const {name} = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), {encoding: 'utf-8'}))

/* eslint-disable no-console */

// eslint-disable-next-line import/prefer-default-export
export const Logger = {
  /**
   * Simple wrapper around console.log() to make it easy to mock it out in tests
   * @param {String} msg - the message to log
   * @param {Boolean} [force] - when true, log message even if VERBOSE is not set
   */
  log(msg, force) {
    if (force || process.env.VERBOSE) {
      console.log(`${name}: ${msg}`)
    }
  },

  /**
   * Simple wrapper around console.error() to make it easy to mock it out in tests
   * @param {String} msg - the message to log
   */
  error(msg) {
    console.error(`${name}: ${msg}`)
  },
}
