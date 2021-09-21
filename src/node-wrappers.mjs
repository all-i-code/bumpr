import util from 'util'
import cp from 'child_process'
import fs from 'fs'

export const createReadStream = util.promisify(fs.createReadStream)
export const exec = util.promisify(cp.exec)
export const readdir = util.promisify(fs.readdir)
export const {statSync} = fs
export const writeFile = util.promisify(fs.writeFile)
