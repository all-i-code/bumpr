require('../typedefs')

const {Logger} = require('../logger')
const {exec} = require('../node-wrappers')
const CiBase = require('./base')

/**
 * CI interface for public Travis (travis-ci.org/travis-ci.com)
 *
 * @class
 * @implements {Ci}
 */
class Travis extends CiBase {
  /**
   * Push local changes to GitHub
   * @returns {Promise} a promise resolved with the result of the push
   */
  push() {
    const {branch} = this.config.computed.ci
    return this.vcs.addRemoteForPush().then((remoteName) => {
      Logger.log(`Pushing ci-${branch} to ${remoteName}`)
      return exec(`git push ${remoteName} ci-${branch}:refs/heads/${branch} --tags`).then(({stdout}) => stdout)
    })
  }

  /**
   * Prepare the git env within travis-ci
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  setupGitEnv() {
    const {branch} = this.config.computed.ci
    return super
      .setupGitEnv()
      .then(() => exec(`git checkout -b ci-${branch}`))
      .then(({stdout}) => stdout)
  }
}

module.exports = Travis
