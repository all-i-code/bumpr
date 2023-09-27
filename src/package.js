import {readFileSync} from 'fs'
import path from 'path'
import * as url from 'url'

const dirname = url.fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(dirname, '..', 'package.json'), {encoding: 'utf-8'}))

export const {name, version} = pkg
export default pkg
