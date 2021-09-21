import chalk from 'chalk'

export default class MissingKeyError extends Error {
  constructor(key, logFile) {
    super(`no ${chalk.yellowBright(key)} key found in ${chalk.magentaBright(logFile)}`)
  }
}
