const {exec} = require('child_process')
const {createReadStream, readdir, statSync, writeFile} = require('fs')
const Promise = require('promise')

exports.createReadStream = createReadStream
exports.exec = Promise.denodeify(exec)
exports.readdir = Promise.denodeify(readdir)
exports.statSync = statSync
exports.writeFile = Promise.denodeify(writeFile)
