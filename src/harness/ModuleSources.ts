import * as ts from 'typescript'

export interface ModuleSource {
  readonly line: number
  readonly source: string
}

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) {
    return ts.ScriptKind.TSX
  }
  if (file.endsWith('.jsx')) {
    return ts.ScriptKind.JSX
  }
  return ts.ScriptKind.TS
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function stringLiteralValue(node: ts.Node | undefined): string | undefined {
  return node !== undefined && ts.isStringLiteral(node) ? node.text : undefined
}

function addSource(
  sourceFile: ts.SourceFile,
  node: ts.Node | undefined,
  sources: Array<ModuleSource>,
): void {
  const source = stringLiteralValue(node)
  if (source === undefined || node === undefined) {
    return
  }

  sources.push({
    line: lineOf(sourceFile, node),
    source,
  })
}

function walk(sourceFile: ts.SourceFile, node: ts.Node, sources: Array<ModuleSource>): void {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    addSource(sourceFile, node.moduleSpecifier, sources)
  }
  else if (ts.isCallExpression(node)) {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      addSource(sourceFile, node.arguments[0], sources)
    }
    else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      addSource(sourceFile, node.arguments[0], sources)
    }
  }

  ts.forEachChild(node, child => walk(sourceFile, child, sources))
}

export function moduleSources(file: string, text: string): ReadonlyArray<ModuleSource> {
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file))
  const sources: Array<ModuleSource> = []
  walk(sourceFile, sourceFile, sources)
  return sources
}
