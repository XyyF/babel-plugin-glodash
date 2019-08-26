import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import {transformFileSync} from '@babel/core'

import plugin from '../src/index'

it('foo is an alias to baz', () => {
    const actualPath = path.join(__dirname, 'fixtrues/import-none/actual.js')
    const {code} = transformFileSync(actualPath, {plugins: [plugin]});
    const expected = fs.readFileSync(path.join(__dirname, 'fixtrues/import-none/expected.js'), 'utf8')

    expect(_.trim(code)).toBe(_.trim(expected))
})