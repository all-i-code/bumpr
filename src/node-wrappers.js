const {exec} = require('child_process')
const {writeFile} = require('fs')
const Promise = require('promise')

exports.exec = Promise.denodeify(exec)
exports.writeFile = Promise.denodeify(writeFile)
