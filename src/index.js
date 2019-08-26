import _ from 'lodash'
import {addDefault} from '@babel/helper-module-imports';
import {isModuleDeclaration} from '@babel/types';
import {isLodash} from './utils'

/** The error message used when chain sequences are detected. */
const CHAIN_ERROR = [
    'Lodash chain sequences are not supported by babel-plugin-lodash.',
    'Consider substituting chain sequences with composition patterns.',
    'See https://medium.com/making-internets/why-using-chain-is-a-mistake-9bc1f80d51ba'
].join('\n')

export default function (babel) {
    const {types: t} = babel;
    return {
        name: 'elfin',
        visitor: {
            CallExpression: {
                exit(path) {
                    const {file} = path.hub
                    const {node} = path
                    const object = node.callee.object
                    // 是以属性调用的形式使用 glodash.cloneDeep()
                    if (object && object.name !== 'glodash') return
                    const property = node.callee.property
                    // 是否自定义了 glodash 变量
                    if (file.scope.getBinding('glodash') || !property) return
                    // module标示
                    const propertyName = property.name
                    addDefault(path, `lodash/${propertyName}`, {nameHint: propertyName})
                    path.replaceWith(
                        t.callExpression(t.identifier(`_${propertyName}`), [])
                    )
                },
            },
        }
    };
}
