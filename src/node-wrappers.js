/**
 * Make it easier to only mock out node modules we want to, while allowing libraries we use
 * to continue to use the real versions (@job13er 2022-06-02)
 */
const {exec} = require('child_process')
const {createReadStream, existsSync, statSync} = require('fs')
const {readdir, writeFile} = require('fs/promises')
const util = require('util')

exports.createReadStream = createReadStream
exports.existsSync = existsSync
exports.exec = util.promisify(exec)
exports.readdir = readdir
exports.statSync = statSync
exports.writeFile = writeFile
