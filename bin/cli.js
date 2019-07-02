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
  .option('-n, --num-extra-commits <num>', 'Number of extra commits made after PR merge commit', 0)
  .description('actually bump the version based on a merged PR')
  .action(cmd => {
    withBumpr(bumpr => bumpr.bump(cmd))
  })

program
  .command('is-pr')
  .description('check if current build is a PR build')
  .action(() => {
    // Use exit code 0 if the current build is a PR build, 1 if it is not
    // this will allow CI scripts to do things like:
    // $ bumpr is-pr && echo "A PR build"
    // $ bumpr is-pr || echo "A merge build"
    withBumpr(bumpr => process.exit(bumpr.isPr() ? 0 : 1))
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
