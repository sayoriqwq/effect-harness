import {
  defineHarnessModule,
  MODULE_PROTOCOL_V1,
  PRELUDE_V1_SUPPORTED_FEATURES,
} from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'
import * as TypeScript from 'typescript'

const effectLanguageServicePlugin = {
  name: '@effect/language-service',
  diagnostics: true,
  includeSuggestionsInTsc: true,
  ignoreEffectSuggestionsInTscExitCode: false,
  ignoreEffectWarningsInTscExitCode: false,
  ignoreEffectErrorsInTscExitCode: false,
}

const routingBlock = `## Effect Harness\n\nFor Effect application, test, package, TypeScript, editor, or lint changes, read \`effect/managed/docs/index.md\` first. For ESLint or package-config repair, read \`effect/managed/docs/package-config.md\`; Antfu v9 integrations use its \`antfu().append(...effectHarness)\` form. Keep \`effect/feedback/**\` target-owned. Use installed Effect packages; never import pinned source diagnostics.\n`

function eslintIntegrationIssue(content: string | undefined) {
  if (typeof content === 'string') {
    if (hasEffectHarnessEslintComposition(content)) {
      return []
    }
  }

  return [{
    id: 'effect.eslint.integration',
    summary: 'Target ESLint config does not compose Effect Harness guardrails',
    detail: 'The target-owned eslint.config.mjs must import and include @sayoriqwq/effect-harness/eslint.',
    evidence: content === undefined ? 'eslint.config.mjs is absent.' : 'eslint.config.mjs does not reference the stable Effect Harness ESLint export.',
    guidance: 'prelude-assets/guidance/eslint.md',
  }] as const
}

function hasEffectHarnessEslintComposition(content: string): boolean {
  const source = TypeScript.createSourceFile(
    'eslint.config.mjs',
    content,
    TypeScript.ScriptTarget.Latest,
    false,
    TypeScript.ScriptKind.JS,
  )

  let antfuBinding = ''
  for (const statement of source.statements) {
    if (
      TypeScript.isImportDeclaration(statement)
      && TypeScript.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === '@antfu/eslint-config'
    ) {
      antfuBinding = statement.importClause?.name?.text ?? ''
    }
  }

  for (const statement of source.statements) {
    if (
      !TypeScript.isImportDeclaration(statement)
      || !TypeScript.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== '@sayoriqwq/effect-harness/eslint'
    ) {
      continue
    }

    const binding = statement.importClause?.name?.text ?? ''
    if (binding.length > 0 && composesEslintBinding(source, binding, antfuBinding)) {
      return true
    }
  }

  return false
}

function composesEslintBinding(
  source: TypeScript.SourceFile,
  binding: string,
  antfuBinding: string,
): boolean {
  return source.statements.some((statement) => {
    if (TypeScript.isExportAssignment(statement) === false)
      return false

    if (statement.isExportEquals === true)
      return false

    if (TypeScript.isArrayLiteralExpression(statement.expression)) {
      const spreadsEffectConfig = statement.expression.elements.some(element =>
        TypeScript.isSpreadElement(element)
        && TypeScript.isIdentifier(element.expression)
        && element.expression.text === binding)
      return spreadsEffectConfig && !spreadsAntfuCall(statement.expression, antfuBinding)
    }

    return appendsEffectConfigToAntfu(statement.expression, binding, antfuBinding)
  })
}

function spreadsAntfuCall(expression: TypeScript.ArrayLiteralExpression, antfuBinding: string): boolean {
  return antfuBinding.length > 0 && expression.elements.some(element =>
    TypeScript.isSpreadElement(element)
    && TypeScript.isCallExpression(element.expression)
    && TypeScript.isIdentifier(element.expression.expression)
    && element.expression.expression.text === antfuBinding)
}

function appendsEffectConfigToAntfu(
  expression: TypeScript.Expression,
  effectBinding: string,
  antfuBinding: string,
): boolean {
  if (antfuBinding.length === 0 || !TypeScript.isCallExpression(expression))
    return false

  const append = expression.expression
  if (!TypeScript.isPropertyAccessExpression(append) || append.name.text !== 'append')
    return false

  if (
    !TypeScript.isCallExpression(append.expression)
    || !TypeScript.isIdentifier(append.expression.expression)
    || append.expression.expression.text !== antfuBinding
  ) {
    return false
  }

  return expression.arguments.some(argument =>
    TypeScript.isSpreadElement(argument)
    && TypeScript.isIdentifier(argument.expression)
    && argument.expression.text === effectBinding)
}

export const harnessModule = defineHarnessModule({
  descriptor: {
    harnessId: 'effect-harness',
    protocolVersion: MODULE_PROTOCOL_V1,
    requiredFeatures: PRELUDE_V1_SUPPORTED_FEATURES,
  },
  plan: context => Effect.gen(function* () {
    const eslintConfig = yield* context.target.readText('eslint.config.mjs')
    return {
      outputs: [
        {
          kind: 'ManagedTree' as const,
          id: 'effect.managed',
          sourceRoot: 'prelude-assets/effect/managed',
          targetRoot: 'effect/managed',
        },
        {
          kind: 'ManagedBlock' as const,
          id: 'effect.agent-routing',
          path: 'AGENTS.md',
          blockId: 'effect-harness-routing',
          content: routingBlock,
        },
        {
          kind: 'JsonKeyedItem' as const,
          id: 'effect.tsconfig.language-service',
          path: 'tsconfig.json',
          collectionPointer: '/compilerOptions/plugins',
          keyField: 'name',
          keyValue: '@effect/language-service',
          item: effectLanguageServicePlugin,
        },
        {
          kind: 'JsonValue' as const,
          id: 'effect.vscode.auto-import-exclude',
          path: '.vscode/settings.json',
          pointer: '/typescript.preferences.autoImportFileExcludePatterns',
          value: ['repos/**'],
        },
        {
          kind: 'JsonValue' as const,
          id: 'effect.vscode.javascript-auto-import-exclude',
          path: '.vscode/settings.json',
          pointer: '/javascript.preferences.autoImportFileExcludePatterns',
          value: ['repos/**'],
        },
        {
          kind: 'JsonValue' as const,
          id: 'effect.zed.auto-import-exclude',
          path: '.zed/settings.json',
          pointer: '/lsp/typescript-language-server/initialization_options/preferences/autoImportFileExcludePatterns',
          value: ['repos/**'],
        },
      ],
      requirements: [
        { id: 'effect.runtime', packageRoot: context.integration.packageRoot, packageName: 'effect', range: '4.0.0-beta.92', section: 'dependencies' as const },
        { id: 'effect.platform-node', packageRoot: context.integration.packageRoot, packageName: '@effect/platform-node', range: '4.0.0-beta.92', section: 'dependencies' as const },
        { id: 'effect.vitest', packageRoot: context.integration.packageRoot, packageName: '@effect/vitest', range: '4.0.0-beta.92', section: 'devDependencies' as const },
        { id: 'effect.tsgo', packageRoot: context.integration.packageRoot, packageName: '@effect/tsgo', range: '0.15.0', section: 'devDependencies' as const },
        { id: 'effect.language-service', packageRoot: context.integration.packageRoot, packageName: '@effect/language-service', range: '0.86.2', section: 'devDependencies' as const },
        { id: 'effect.native-typescript', packageRoot: context.integration.packageRoot, packageName: '@typescript/native-preview', range: '7.0.0-dev.20260630.1', section: 'devDependencies' as const },
        { id: 'effect.eslint', packageRoot: context.integration.packageRoot, packageName: 'eslint', range: '^10.3.0', section: 'devDependencies' as const },
        { id: 'effect.antfu-eslint-config', packageRoot: context.integration.packageRoot, packageName: '@antfu/eslint-config', range: '^9.0.0', section: 'devDependencies' as const },
        { id: 'effect.vitest-runner', packageRoot: context.integration.packageRoot, packageName: 'vitest', range: '^4.1.8', section: 'devDependencies' as const },
        { id: 'effect.typescript', packageRoot: context.integration.packageRoot, packageName: 'typescript', range: '^6.0.3', section: 'devDependencies' as const },
      ],
      checks: [
        { id: 'effect.typecheck', summary: 'Run strict Effect diagnostics', packageRoot: context.integration.packageRoot, argv: ['pnpm', 'typecheck'] },
        { id: 'effect.lint', summary: 'Run Effect lint guardrails', packageRoot: context.integration.packageRoot, argv: ['pnpm', 'lint', '--max-warnings', '0'] },
        { id: 'effect.verify', summary: 'Run Effect domain verification', packageRoot: context.integration.packageRoot, argv: ['pnpm', 'verify'] },
      ],
      issues: eslintIntegrationIssue(eslintConfig),
    }
  }),
})
