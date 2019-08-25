import {addDefault} from '@babel/helper-module-imports';
import {isModuleDeclaration} from '@babel/types';

function isLodash(id) {
    return /^lodash(?:-compat|-es)?$/.test(id)
}

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
                    const object = path.node.callee.object
                    if (object && object.name !== 'glodash') return
                    // 是否定义了 glodash
                    if (file.scope.getBinding('glodash') || !path.node.callee.property) return
                    const property = path.node.callee.property.name
                    if (imports.length === 0) {
                        addDefault(path, `lodash/${property}`, {nameHint: property})
                        path.replaceWith(
                            t.callExpression(t.identifier(`${property}`), [])
                        )
                        return
                    }
                    for (let module of imports) {
                        const isDefine = module.specifier.find(e => {
                            return e.kind !== 'default' && e.local === property
                        })
                        if (isDefine) continue;
                        // const name = addDefault(path, 'lodash', {nameHint: 'cloneDeep'})
                        // path.replaceWith({type: path.type, name: 'cloneDeep()'})
                    }
                },
            },
        }
    };
}
