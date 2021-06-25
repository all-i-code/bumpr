const chalk = require('chalk')

class MissingKeyError extends Error {
  constructor(key, logFile) {
    super(`no ${chalk.yellowBright(key)} key found in ${chalk.magentaBright(logFile)}`)
  }
}

module.exports = MissingKeyError
