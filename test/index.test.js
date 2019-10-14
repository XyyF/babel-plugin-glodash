import _ from 'lodash'
import fs from 'fs'
import glob from 'glob'
import path from 'path'
import { assert } from 'chai'
import {transformFileSync} from '@babel/core'

import plugin from '../lib/index'

function getTestName(testPath) {
    return path.basename(testPath).split('-').join(' ')
}

describe('cherry-picked modular builds', function() {
    this.timeout(0)

    _.each(glob.sync(path.join(__dirname, 'fixtures/*/')), (testPath) => {
        const testName = getTestName(testPath)
        const actualPath = path.join(testPath, 'actual.js')
        const expectedPath = path.join(testPath, 'expected.js')

        it(`should work with ${ testName }`, () => {
            const expected = fs.readFileSync(expectedPath, 'utf8')
            const actual = transformFileSync(actualPath, {plugins: [plugin]}).code

            assert.strictEqual(_.trim(actual), _.trim(expected))
        })
    })

   /*----------------------------------------------------------*/

    _.each(glob.sync(path.join(__dirname, 'error-fixtures/*/')), (testPath) => {
        const testName = getTestName(testPath)
        const actualPath = path.join(testPath, 'actual.js')

        it(`should throw an error with ${ testName }`, () => {
            const error = _.attempt(() => transformFileSync(actualPath, {
                'plugins': [plugin]
            }))

            assert.ok(_.isError(error))
        })
    })
})