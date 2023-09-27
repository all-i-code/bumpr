import chalk from 'chalk'
import Bumpr from './bumpr.js'
import {Logger} from './logger.js'
import utils from './utils.js'

// VCS implementations
import GitHub from './vcs/github.js'

// CI implementations
import Circle from './ci/circle.js'
import GitHubActions from './ci/github.js'
import Travis from './ci/travis.js'

/**
 * Get the ci instance to use based on the config
 * @param {Config} config - the pr-bumper config
 * @param {Vcs} vcs - the vcs instance
 * @returns {Ci} the ci instance
 * @throws Error when invalid provider given
 */
function getCi(config, vcs) {
  const {provider} = config.ci
  Logger.log(`Detected CI provider: ${provider} `)

  if (provider === 'travis') {
    return new Travis(config, vcs)
  }

  if (provider === 'circle') {
    return new Circle(config, vcs)
  }

  if (provider === 'github') {
    return new GitHubActions(config, vcs)
  }

  throw new Error(`Invalid ci provider: ${chalk.red(provider)}`)
}

/**
 * Get the vcs instance to use based on the config
 * @param {Config} config - the pr-bumper config
 * @returns {Vcs} the vcs instance
 * @throws Error when invalid provider given
 */
function getVcs(config) {
  const {provider} = config.vcs
  Logger.log(`Detected VCS provider: ${provider} `)

  if (provider === 'github') {
    return new GitHub(config)
  }

  throw new Error(`Invalid vcs provider: ${chalk.red(provider)}`)
}

/**
 * Run the specified command
 * @param {String} cmd - the command to run
 * @returns {Promise} a promise resolved when command finishes, or rejected with failure
 */
// eslint-disable-next-line import/prefer-default-export
export function createBumpr() {
  return utils.getConfig().then((config) => {
    const vcs = getVcs(config)
    const ci = getCi(config, vcs)
    return new Bumpr({ci, config, vcs})
  })
}
