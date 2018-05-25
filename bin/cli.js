#!/usr/bin/env node

/* eslint-disable no-console */

const chalk = require('chalk')
const program = require('commander')
const {name, version} = require('../package.json')
const {createBumpr} = require('../src/cli')

function handleError(error) {
  const msg = error.message ? error.message : error
  console.log(`${chalk.cyanBright(name)}: ${chalk.red.bold('Error:')} ${msg}`)
  process.exit(1)
}

let bumpr
try {
  bumpr = createBumpr()
} catch (err) {
  handleError(err)
}

program.version(version)

program
  .command('check')
  .description('verify an open PR has a version bump comment')
  .action(() => {
    bumpr.check().catch(handleError)
  })

program
  .command('bump')
  .description('actually bump the version based on a merged PR')
  .action(() => {
    bumpr.bump().catch(handleError)
  })

program
  .command('log <key>')
  .description(`Output the given key from the ${name} log file`)
  .action(key => {
    bumpr
      .log(key)
      .then(value => {
        console.log(value)
      })
      .catch(handleError)
  })

program
  .command('publish')
  .description('actually publish the newly bumped version')
  .action(() => {
    bumpr.publish().catch(handleError)
  })

program.parse(process.argv)
