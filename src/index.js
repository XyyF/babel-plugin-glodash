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
    let imports = []
    return {
        name: 'elfin',
        visitor: {
            Program(path) {
                const {file} = path.hub
                // 清空缓存
                imports = []
                // 在body下是否有import模块
                const isModule = file.ast.program.body.some(node => {
                    return isModuleDeclaration(node)
                })

                if (isModule) {
                    // 收集import依赖
                    file.path.traverse({
                        ImportDeclaration: {
                            exit(path) {
                                const {node} = path
                                // 是否是lodash依赖
                                if (isLodash(node.source.value)) return
                                // 依赖信息收集
                                const imported = []
                                const specifiers = []
                                imports.push({
                                    /**
                                     * moduel来源 -- 判断是否是lodash模块
                                     * {String} lodash || lodash-es || lodash/get等
                                     */
                                    source: node.source.value,
                                    /**
                                     * 导入的方式 -
                                     * {Array} ['default', '*', 'get', 'cloneDeep']等
                                     */
                                    imported,
                                    /**
                                     * 导入的详细信息
                                     * kind {String} 导入的形式 - named || namespace
                                     * imported {String?} 导入的方式，对应上方的imported
                                     * local {String} 本地的变量名
                                     */
                                    specifiers,
                                })

                                for (const specifier of path.get('specifiers')) {
                                    const local = specifier.node.local.name
                                    // import _ from 'lodash' || import get from 'lodash/get'
                                    if (specifier.isImportDefaultSpecifier()) {
                                        imported.push('default')
                                        specifiers.push({
                                            kind: 'named', // 形式
                                            imported: 'default', // 导入形式
                                            local, // 本地变量名
                                        })
                                    }
                                    // import {cloneDeep} from 'lodash'
                                    if (specifier.isImportSpecifier()) {
                                        const importedName = specifier.node.imported.name
                                        imported.push(importedName)
                                        specifiers.push({
                                            kind: 'named',
                                            imported: importedName,
                                            local
                                        })
                                    }
                                    // import * as _ from 'lodash'
                                    if (specifier.isImportNamespaceSpecifier()) {
                                        imported.push('*')
                                        specifiers.push({
                                            kind: 'namespace',
                                            local,
                                        })
                                    }
                                }
                            }
                        },
                    })
                }
            },
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
                    // 如果没有import项，直接导入
                    if (imports.length === 0) {
                        addDefault(path, `lodash/${propertyName}`, {nameHint: propertyName})
                        path.replaceWith(
                            t.callExpression(t.identifier(`_${propertyName}`), [])
                        )
                        return
                    }
                    // 如果有import项，需要去重
                    for (let module of imports) {
                        const specifier = module.specifier || []
                        // 是否已经定义了该propertyName的import项
                        const isDefine = specifier.find(e => {
                            return e.local === propertyName
                        })
                        if (isDefine) {
                            // 替换
                            path.replaceWith(
                                t.callExpression(t.identifier(`${propertyName}`), [])
                            )
                            continue;
                        }
                        addDefault(path, `lodash/${propertyName}`, {nameHint: propertyName})
                        path.replaceWith(
                            t.callExpression(t.identifier(`_${propertyName}`), [])
                        )
                    }
                },
            },
        }
    };
}
