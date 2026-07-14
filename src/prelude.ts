import type { ModulePlan, PackageRequirement } from '@sayoriqwq/prelude-contract'
import { Buffer } from 'node:buffer'
import {
  defineHarnessModule,
  MODULE_PROTOCOL_V2,
  PRELUDE_V2_SUPPORTED_FEATURES,
} from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'
import * as TypeScript from 'typescript'

import { effectLanguageServicePlugin } from './harness/Policy.ts'
import { pinnedReferenceOutputs } from './harness/SourcePins.ts'

const routingBlock = `## Effect Harness\n\nFor Effect application, test, package, TypeScript, editor, or lint changes, read the current Effect integration's \`.prelude/**/managed/docs/index.md\` first. Use \`.prelude/**/managed/skills/adapt-effect-target/SKILL.md\` when package selection or target-owned TypeScript topology needs adaptation. Keep \`.prelude/**/feedback/**\` target-owned. Treat \`.prelude/**/repos/**\` as read-only source diagnostics: consult it when installed declarations and managed guidance are insufficient, but never import or edit it.\n`

const managedTreeOutput = {
  kind: 'ManagedTree',
  id: 'effect.managed',
  sourceRoot: 'prelude-assets/effect/managed',
  locator: { root: 'IntegrationWorkspace', path: 'managed' },
} as const satisfies ModulePlan['outputs'][number]

const routingOutput = {
  kind: 'ManagedBlock',
  id: 'effect.agent-routing',
  locator: { root: 'ControlRoot', path: 'AGENTS.md' },
  blockId: 'effect-harness-routing',
  content: routingBlock,
} as const satisfies ModulePlan['outputs'][number]

const editorPolicyOutputs = [
  {
    kind: 'JsonValue',
    id: 'effect.vscode.auto-import-exclude',
    locator: { root: 'ControlRoot', path: '.vscode/settings.json' },
    pointer: '/typescript.preferences.autoImportFileExcludePatterns',
    value: ['.prelude/**/repos/**'],
  },
  {
    kind: 'JsonValue',
    id: 'effect.vscode.javascript-auto-import-exclude',
    locator: { root: 'ControlRoot', path: '.vscode/settings.json' },
    pointer: '/javascript.preferences.autoImportFileExcludePatterns',
    value: ['.prelude/**/repos/**'],
  },
  {
    kind: 'JsonValue',
    id: 'effect.zed.auto-import-exclude',
    locator: { root: 'ControlRoot', path: '.zed/settings.json' },
    pointer: '/lsp/typescript-language-server/initialization_options/preferences/autoImportFileExcludePatterns',
    value: ['.prelude/**/repos/**'],
  },
] as const satisfies ModulePlan['outputs']

const packageDevRequirements = [
  { id: 'vitest', packageName: '@effect/vitest', range: '4.0.0-beta.97', section: 'devDependencies' },
  { id: 'tsgo', packageName: '@effect/tsgo', range: '0.19.0', section: 'devDependencies' },
  { id: 'native-typescript', packageName: '@typescript/native', range: 'npm:typescript@7.0.2', section: 'devDependencies' },
  { id: 'eslint', packageName: 'eslint', range: '^10.3.0', section: 'devDependencies' },
  { id: 'antfu-eslint-config', packageName: '@antfu/eslint-config', range: '^9.0.0', section: 'devDependencies' },
  { id: 'vitest-runner', packageName: 'vitest', range: '^4.1.8', section: 'devDependencies' },
  { id: 'typescript', packageName: 'typescript', range: 'npm:@typescript/typescript6@6.0.2', section: 'devDependencies' },
] as const satisfies ReadonlyArray<Omit<PackageRequirement, 'id' | 'packageRoot'> & { readonly id: string }>

type RequirementSection = PackageRequirement['section']

function packageRootKey(packageRoot: string): string {
  return Buffer.from(packageRoot, 'utf8').toString('hex')
}

function packageOutputs(packageRoot: string): ModulePlan['outputs'] {
  const rootKey = packageRootKey(packageRoot)
  return [{
    kind: 'JsonKeyedItem',
    id: `effect.tsconfig.language-service.${rootKey}`,
    locator: { root: 'PackageRoot', packageRoot, path: 'tsconfig.json' },
    collectionPointer: '/compilerOptions/plugins',
    keyField: 'name',
    keyValue: '@effect/language-service',
    item: effectLanguageServicePlugin,
  }]
}

function hasManifestDependency(
  manifest: Readonly<Record<string, unknown>> | undefined,
  section: RequirementSection | 'peerDependencies',
  packageName: string,
): boolean {
  const entries = manifest?.[section]
  return typeof entries === 'object'
    && entries !== null
    && !Array.isArray(entries)
    && typeof (entries as Readonly<Record<string, unknown>>)[packageName] === 'string'
}

function selectedSection(
  manifest: Readonly<Record<string, unknown>> | undefined,
  packageName: string,
  fallback: RequirementSection,
): RequirementSection {
  if (hasManifestDependency(manifest, 'dependencies', packageName))
    return 'dependencies'
  if (hasManifestDependency(manifest, 'devDependencies', packageName))
    return 'devDependencies'
  if (hasManifestDependency(manifest, 'peerDependencies', packageName))
    return 'devDependencies'
  return fallback
}

function hasDeclaredDependency(
  manifest: Readonly<Record<string, unknown>> | undefined,
  packageName: string,
): boolean {
  return hasManifestDependency(manifest, 'dependencies', packageName)
    || hasManifestDependency(manifest, 'devDependencies', packageName)
    || hasManifestDependency(manifest, 'peerDependencies', packageName)
}

function requirementsFor(
  packageRoot: string,
  manifest: Readonly<Record<string, unknown>> | undefined,
): ModulePlan['requirements'] {
  const rootKey = packageRootKey(packageRoot)
  const runtimeRequirements = [{
    id: 'runtime',
    packageName: 'effect',
    range: '4.0.0-beta.97',
    section: selectedSection(manifest, 'effect', 'dependencies'),
  }]
  const platformSection = selectedSection(manifest, '@effect/platform-node', 'dependencies')
  const platformRequirements = manifest === undefined || hasDeclaredDependency(manifest, '@effect/platform-node')
    ? [{ id: 'platform-node', packageName: '@effect/platform-node', range: '4.0.0-beta.97', section: platformSection }]
    : []

  return [...runtimeRequirements, ...platformRequirements, ...packageDevRequirements].map(requirement => ({
    ...requirement,
    id: `effect.${requirement.id}.${rootKey}`,
    packageRoot,
  }))
}

function checksFor(packageRoot: string): ModulePlan['checks'] {
  const rootKey = packageRootKey(packageRoot)
  return [
    { id: `effect.typecheck.${rootKey}`, summary: 'Run strict Effect diagnostics', packageRoot, argv: ['pnpm', 'typecheck'] },
    { id: `effect.lint.${rootKey}`, summary: 'Run Effect lint guardrails', packageRoot, argv: ['pnpm', 'lint', '--max-warnings', '0'] },
    { id: `effect.verify.${rootKey}`, summary: 'Run Effect domain verification', packageRoot, argv: ['pnpm', 'verify'] },
  ]
}

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
    guidance: 'prelude-assets/effect/managed/docs/package-config.md',
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
    protocolVersion: MODULE_PROTOCOL_V2,
    requiredFeatures: PRELUDE_V2_SUPPORTED_FEATURES,
  },
  plan: context => Effect.gen(function* () {
    const eslintConfig = yield* context.target.readText({
      root: 'ControlRoot',
      path: 'eslint.config.mjs',
    })
    const outputs = context.integration.packageRoots.flatMap(packageOutputs)
    const requirements = (yield* Effect.forEach(
      context.integration.packageRoots,
      packageRoot => context.target.readPackageManifest(packageRoot).pipe(
        Effect.map(manifest => requirementsFor(packageRoot, manifest)),
      ),
    )).flat()
    const checks = context.integration.packageRoots.flatMap(checksFor)

    return {
      outputs: [
        managedTreeOutput,
        routingOutput,
        ...pinnedReferenceOutputs,
        ...outputs,
        ...editorPolicyOutputs,
      ],
      requirements,
      checks,
      issues: eslintIntegrationIssue(eslintConfig),
    }
  }),
})
