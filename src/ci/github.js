require('../typedefs')

const CiBase = require('./base')

/**
 * CI interface for public GitHub Actions (github.com)
 *
 * @class
 * @implements {Ci}
 */
class GitHubActions extends CiBase {}

module.exports = GitHubActions
