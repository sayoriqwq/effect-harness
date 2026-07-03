import { fileURLToPath } from 'node:url'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { assert, it } from '@effect/vitest'
import { Effect, FileSystem, Path, Result, Schema } from 'effect'
import { errorMessage } from '../src/harness/Errors.ts'
import { verifyHarnessContract } from '../src/harness/verify/ProviderRepository.ts'
import {
  expectedPackageBaseline,
  expectedPrepareCommand,
  expectedTypecheckCommand,
  strictDiagnosticGate,
  strictDiagnosticSeverity,
} from '../src/harness/verify/TsgoPolicy.ts'
import { verifyStageSpecs } from '../src/harness/verify/VerifyStage.ts'

const currentFile = fileURLToPath(import.meta.url)

const repoRoot = Effect.fnUntraced(function* () {
  const path = yield* Path.Path
  return path.resolve(path.dirname(currentFile), '..')
})

const readJson = Effect.fnUntraced(function* (relativePath: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* repoRoot()
  const text = yield* fs.readFileString(path.join(root, relativePath))
  return yield* Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(text)
})

function record(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, 'object')
  assert.notEqual(value, null)
  assert.equal(Array.isArray(value), false)
  return value as Record<string, unknown>
}

function languageServicePlugin(plugins: ReadonlyArray<unknown>): Record<string, unknown> {
  const plugin = plugins.find(value => record(value).name === '@effect/language-service')
  assert.notEqual(plugin, undefined)
  return record(plugin)
}

function baselinePackages(names: ReadonlyArray<keyof typeof expectedPackageBaseline>): Record<string, string> {
  return Object.fromEntries(names.map(name => [name, expectedPackageBaseline[name]]))
}

function withTemporaryRepositoryDirectory<A, E, R>(
  relativePath: string,
  run: () => Effect.Effect<A, E, R>,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const root = yield* repoRoot()
    const absolutePath = path.join(root, relativePath)
    assert.equal(yield* fs.exists(absolutePath), false)
    yield* Effect.acquireRelease(
      fs.makeDirectory(absolutePath, { recursive: true }),
      () => fs.remove(absolutePath, { force: true, recursive: true }).pipe(
        Effect.catch(() => Effect.void),
      ),
    )
    return yield* run()
  }).pipe(Effect.scoped)
}

it.layer(NodeServices.layer)((it) => {
  it.effect('provider profile names self-conformance delivery modes', () => Effect.gen(function* () {
    const profile = record(yield* readJson('provider/effect-harness.provider.json'))
    const deliveryModes = record(profile.deliveryModes)

    assert.equal(record(deliveryModes.internalHarness).mode, 'internal-harness')
    assert.equal(record(deliveryModes.providerArtifactReference).mode, 'provider-artifact-reference')
    assert.equal(record(deliveryModes.exportedHarness).mode, 'exported-harness')

    const selfConformance = record(profile.selfConformance)
    assert.equal(selfConformance.mode, 'provider-repository')
    assert.equal(selfConformance.conformsTo, 'exported-harness')
    assert.equal(selfConformance.completionGate, 'pnpm verify')
    assert.equal(selfConformance.selfMaterialization, false)
    const forbiddenSurfaces = selfConformance.forbiddenProviderRepositorySurfaces as ReadonlyArray<unknown>
    assert.ok(forbiddenSurfaces.includes('.prelude'))
    assert.ok(forbiddenSurfaces.includes('.prelude/providers/effect-harness'))
    assert.ok(forbiddenSurfaces.includes('.prelude/providers/effect-harness/provider.json'))
  }))

  it.effect('self-conformance rejects materialized Prelude target surfaces in the provider repository', () => withTemporaryRepositoryDirectory('.prelude', () => Effect.gen(function* () {
    const root = yield* repoRoot()
    const result = yield* Effect.result(verifyHarnessContract(root))

    assert.equal(Result.isFailure(result), true)
    if (Result.isFailure(result)) {
      assert.match(errorMessage(result.failure), /\.prelude/u)
    }
  })))

  it.effect('provider profile exposes provider-internal source entries', () => Effect.gen(function* () {
    const profile = record(yield* readJson('provider/effect-harness.provider.json'))
    const packageJson = record(yield* readJson('package.json'))
    const effectContract = record(yield* readJson('repos/effect.subtree.json'))
    const tsgoContract = record(yield* readJson('repos/tsgo.subtree.json'))
    const providerRecord = record(profile.providerRecord)
    const requiredFields = providerRecord.requiredFields as ReadonlyArray<unknown>
    assert.ok(requiredFields.includes('artifact.sourceIdentity'))
    assert.ok(requiredFields.includes('artifact.sourceIdentities'))
    assert.ok(requiredFields.includes('surfaces.documentationBundle'))
    assert.ok(requiredFields.includes('surfaces.snippets'))

    const profiles = record(profile.profiles)
    const codexProfile = record(profiles['codex-effect-v4'])
    assert.equal(codexProfile.sourceEntry, 'effect-official-source')
    assert.ok((codexProfile.sourceEntries as ReadonlyArray<unknown>).includes('tsgo-official-source'))

    const sourceEntries = record(profile.sourceEntries)
    const effectSourceEntry = record(sourceEntries['effect-official-source'])
    const effectEntryContract = record(effectSourceEntry.contract)
    assert.equal(effectSourceEntry.kind, 'provider-internal-github-subtree')
    assert.equal(effectEntryContract.path, 'repos/effect.subtree.json')
    assert.equal(record(effectContract.subtree).split, 'e11cccc7d5fe631abccc7d6e3bd296938de0fa2e')
    assert.equal('repository' in effectSourceEntry, false)
    assert.equal('branch' in effectSourceEntry, false)
    assert.equal('prefix' in effectSourceEntry, false)
    assert.equal('anchor' in effectSourceEntry, false)
    assert.equal('llmDocument' in effectSourceEntry, false)
    assert.equal('agentRoute' in effectSourceEntry, false)

    const tsgoSourceEntry = record(sourceEntries['tsgo-official-source'])
    const tsgoEntryContract = record(tsgoSourceEntry.contract)
    assert.equal(tsgoSourceEntry.kind, 'provider-internal-github-subtree')
    assert.equal(tsgoEntryContract.path, 'repos/tsgo.subtree.json')
    assert.equal(record(tsgoContract.subtree).split, '43ed476270fb3cf78fe7afac2086d67340ca0486')

    const sourceBoundary = record(codexProfile.sourceBoundary)
    assert.equal(sourceBoundary.providerRepoInternal, true)
    assert.equal(sourceBoundary.targetDelivery, 'identity-only')
    assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('repos/effect'))
    assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('repos/tsgo'))
    assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('harness/effect-routes.md'))
    assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('harness/tsgo-routes.md'))
    assert.ok((sourceBoundary.allowedTargetSourceIdentity as ReadonlyArray<unknown>).includes('artifact.sourceIdentities[].contractPath'))
    assert.equal('officialSource' in codexProfile, false)

    const artifactReferences = record(profile.artifactReferences)
    assert.equal(artifactReferences.mode, 'provider-artifact-reference')
    assert.equal(artifactReferences.targetDelivery, 'identity-only')
    const references = record(artifactReferences.references)
    assert.equal(record(references['effect-source-tree']).path, 'repos/effect')
    assert.equal(record(references['effect-source-tree']).targetDelivery, 'artifact-only')
    assert.equal(record(references['effect-route-doc']).path, 'harness/effect-routes.md')
    assert.equal(record(references['tsgo-source-tree']).path, 'repos/tsgo')
    assert.equal(record(references['tsgo-source-tree']).targetDelivery, 'artifact-only')
    assert.equal(record(references['tsgo-route-doc']).path, 'harness/tsgo-routes.md')

    const packageFiles = packageJson.files as ReadonlyArray<unknown>
    assert.ok(packageFiles.includes('provider'))
    assert.ok(packageFiles.includes('harness'))
    assert.ok(packageFiles.includes('repos'))
    assert.ok(packageFiles.includes('repos/effect.subtree.json'))
    assert.ok(packageFiles.includes('repos/tsgo.subtree.json'))
  }))

  it.effect('provider profile and repository tsconfig use strict tsgo policy', () => Effect.gen(function* () {
    const profile = record(yield* readJson('provider/effect-harness.provider.json'))
    const tsconfig = record(yield* readJson('tsconfig.json'))
    const codexProfile = record(record(profile.profiles)['codex-effect-v4'])
    const packageBaseline = record(codexProfile.packageBaseline)
    for (const [name, version] of Object.entries(expectedPackageBaseline)) {
      assert.equal(packageBaseline[name], version)
    }

    const tsgoPolicy = record(codexProfile.tsgoPolicy)
    assert.equal(tsgoPolicy.mode, 'strict-v4')
    assert.equal(tsgoPolicy.sourceEntry, 'tsgo-official-source')
    assert.equal(record(tsgoPolicy.ruleMapSource).ruleCount, Object.keys(strictDiagnosticSeverity).length)

    const contributions = record(codexProfile.contributions)
    const packageJson = record(contributions.packageJson)
    const scripts = record(packageJson.scripts)
    assert.equal(record(scripts.prepare).defaultCommand, expectedPrepareCommand)
    assert.equal(record(scripts.typecheck).defaultCommand, expectedTypecheckCommand)

    const providerTsconfig = record(contributions.tsconfig)
    const providerCompilerOptions = record(providerTsconfig.compilerOptions)
    const providerPlugin = languageServicePlugin(providerCompilerOptions.plugins as ReadonlyArray<unknown>)
    assert.equal('options' in providerPlugin, false)
    assert.equal('overrides' in providerPlugin, false)
    assert.equal(providerPlugin.diagnostics, true)
    assert.equal(providerPlugin.includeSuggestionsInTsc, true)
    assert.equal(providerPlugin.ignoreEffectSuggestionsInTscExitCode, false)
    assert.equal(providerPlugin.ignoreEffectWarningsInTscExitCode, false)
    assert.equal(providerPlugin.ignoreEffectErrorsInTscExitCode, false)
    assert.equal(record(providerPlugin.diagnosticSeverity).floatingEffect, 'error')
    assert.equal(record(providerPlugin.diagnosticSeverity).asyncFunction, 'warning')
    assert.equal(record(providerPlugin.diagnosticSeverity).catchToOrElseSucceed, 'suggestion')

    const compilerOptions = record(tsconfig.compilerOptions)
    const plugin = languageServicePlugin(compilerOptions.plugins as ReadonlyArray<unknown>)
    assert.deepStrictEqual(plugin, providerPlugin)
  }))

  it.effect('provider profile declares package manifest and TypeScript contribution roles', () => Effect.gen(function* () {
    const profile = record(yield* readJson('provider/effect-harness.provider.json'))
    const codexProfile = record(record(profile.profiles)['codex-effect-v4'])
    const contributions = record(codexProfile.contributions)

    const packageJson = record(contributions.packageJson)
    assert.equal(packageJson.mode, 'structured-merge')
    assert.equal(packageJson.targetPath, 'package.json')
    assert.equal(packageJson.selfConformanceSpecifier, 'catalog:')
    assert.equal('dependencies' in packageJson, false)
    assert.equal('devDependencies' in packageJson, false)
    const dependencyGroups = record(packageJson.dependencyGroups)
    const scripts = record(packageJson.scripts)
    assert.deepStrictEqual(record(record(dependencyGroups.runtime).packages), baselinePackages(['effect', '@effect/platform-node']))
    assert.equal(record(dependencyGroups.runtime).field, 'dependencies')
    assert.deepStrictEqual(record(record(dependencyGroups.testing).packages), baselinePackages(['@effect/vitest', 'vitest']))
    assert.equal(record(dependencyGroups.testing).field, 'devDependencies')
    assert.deepStrictEqual(record(record(dependencyGroups.diagnostics).packages), baselinePackages(['@effect/tsgo', '@effect/language-service']))
    assert.equal(record(dependencyGroups.diagnostics).field, 'devDependencies')
    assert.deepStrictEqual(record(record(dependencyGroups.nativeBackend).packages), baselinePackages(['@typescript/native-preview']))
    assert.equal(record(dependencyGroups.nativeBackend).field, 'devDependencies')
    assert.deepStrictEqual(record(record(dependencyGroups.linting).packages), baselinePackages(['@antfu/eslint-config', 'eslint']))
    assert.equal(record(dependencyGroups.linting).field, 'devDependencies')
    assert.equal(record(scripts.test).defaultCommand, 'vitest run')
    assert.equal(record(scripts.lint).defaultCommand, 'eslint')

    const tsconfigContribution = record(contributions.tsconfig)
    assert.equal(tsconfigContribution.mode, 'structured-merge')
    assert.equal(tsconfigContribution.targetPath, 'tsconfig.json')
    const tsgo = record(tsconfigContribution.tsgo)
    assert.equal(tsgo.diagnosticCommand, expectedTypecheckCommand)
    assert.deepStrictEqual(record(tsgo.diagnosticGate), strictDiagnosticGate)
    assert.deepStrictEqual(record(tsgo.nativeBackend), {
      package: '@typescript/native-preview',
      setupCommand: expectedPrepareCommand,
      version: expectedPackageBaseline['@typescript/native-preview'],
    })
    assert.deepStrictEqual(record(tsgo.ruleMapSource), {
      metadata: 'repos/tsgo/_packages/tsgo/src/metadata.json',
      policy: 'harness/tsgo.md',
      ruleCount: Object.keys(strictDiagnosticSeverity).length,
      supportedEffect: 'v4',
    })
  }))

  it.effect('provider profile declares target managed surfaces and editor policy options', () => Effect.gen(function* () {
    const profile = record(yield* readJson('provider/effect-harness.provider.json'))
    const codexProfile = record(record(profile.profiles)['codex-effect-v4'])

    const managedSurfaces = record(codexProfile.managedSurfaces)
    const targetReceives = managedSurfaces.targetReceives as ReadonlyArray<string>
    assert.ok(targetReceives.some(surface => surface.includes('provider record')))
    assert.ok(targetReceives.some(surface => surface.includes('package.json')))
    assert.ok(targetReceives.some(surface => surface.includes('tsconfig.json')))
    assert.ok(targetReceives.some(surface => surface.includes('lint, test, and verification policy')))
    assert.ok(targetReceives.some(surface => surface.includes('docs bundle')))
    assert.ok(targetReceives.some(surface => surface.includes('snippets')))
    assert.equal(targetReceives.some(surface => surface.includes('AGENTS.md managed block')), false)
    assert.equal(targetReceives.some(surface => surface.includes('runtime assets')), false)
    assert.equal(targetReceives.some(surface => surface.includes('feedback')), false)

    const targetDoesNotReceive = managedSurfaces.targetDoesNotReceive as ReadonlyArray<string>
    assert.ok(targetDoesNotReceive.includes('provider repo internal source pin repos/effect'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal subtree contract repos/effect.subtree.json'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal Effect route harness/effect-routes.md'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal source pin repos/tsgo'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal subtree contract repos/tsgo.subtree.json'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal tsgo route harness/tsgo-routes.md'))
    assert.ok(targetDoesNotReceive.includes('effect-harness runtime assets under .codex'))
    assert.ok(targetDoesNotReceive.includes('.effect-harness.json standalone manifest'))

    const contributions = record(codexProfile.contributions)
    assert.equal('codexAssets' in contributions, false)
    assert.equal('runtimeAssets' in contributions, false)
    assert.equal('agentsBlock' in contributions, false)

    const documentationBundle = record(contributions.documentationBundle)
    assert.equal(documentationBundle.mode, 'managed-files')
    assert.equal(documentationBundle.targetBasePath, '.prelude/providers/effect-harness/docs')
    const documentationFiles = documentationBundle.files as ReadonlyArray<unknown>
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/effect-code.md'))
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/diagnostics.md'))
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/discovery.md'))
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/editor-policy.md'))
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/managed-surfaces.md'))
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/package-config.md'))
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/quality-policy.md'))
    assert.ok(documentationFiles.some(file => record(file).sourcePath === 'provider/docs/source-identity.md'))

    const snippets = record(contributions.snippets)
    assert.equal(snippets.mode, 'managed-files')
    assert.equal(snippets.targetBasePath, '.prelude/providers/effect-harness/snippets')
    const snippetFiles = snippets.files as ReadonlyArray<unknown>
    const agentsSnippet = record(snippetFiles.find(file => record(file).sourcePath === 'provider/snippets/agents.md'))
    assert.equal(agentsSnippet.targetUsage, 'manual-copy-or-include-only')

    const editorPolicy = record(contributions.editorPolicy)
    assert.equal(editorPolicy.mode, 'structured-merge')
    assert.ok((editorPolicy.targetPaths as ReadonlyArray<unknown>).includes('.vscode/settings.json'))
    assert.ok((editorPolicy.targetPaths as ReadonlyArray<unknown>).includes('.zed/settings.json'))
    assert.equal(record(editorPolicy.sourceIdentity).targetReceivesSourceTrees, false)
    assert.ok((record(editorPolicy.sourceIdentity).providerInternalPatterns as ReadonlyArray<unknown>).includes('repos/**'))

    const policies = record(editorPolicy.policies)
    const autoImportExclude = record(policies.autoImportExclude)
    assert.equal(autoImportExclude.level, 'hard-boundary')
    assert.ok((autoImportExclude.patterns as ReadonlyArray<unknown>).includes('repos/**'))
    const vscodeAutoImport = record(autoImportExclude.vscode)
    assert.ok((vscodeAutoImport['typescript.preferences.autoImportFileExcludePatterns'] as ReadonlyArray<unknown>).includes('repos/**'))
    assert.ok((vscodeAutoImport['javascript.preferences.autoImportFileExcludePatterns'] as ReadonlyArray<unknown>).includes('repos/**'))

    const watchExclude = record(policies.watchExclude)
    assert.equal(watchExclude.level, 'recommended')
    assert.equal(watchExclude.requiresConfiguration, true)
    const zedWatchExclude = record(watchExclude.zed)
    assert.equal(zedWatchExclude.setting, 'file_scan_exclusions')
    assert.equal(zedWatchExclude.requiresExplicitOptIn, true)

    const searchExclude = record(policies.searchExclude)
    assert.equal(searchExclude.level, 'recommended')
    assert.equal(searchExclude.requiresConfiguration, true)
    assert.equal(record(record(searchExclude.vscode)['search.exclude'])['repos/**'], true)

    const filesExclude = record(policies.filesExclude)
    assert.equal(filesExclude.level, 'preference')
    assert.equal(filesExclude.requiresExplicitOptIn, true)
    assert.equal(record(filesExclude.sourceEntryDefaults)['effect-official-source'], 'enabled')
    assert.equal(record(filesExclude.sourceEntryDefaults)['tsgo-official-source'], 'disabled')
    assert.equal(record(record(filesExclude.vscode)['files.exclude'])['repos/effect/**'], true)
    assert.equal('repos/tsgo/**' in record(record(filesExclude.vscode)['files.exclude']), false)
    assert.equal(record(filesExclude.zed).setting, 'file_scan_exclusions')

    const vscodeSettings = record(yield* readJson('.vscode/settings.json'))
    assert.ok((vscodeSettings['typescript.preferences.autoImportFileExcludePatterns'] as ReadonlyArray<unknown>).includes('repos/**'))
    assert.ok((vscodeSettings['javascript.preferences.autoImportFileExcludePatterns'] as ReadonlyArray<unknown>).includes('repos/**'))
    assert.equal(record(vscodeSettings['files.watcherExclude'])['repos/**'], true)
    assert.equal(record(vscodeSettings['search.exclude'])['repos/**'], true)
    assert.equal(record(vscodeSettings['files.exclude'])['repos/effect/**'], true)
    assert.equal('repos/tsgo/**' in record(vscodeSettings['files.exclude']), false)
  }))

  it.effect('provider profile declares lint test and verification policy contributions', () => Effect.gen(function* () {
    const profile = record(yield* readJson('provider/effect-harness.provider.json'))
    const packageJson = record(yield* readJson('package.json'))
    const codexProfile = record(record(profile.profiles)['codex-effect-v4'])
    const contributions = record(codexProfile.contributions)
    const packageJsonContribution = record(contributions.packageJson)
    const contributionScripts = record(packageJsonContribution.scripts)
    const scripts = record(packageJson.scripts)

    const lintGuardrails = record(contributions.lintGuardrails)
    assert.equal(lintGuardrails.mode, 'command-policy')
    assert.equal(lintGuardrails.stage, 'lint')
    assert.equal(lintGuardrails.command, 'pnpm lint --max-warnings 0')
    assert.equal(scripts.lint, 'eslint')
    assert.ok((record(lintGuardrails.layers).owns as ReadonlyArray<unknown>).includes('repository import boundary'))
    assert.ok((record(lintGuardrails.layers).owns as ReadonlyArray<unknown>).includes('Effect test entry'))
    assert.ok((record(lintGuardrails.layers).doesNotOwn as ReadonlyArray<unknown>).includes('Effect semantic diagnostics'))
    assert.ok((lintGuardrails.configFiles as ReadonlyArray<unknown>).includes('eslint.config.mjs'))
    assert.ok((record(lintGuardrails.rules).restrictedImports as ReadonlyArray<unknown>).includes('@effect/cli'))
    assert.ok((record(lintGuardrails.rules).restrictedImports as ReadonlyArray<unknown>).includes('repos/effect/**'))
    assert.ok((record(lintGuardrails.rules).restrictedVitestImports as ReadonlyArray<unknown>).includes('it'))
    assert.ok((record(lintGuardrails.rules).allowedVitestImports as ReadonlyArray<unknown>).includes('vi'))
    assert.ok((record(lintGuardrails.rules).restrictedSyntax as ReadonlyArray<unknown>).includes('Context.Tag'))
    assert.ok((record(lintGuardrails.rules).restrictedSyntax as ReadonlyArray<unknown>).includes('{ disableValidation: true }'))

    const testPolicy = record(contributions.testPolicy)
    assert.equal(testPolicy.mode, 'command-policy')
    assert.equal(testPolicy.stage, 'tests')
    assert.equal(testPolicy.command, 'pnpm test')
    assert.equal(testPolicy.framework, '@effect/vitest')
    assert.equal(record(contributionScripts.test).defaultCommand, 'vitest run')
    assert.ok((testPolicy.expectedEntries as ReadonlyArray<unknown>).includes('tests/**/*.test.ts'))
    assert.ok((testPolicy.effectEntrypoints as ReadonlyArray<unknown>).includes('it.effect'))
    assert.ok((testPolicy.effectEntrypoints as ReadonlyArray<unknown>).includes('it.live'))
    assert.ok((testPolicy.disallowedImports as ReadonlyArray<unknown>).includes('node:test'))
    assert.ok((testPolicy.disallowedVitestImports as ReadonlyArray<unknown>).includes('it'))

    const verificationPolicy = record(contributions.verificationPolicy)
    assert.equal(verificationPolicy.mode, 'pipeline-policy')
    assert.equal(verificationPolicy.completionGate, 'pnpm verify')
    assert.equal(verificationPolicy.packageScript, 'node bin/effect-harness.ts verify --harness .')
    assert.equal(scripts.verify, verificationPolicy.packageScript)
    assert.deepStrictEqual(
      (verificationPolicy.stages as ReadonlyArray<unknown>).map(stage => record(stage).tag),
      verifyStageSpecs.map(stage => stage.tag),
    )
    assert.ok((record(verificationPolicy.localCommands).diagnostics as ReadonlyArray<unknown>).includes('pnpm typecheck'))
    assert.ok((record(verificationPolicy.localCommands).completion as ReadonlyArray<unknown>).includes('pnpm verify'))
    assert.equal(verificationPolicy.lifecycleOwner, 'prelude')
  }))
})
