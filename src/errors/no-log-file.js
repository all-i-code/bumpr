import chalk from 'chalk'

export default class NoLogFileError extends Error {
  constructor(logFile) {
    super(`log file ${chalk.magentaBright(logFile)} not found.`)
  }
}
