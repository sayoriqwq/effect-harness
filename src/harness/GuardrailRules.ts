import * as ts from 'typescript'

const contextTagMessage = 'Use Context.Service for v4 beta service definitions.'
const silentCatchMessage = 'Do not silently swallow Effect errors with Effect.void or Effect.unit.'
const assertionFallbackMessage
  = 'Do not silence @effect/tsgo fallback diagnostics with assertions; type the fallback return or use a named result helper.'
const assertionSucceedMessage
  = 'Do not wrap asserted values in Effect.succeed to silence @effect/tsgo; declare the type boundary before lifting into Effect.'
const assertionDiscriminantMessage
  = 'Do not force result discriminants with `as const`; use a named union boundary or typed helper.'

const bannedEffectMembers = new Map<string, string>([
  ['asVoid', 'Avoid Effect.asVoid; return void or map to an explicit value.'],
  ['catchAllCause', 'Do not catch all causes in normal runtime paths.'],
  ['ignore', 'Do not ignore Effect failures silently.'],
  ['serviceOption', 'Required services should be present in the layer graph.'],
])

export interface GuardrailViolation {
  readonly file: string
  readonly line: number
  readonly message: string
}

interface ImportBindings {
  readonly effectModules: Set<string>
  readonly effectNamespaces: Set<string>
  readonly contextModules: Set<string>
}

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) {
    return ts.ScriptKind.TSX
  }
  if (file.endsWith('.jsx')) {
    return ts.ScriptKind.JSX
  }
  if (file.endsWith('.json')) {
    return ts.ScriptKind.JSON
  }
  return ts.ScriptKind.TS
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function addViolation(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  message: string,
  violations: Array<GuardrailViolation>,
): void {
  violations.push({
    file: sourceFile.fileName,
    line: lineOf(sourceFile, node),
    message,
  })
}

function stringLiteralValue(node: ts.Node | undefined): string | undefined {
  return node !== undefined && ts.isStringLiteral(node) ? node.text : undefined
}

function isAssertionExpression(node: ts.Node | undefined): node is ts.AsExpression | ts.TypeAssertion {
  return node !== undefined && (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
}

function containsAssertionExpression(node: ts.Node | undefined): boolean {
  if (node === undefined) {
    return false
  }

  if (isAssertionExpression(node)) {
    return true
  }

  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsAssertionExpression(child)) {
      found = true
    }
  })

  return found
}

function importedName(element: ts.ImportSpecifier): string {
  return element.propertyName?.text ?? element.name.text
}

function expressionPath(expression: ts.Expression): ReadonlyArray<string> | undefined {
  if (ts.isIdentifier(expression)) {
    return [expression.text]
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const prefix = expressionPath(expression.expression)
    return prefix === undefined ? undefined : [...prefix, expression.name.text]
  }

  if (ts.isElementAccessExpression(expression)) {
    const prefix = expressionPath(expression.expression)
    const argument = stringLiteralValue(expression.argumentExpression)
    return prefix === undefined || argument === undefined ? undefined : [...prefix, argument]
  }

  return undefined
}

function isEffectMember(
  path: ReadonlyArray<string> | undefined,
  bindings: ImportBindings,
  member: string,
): boolean {
  if (path === undefined) {
    return false
  }

  return (path.length === 2 && bindings.effectModules.has(path[0]!) && path[1] === member)
    || (path.length === 3 && bindings.effectNamespaces.has(path[0]!) && path[1] === 'Effect' && path[2] === member)
}

function isContextTag(path: ReadonlyArray<string> | undefined, bindings: ImportBindings): boolean {
  if (path === undefined) {
    return false
  }

  return (path.length === 2 && bindings.contextModules.has(path[0]!) && path[1] === 'Tag')
    || (path.length === 3 && bindings.effectNamespaces.has(path[0]!) && path[1] === 'Context' && path[2] === 'Tag')
}

function isEffectVoidExpression(expression: ts.Expression, bindings: ImportBindings): boolean {
  const path = expressionPath(expression)
  return isEffectMember(path, bindings, 'void') || isEffectMember(path, bindings, 'unit')
}

function isVoidReturningHandler(node: ts.Node | undefined, bindings: ImportBindings): boolean {
  if (node === undefined) {
    return false
  }

  if (ts.isArrowFunction(node)) {
    if (!ts.isBlock(node.body)) {
      return isEffectVoidExpression(node.body, bindings)
    }

    return node.body.statements.some(statement =>
      ts.isReturnStatement(statement)
      && statement.expression !== undefined
      && isEffectVoidExpression(statement.expression, bindings),
    )
  }

  if (ts.isFunctionExpression(node)) {
    return node.body.statements.some(statement =>
      ts.isReturnStatement(statement)
      && statement.expression !== undefined
      && isEffectVoidExpression(statement.expression, bindings),
    )
  }

  return false
}

function functionContainsAssertionReturn(node: ts.Node | undefined): boolean {
  if (node === undefined) {
    return false
  }

  if (ts.isArrowFunction(node)) {
    if (!ts.isBlock(node.body)) {
      return containsAssertionExpression(node.body)
    }

    return node.body.statements.some(statement =>
      ts.isReturnStatement(statement) && containsAssertionExpression(statement.expression),
    )
  }

  if (ts.isFunctionExpression(node)) {
    return node.body.statements.some(statement =>
      ts.isReturnStatement(statement) && containsAssertionExpression(statement.expression),
    )
  }

  return false
}

function isOkPropertyName(name: ts.PropertyName): boolean {
  return (ts.isIdentifier(name) && name.text === 'ok')
    || (ts.isStringLiteral(name) && name.text === 'ok')
}

function isBooleanLiteralExpression(expression: ts.Expression): boolean {
  return expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword
}

function isBooleanAsConst(sourceFile: ts.SourceFile, expression: ts.Expression): boolean {
  return ts.isAsExpression(expression)
    && isBooleanLiteralExpression(expression.expression)
    && expression.type.getText(sourceFile) === 'const'
}

function collectModuleSourceViolation(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  source: string,
  violations: Array<GuardrailViolation>,
): void {
  if (source === '@effect/cli' || source.startsWith('@effect/cli/')) {
    addViolation(sourceFile, node, 'Use effect/unstable/cli for Effect v4 beta; @effect/cli is not supported for this baseline.', violations)
  }

  if (source.includes('repos/effect')) {
    addViolation(sourceFile, node, 'Do not import from repos/effect; it is read-only reference material.', violations)
  }
}

function collectImportBindings(
  sourceFile: ts.SourceFile,
  violations: Array<GuardrailViolation>,
): ImportBindings {
  const bindings: ImportBindings = {
    contextModules: new Set<string>(),
    effectModules: new Set<string>(),
    effectNamespaces: new Set<string>(),
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      if (ts.isExportDeclaration(statement)) {
        const source = stringLiteralValue(statement.moduleSpecifier)
        if (source !== undefined) {
          collectModuleSourceViolation(sourceFile, statement.moduleSpecifier!, source, violations)
        }
      }
      continue
    }

    const source = stringLiteralValue(statement.moduleSpecifier)
    if (source === undefined) {
      continue
    }

    collectModuleSourceViolation(sourceFile, statement.moduleSpecifier, source, violations)

    const namedBindings = statement.importClause?.namedBindings
    if (namedBindings === undefined) {
      continue
    }

    if (ts.isNamespaceImport(namedBindings)) {
      const local = namedBindings.name.text
      if (source === 'effect') {
        bindings.effectNamespaces.add(local)
      }
      else if (source === 'effect/Context') {
        bindings.contextModules.add(local)
      }
      else if (source === 'effect/Effect') {
        bindings.effectModules.add(local)
      }
      continue
    }

    for (const element of namedBindings.elements) {
      const imported = importedName(element)
      const local = element.name.text

      if (source === 'effect' && imported === 'Context') {
        bindings.contextModules.add(local)
      }
      else if (source === 'effect' && imported === 'Effect') {
        bindings.effectModules.add(local)
      }
      else if (source === 'effect/Context' && imported === 'Tag') {
        addViolation(sourceFile, element, contextTagMessage, violations)
      }
      else if (source === 'effect/Effect' && bannedEffectMembers.has(imported)) {
        const message = bannedEffectMembers.get(imported)!
        addViolation(sourceFile, element, message, violations)
      }
    }
  }

  return bindings
}

function collectDynamicImportViolation(
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  violations: Array<GuardrailViolation>,
): void {
  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const source = stringLiteralValue(node.arguments[0])
    if (source !== undefined) {
      collectModuleSourceViolation(sourceFile, node.arguments[0]!, source, violations)
    }
    return
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
    const source = stringLiteralValue(node.arguments[0])
    if (source !== undefined) {
      collectModuleSourceViolation(sourceFile, node.arguments[0]!, source, violations)
    }
  }
}

function collectSilentCatchViolation(
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  bindings: ImportBindings,
  violations: Array<GuardrailViolation>,
): void {
  const path = expressionPath(node.expression)
  const isCatchAll = isEffectMember(path, bindings, 'catchAll')
  const isCatchTag = isEffectMember(path, bindings, 'catchTag')
  const isCatchTags = isEffectMember(path, bindings, 'catchTags')

  if (isCatchAll) {
    for (const handler of [node.arguments[0], node.arguments[1]]) {
      if (isVoidReturningHandler(handler, bindings)) {
        addViolation(sourceFile, handler!, silentCatchMessage, violations)
      }
    }
  }
  else if (isCatchTag) {
    for (const handler of [node.arguments[1], node.arguments[2]]) {
      if (isVoidReturningHandler(handler, bindings)) {
        addViolation(sourceFile, handler!, silentCatchMessage, violations)
      }
    }
  }
  else if (isCatchTags) {
    for (const handlers of [node.arguments[0], node.arguments[1]]) {
      if (handlers !== undefined && ts.isObjectLiteralExpression(handlers)) {
        for (const property of handlers.properties) {
          if (ts.isPropertyAssignment(property) && isVoidReturningHandler(property.initializer, bindings)) {
            addViolation(sourceFile, property.initializer, silentCatchMessage, violations)
          }
        }
      }
    }
  }
}

function collectAssertionSilencingViolation(
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  bindings: ImportBindings,
  violations: Array<GuardrailViolation>,
): void {
  const path = expressionPath(node.expression)

  if (isEffectMember(path, bindings, 'orElseSucceed')) {
    for (const argument of node.arguments) {
      if (functionContainsAssertionReturn(argument)) {
        addViolation(sourceFile, argument, assertionFallbackMessage, violations)
      }
    }
    return
  }

  if (isEffectMember(path, bindings, 'succeed') && isAssertionExpression(node.arguments[0])) {
    addViolation(sourceFile, node.arguments[0]!, assertionSucceedMessage, violations)
  }
}

function collectAssertionDiscriminantViolation(
  sourceFile: ts.SourceFile,
  node: ts.PropertyAssignment,
  violations: Array<GuardrailViolation>,
): void {
  if (isOkPropertyName(node.name) && isBooleanAsConst(sourceFile, node.initializer)) {
    addViolation(sourceFile, node.initializer, assertionDiscriminantMessage, violations)
  }
}

function collectMemberViolation(
  sourceFile: ts.SourceFile,
  node: ts.PropertyAccessExpression,
  bindings: ImportBindings,
  violations: Array<GuardrailViolation>,
): void {
  const path = expressionPath(node)

  if (isContextTag(path, bindings)) {
    addViolation(sourceFile, node, contextTagMessage, violations)
    return
  }

  for (const [member, message] of bannedEffectMembers) {
    if (isEffectMember(path, bindings, member)) {
      addViolation(sourceFile, node, message, violations)
      return
    }
  }
}

function walk(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  bindings: ImportBindings,
  violations: Array<GuardrailViolation>,
): void {
  if (ts.isCallExpression(node)) {
    collectDynamicImportViolation(sourceFile, node, violations)
    collectSilentCatchViolation(sourceFile, node, bindings, violations)
    collectAssertionSilencingViolation(sourceFile, node, bindings, violations)
  }
  if (ts.isPropertyAccessExpression(node)) {
    collectMemberViolation(sourceFile, node, bindings, violations)
  }
  if (ts.isPropertyAssignment(node)) {
    collectAssertionDiscriminantViolation(sourceFile, node, violations)
  }

  ts.forEachChild(node, child => walk(sourceFile, child, bindings, violations))
}

export function analyzeGuardrailFile(file: string, text: string): ReadonlyArray<GuardrailViolation> {
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file))
  const violations: Array<GuardrailViolation> = []
  const bindings = collectImportBindings(sourceFile, violations)

  walk(sourceFile, sourceFile, bindings, violations)

  return violations
}
