/**
 * Make it easier to only mock out node modules we want to, while allowing libraries we use
 * to continue to use the real versions (@job13er 2022-06-02)
 */
import {exec as cpExec} from 'child_process'
import util from 'util'

export {createReadStream, existsSync, readFileSync, statSync} from 'fs'
export {readFile, readdir, writeFile} from 'fs/promises'

export const exec = util.promisify(cpExec)
