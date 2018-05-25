require('../typedefs')

const CiBase = require('./base')

/**
 * CI interface for public Circle (circleci.com)
 *
 * @class
 * @implements {Ci}
 */
class Circle extends CiBase {}

module.exports = Circle
