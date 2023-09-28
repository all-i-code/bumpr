import {readFileSync} from 'fs'
import _ from 'lodash'
import path from 'path'
import * as url from 'url'

const dirname = url.fileURLToPath(new URL('.', import.meta.url))
const pathToPkg = path.join(dirname, '..', 'package.json')
if (process.env.VERBOSE) {
  console.log(`Path to package.json: ${pathToPkg}`)
}
const contents = readFileSync(pathToPkg, {encoding: 'utf-8'})
if (process.env.VERBOSE) {
  console.log(`Contents of package.json: ${_.truncate(contents, {length: 50})}`)
}

const pkg = JSON.parse(contents)

export const {name, version} = pkg
export default pkg
