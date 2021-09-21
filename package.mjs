import {createRequire} from 'module'

const require = createRequire(import.meta.url)
export const {name, version} = require('./package.json')
