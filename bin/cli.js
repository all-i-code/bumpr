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

function withBumpr(callback) {
  createBumpr()
    .then(bumpr => callback(bumpr))
    .catch(handleError)
}

program.version(version)

program
  .command('check')
  .description('verify an open PR has a version bump comment')
  .action(() => {
    withBumpr(bumpr => bumpr.check())
  })

program
  .command('bump')
  .description('actually bump the version based on a merged PR')
  .action(() => {
    withBumpr(bumpr => bumpr.bump())
  })

program
  .command('log <key>')
  .description(`Output the given key from the ${name} log file`)
  .action(key => {
    withBumpr(bumpr => bumpr.log(key).then(value => console.log(value)))
  })

program
  .command('publish')
  .description('actually publish the newly bumped version')
  .action(() => {
    withBumpr(bumpr => bumpr.publish())
  })

program
  .command('tag')
  .description('create a git tag for the current version (without doing any bumping)')
  .action(() => {
    withBumpr(bumpr => bumpr.tag())
  })

program.parse(process.argv)
