const chalk = require('chalk')

class NoLogFileError extends Error {
  constructor(logFile) {
    super(`log file ${chalk.magentaBright(logFile)} not found.`)
  }
}

module.exports = NoLogFileError
