import {addDefault} from '@babel/helper-module-imports';
import {isModuleDeclaration} from '@babel/types';
import {isLodash} from './utils'

export default function (babel) {
    const { types: t } = babel;
    let imports = []
    return {
        name: 'ast-transform', // not required
        visitor: {
            Program(path, state) {
                const {file} = path.hub
                imports = []

                // Clear tracked method imports.
                let isModule = false

                for (const node of file.ast.program.body) {
                    if (isModuleDeclaration(node)) {
                        isModule = true
                        break
                    }
                }

                if (isModule) {
                    file.path.traverse({
                        ImportDeclaration: {
                            exit(path) {
                                const {node} = path
                                if (isLodash(node.source.value)) return

                                const imported = []
                                const specifiers = []

                                imports.push({
                                    source: node.source.value,
                                    imported,
                                    specifiers,
                                })

                                for (const specifier of path.get('specifiers')) {
                                    const local = specifier.node.local.name

                                    if (specifier.isImportDefaultSpecifier()) {
                                        imported.push('default')
                                        specifiers.push({
                                            kind: 'named',
                                            imported: 'default',
                                            local,
                                        })
                                    }

                                    if (specifier.isImportSpecifier()) {
                                        const importedName = specifier.node.imported.name
                                        imported.push(importedName)
                                        specifiers.push({
                                            kind: 'named',
                                            imported: importedName,
                                            local
                                        })
                                    }

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
                    // 是否自定义了 glodash
                    if (file.scope.getBinding('glodash') || !node.callee.property) return
                    const property = node.callee.property.name
                    if (imports.length === 0) {
                        addDefault(path, `lodash/${property}`, {nameHint: property})
                        path.replaceWith(
                            t.callExpression(t.identifier(`_${property}`), [])
                        )
                        return
                    }
                    for (let module of imports) {
                        const specifier = module.specifier || []
                        const isDefine = specifier.find(e => {
                            return e.kind !== 'default' && e.local === property
                        })
                        if (isDefine) continue;
                        addDefault(path, `lodash/${property}`, {nameHint: property})
                        path.replaceWith(
                            t.callExpression(t.identifier(`_${property}`), [])
                        )
                    }
                },
            },
        }
    };
}
