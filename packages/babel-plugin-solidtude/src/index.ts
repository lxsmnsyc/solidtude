import * as babel from '@babel/core';
import { addNamed } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

type ImportHook = Map<string, t.Identifier>;

function getHookIdentifier(
  hooks: ImportHook,
  path: NodePath,
  name: string,
  source = 'solid-js',
): t.Identifier {
  const current = hooks.get(name);
  if (current) {
    return current;
  }
  const newID = addNamed(path, name, source);
  hooks.set(name, newID);
  return newID;
}

function createRootId(
  hooks: ImportHook,
  path: NodePath,
): t.Identifier {
  const id = path.scope.generateUidIdentifier('root');
  path.scope.push({
    id,
    init: t.callExpression(
      getHookIdentifier(hooks, path, 'createUniqueId', 'solid-js'),
      [],
    ),
    kind: 'const',
  });
  return id;
}

function createComponentRoot(
  hooks: ImportHook,
  path: NodePath<t.JSXElement>,
  key: t.Identifier,
  hydratable: boolean,
): t.JSXElement {
  const attributes = [
    t.jsxAttribute(t.jsxIdentifier('data-ssc'), t.jsxExpressionContainer(key)),
  ];
  if (hydratable) {
    attributes.push(t.jsxAttribute(t.jsxIdentifier('innerHTML'), t.jsxExpressionContainer(
      t.callExpression(
        getHookIdentifier(hooks, path, 'renderToString', 'solid-js/web'),
        [
          t.arrowFunctionExpression([], path.node),
          t.objectExpression([
            t.objectProperty(
              t.identifier('renderId'),
              key,
            ),
          ]),
        ],
      ),
    )));
  }
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier('solidtude-root'), attributes),
    t.jsxClosingElement(t.jsxIdentifier('solidtude-root')),
    [],
  );
}

function createComponentTemplate(
  hooks: ImportHook,
  path: NodePath<t.JSXElement>,
  key: t.Identifier,
): t.JSXElement {
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier('template'), [
      t.jsxAttribute(t.jsxIdentifier('data-ssc'), t.jsxExpressionContainer(key)),
      t.jsxAttribute(t.jsxIdentifier('innerHTML'), t.jsxExpressionContainer(
        t.callExpression(
          getHookIdentifier(hooks, path, 'renderToString', 'solid-js/web'),
          [
            t.arrowFunctionExpression([], t.jsxFragment(
              t.jsxOpeningFragment(),
              t.jsxClosingFragment(),
              path.node.children,
            )),
            t.objectExpression([
              t.objectProperty(
                t.identifier('renderId'),
                t.templateLiteral([
                  t.templateElement({
                    raw: 'template-',
                  }),
                  t.templateElement({
                    raw: '',
                  }, true),
                ], [
                  key,
                ]),
              ),
            ]),
          ],
        ),
      )),
    ]),
    t.jsxClosingElement(t.jsxIdentifier('template')),
    [],
  );
}

function createComponentScript(
  identifier: t.Identifier,
  properties: (t.ObjectProperty | t.SpreadElement)[],
  key: t.Identifier,
  strategy: t.Expression,
  hydratable: boolean,
): t.JSXElement {
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier('script'), [
      t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
      t.jsxAttribute(t.jsxIdentifier('innerHTML'), t.jsxExpressionContainer(
        t.templateLiteral(
          [
            t.templateElement({
              raw: 'import m from "',
            }),
            t.templateElement({
              raw: '";m("',
            }),
            t.templateElement({
              raw: '",',
            }),
            t.templateElement({
              raw: ',',
            }),
            t.templateElement({
              raw: ',',
            }),
            t.templateElement({
              raw: ');',
            }, true),
          ],
          [
            t.memberExpression(
              identifier,
              t.identifier('src'),
            ),
            key,
            t.callExpression(
              t.memberExpression(
                t.identifier('JSON'),
                t.identifier('stringify'),
              ),
              [
                t.objectExpression(properties),
              ],
            ),
            t.callExpression(
              t.memberExpression(
                t.identifier('JSON'),
                t.identifier('stringify'),
              ),
              [
                strategy,
              ],
            ),
            t.booleanLiteral(hydratable),
          ],
        ),
      )),
    ]),
    t.jsxClosingElement(t.jsxIdentifier('script')),
    [],
  );
}

function createComponentEntrypoint(
  hooks: ImportHook,
  path: NodePath<t.JSXElement>,
  identifier: t.Identifier,
  properties: (t.ObjectProperty | t.SpreadElement)[],
  key: t.Identifier,
  strategy: t.Expression,
  hydratable: boolean,
): t.JSXFragment {
  return t.jsxFragment(
    t.jsxOpeningFragment(),
    t.jsxClosingFragment(),
    [
      createComponentRoot(hooks, path, key, hydratable),
      createComponentTemplate(hooks, path, key),
      createComponentScript(identifier, properties, key, strategy, hydratable),
    ],
  );
}

function transformServerComponent(programPath: NodePath<t.Program>): void {
  const validIdentifiers = new Set();
  const hooks: ImportHook = new Map();
  const skippable = new WeakSet();
  programPath.traverse({
    ImportDeclaration(path) {
      if (/client(\.[tj]sx?)?$/.test(path.node.source.value)) {
        for (let i = 0, len = path.node.specifiers.length; i < len; i += 1) {
          const specifier = path.node.specifiers[i];
          if (t.isImportDefaultSpecifier(specifier)) {
            validIdentifiers.add(specifier.local);
          }
        }
      }
    },
    JSXElement(path) {
      if (skippable.has(path.node)) {
        return;
      }
      const opening = path.node.openingElement;
      if (t.isJSXIdentifier(opening.name)) {
        const binding = path.scope.getBinding(opening.name.name);
        if (
          binding
          && validIdentifiers.has(binding.identifier)
        ) {
          skippable.add(path.node);
          const id = createRootId(hooks, path);
          const properties: (t.ObjectProperty | t.SpreadElement)[] = [];

          let strategy: t.Expression = t.identifier('undefined');
          let hydratable = true;

          for (let i = 0, len = opening.attributes.length; i < len; i += 1) {
            const attr = opening.attributes[i];
            if (t.isJSXAttribute(attr)) {
              let property: t.Expression;
              let computed = false;
              if (t.isJSXNamespacedName(attr.name)) {
                if (attr.name.namespace.name === 'client') {
                  switch (attr.name.name.name) {
                    case 'load':
                      strategy = t.objectExpression([
                        t.objectProperty(t.identifier('type'), t.stringLiteral('load')),
                      ]);
                      break;
                    case 'visible':
                      strategy = t.objectExpression([
                        t.objectProperty(t.identifier('type'), t.stringLiteral('visible')),
                        t.objectProperty(t.identifier('value'), id),
                      ]);
                      break;
                    case 'media': {
                      let expression: t.Expression;
                      if (t.isExpression(attr.value)) {
                        expression = attr.value;
                      } else if (
                        t.isJSXExpressionContainer(attr.value)
                        && t.isExpression(attr.value.expression)
                      ) {
                        expression = attr.value.expression;
                      } else {
                        expression = t.booleanLiteral(true);
                      }
                      strategy = t.objectExpression([
                        t.objectProperty(t.identifier('type'), t.stringLiteral('media')),
                        t.objectProperty(t.identifier('value'), expression),
                      ]);
                    }
                      break;
                    case 'only':
                      hydratable = false;
                      break;
                    default:
                      break;
                  }
                  // eslint-disable-next-line no-continue
                  continue;
                } else {
                  property = t.stringLiteral(`${attr.name.namespace.name}:${attr.name.name.name}`);
                  computed = true;
                }
              } else {
                property = t.stringLiteral(attr.name.name);
              }
              let value: t.Expression;
              if (attr.value) {
                if (t.isJSXExpressionContainer(attr.value)) {
                  if (t.isExpression(attr.value.expression)) {
                    value = attr.value.expression;
                  } else {
                    value = t.booleanLiteral(true);
                  }
                } else {
                  value = attr.value;
                }
              } else {
                value = t.booleanLiteral(true);
              }
              properties.push(t.objectProperty(
                property,
                value,
                computed,
              ));
            } else {
              properties.push(t.spreadElement(
                attr.argument,
              ));
            }
          }

          const entryPoint = createComponentEntrypoint(
            hooks,
            path,
            binding.identifier,
            properties,
            id,
            strategy,
            hydratable,
          );

          path.replaceWith(entryPoint);
        }
      }
    },
  });
}

function transformClientComponent(
  programPath: NodePath<t.Program>,
  source: string,
) {
  programPath.traverse({
    ExportDefaultDeclaration(path) {
      const { node } = path;
      const { declaration } = node;
      if (t.isFunctionDeclaration(declaration)) {
        declaration.type = 'FunctionExpression';
      }
      node.declaration = t.callExpression(
        t.memberExpression(
          t.identifier('Object'),
          t.identifier('assign'),
        ),
        [
          declaration as t.Expression,
          t.objectExpression([
            t.objectProperty(
              t.identifier('src'),
              t.stringLiteral(source),
            ),
          ]),
        ],
      );
    },
  });
}

interface State extends babel.PluginPass {
  opts: {
    source?: string;
  };
}

export default function solidtudePlugin(): babel.PluginObj<State> {
  return {
    name: 'solidtude',
    visitor: {
      Program(programPath, state) {
        if (state.opts.source) {
          transformClientComponent(programPath, state.opts.source);
        } else {
          transformServerComponent(programPath);
        }
      },
    },
  };
}
