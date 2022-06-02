const {exec} = require('child_process')
const util = require('util')

exports.exec = util.promisify(exec)
