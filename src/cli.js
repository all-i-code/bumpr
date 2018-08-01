require('./typedefs')

const chalk = require('chalk')
const Bumpr = require('./bumpr')
const {Logger} = require('./logger')
const utils = require('./utils')

// VCS implementations
const GitHub = require('./vcs/github')

// CI implementations
const Circle = require('./ci/circle')
const Travis = require('./ci/travis')

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
  } else if (provider === 'circle') {
    return new Circle(config, vcs)
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
exports.createBumpr = function createBumpr() {
  return utils.getConfig().then(config => {
    const vcs = getVcs(config)
    const ci = getCi(config, vcs)
    return new Bumpr({ci, config, vcs})
  })
}
