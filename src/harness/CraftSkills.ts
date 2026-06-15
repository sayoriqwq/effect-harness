import { createHash } from 'node:crypto'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { formatJson, readJson } from '../platform/Json.ts'
import { writeManagedFile } from '../platform/ManagedFiles.ts'
import { commandOutput, commandString } from '../platform/Process.ts'
import { HarnessError } from './Errors.ts'

const manifestRelativePath = 'repos/craft-skills.manifest.json'

interface CraftSkillsManifest {
  readonly name: string
  source: {
    readonly owner: string
    readonly repository: string
    readonly repoPath: string
    ref: string
  }
  readonly mechanism: {
    readonly syncCommand: string
    readonly verifyCommand: string
    readonly check: string
  }
  projections: Array<CraftSkillProjection>
}

interface CraftSkillProjection {
  readonly skill: string
  readonly sourceFile: string
  readonly targetFile: string
  sha256: string
}

export interface CraftSkillsOptions {
  readonly harness: string
  readonly craft?: string | undefined
}

export interface SyncCraftSkillsOptions extends CraftSkillsOptions {
  readonly dryRun: boolean
  readonly sourceRef?: string | undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<string, HarnessError> {
  const value = record[key]
  return typeof value === 'string'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain string field: ${key}` }))
}

function decodeProjection(value: unknown, source: string): Effect.Effect<CraftSkillProjection, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    return {
      skill: yield* stringField(value, 'skill', source),
      sourceFile: yield* stringField(value, 'sourceFile', source),
      targetFile: yield* stringField(value, 'targetFile', source),
      sha256: yield* stringField(value, 'sha256', source),
    }
  })
}

function decodeCraftSkillsManifest(value: unknown, source: string): Effect.Effect<CraftSkillsManifest, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const sourceValue = value.source
    if (!isRecord(sourceValue)) {
      return yield* new HarnessError({ message: `${source} must contain object field: source` })
    }

    const mechanismValue = value.mechanism
    if (!isRecord(mechanismValue)) {
      return yield* new HarnessError({ message: `${source} must contain object field: mechanism` })
    }

    const projectionsValue = value.projections
    if (!Array.isArray(projectionsValue)) {
      return yield* new HarnessError({ message: `${source} must contain array field: projections` })
    }

    const projections: Array<CraftSkillProjection> = []
    for (const [index, projection] of projectionsValue.entries()) {
      projections.push(yield* decodeProjection(projection, `${source}.projections[${index}]`))
    }

    return {
      name: yield* stringField(value, 'name', source),
      source: {
        owner: yield* stringField(sourceValue, 'owner', `${source}.source`),
        repository: yield* stringField(sourceValue, 'repository', `${source}.source`),
        repoPath: yield* stringField(sourceValue, 'repoPath', `${source}.source`),
        ref: yield* stringField(sourceValue, 'ref', `${source}.source`),
      },
      mechanism: {
        syncCommand: yield* stringField(mechanismValue, 'syncCommand', `${source}.mechanism`),
        verifyCommand: yield* stringField(mechanismValue, 'verifyCommand', `${source}.mechanism`),
        check: yield* stringField(mechanismValue, 'check', `${source}.mechanism`),
      },
      projections,
    }
  })
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

const readManifest = Effect.fnUntraced(function* (harness: string) {
  const path = yield* Path.Path
  return yield* readJson(path.join(harness, manifestRelativePath), decodeCraftSkillsManifest)
})

const resolveCraftRepo = Effect.fnUntraced(function* (
  harness: string,
  manifest: CraftSkillsManifest,
  override: string | undefined,
) {
  const path = yield* Path.Path
  return path.resolve(harness, override ?? manifest.source.repoPath)
})

const readCraftBlob = Effect.fnUntraced(function* (
  craftRepo: string,
  sourceRef: string,
  sourceFile: string,
) {
  return yield* commandOutput('git', ['show', `${sourceRef}:${sourceFile}`], { cwd: craftRepo })
})

const currentCraftHead = Effect.fnUntraced(function* (craftRepo: string) {
  return yield* commandString('git', ['rev-parse', 'HEAD'], { cwd: craftRepo })
})

function assertSafeProjection(errors: Array<string>, projection: CraftSkillProjection): void {
  if (projection.sourceFile.startsWith('/') || projection.targetFile.startsWith('/')) {
    errors.push(`${projection.skill} projection paths must be relative.`)
  }
  if (!projection.sourceFile.endsWith('/SKILL.md') || !projection.targetFile.endsWith('/SKILL.md')) {
    errors.push(`${projection.skill} projection must map a Craft SKILL.md to a managed SKILL.md.`)
  }
  if (!projection.targetFile.startsWith('.codex/skills/')) {
    errors.push(`${projection.skill} target projection must stay under .codex/skills/.`)
  }
}

export const syncCraftSkills = Effect.fnUntraced(function* (options: SyncCraftSkillsOptions) {
  const path = yield* Path.Path
  const manifest = yield* readManifest(options.harness)
  const craftRepo = yield* resolveCraftRepo(options.harness, manifest, options.craft)
  const sourceRef = options.sourceRef ?? (yield* currentCraftHead(craftRepo))
  const changes: Array<string> = []
  const safetyErrors: Array<string> = []

  for (const projection of manifest.projections) {
    assertSafeProjection(safetyErrors, projection)
  }
  if (safetyErrors.length > 0) {
    return yield* new HarnessError({ message: `Invalid Craft skills manifest:\n- ${safetyErrors.join('\n- ')}` })
  }

  for (const projection of manifest.projections) {
    const content = yield* readCraftBlob(craftRepo, sourceRef, projection.sourceFile)
    projection.sha256 = sha256(content)
    yield* writeManagedFile(
      path.join(options.harness, projection.targetFile),
      content,
      { dryRun: options.dryRun },
      changes,
    )
  }

  manifest.source.ref = sourceRef
  yield* writeManagedFile(
    path.join(options.harness, manifestRelativePath),
    formatJson(manifest),
    { dryRun: options.dryRun },
    changes,
  )

  if (changes.length === 0) {
    yield* Console.log(`Craft skill projections already synced from ${manifest.source.repoPath} @ ${sourceRef}.`)
    return
  }

  for (const change of changes) {
    yield* Console.log(`${options.dryRun ? 'Would ' : ''}${change}`)
  }
  yield* Console.log(`${options.dryRun ? 'Dry run complete' : 'Craft skill projections synced'}: ${manifest.projections.length} files from ${manifest.source.repoPath} @ ${sourceRef}`)
})

export const verifyCraftSkills = Effect.fnUntraced(function* (options: CraftSkillsOptions) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const manifest = yield* readManifest(options.harness)
  const craftRepo = yield* resolveCraftRepo(options.harness, manifest, options.craft)
  const errors: Array<string> = []

  for (const projection of manifest.projections) {
    assertSafeProjection(errors, projection)
  }

  if (errors.length === 0) {
    for (const projection of manifest.projections) {
      const expected = yield* readCraftBlob(craftRepo, manifest.source.ref, projection.sourceFile)
      const expectedHash = sha256(expected)
      const targetPath = path.join(options.harness, projection.targetFile)

      if (projection.sha256 !== expectedHash) {
        errors.push(`${projection.skill} manifest sha256 is ${projection.sha256 || 'missing'}; expected ${expectedHash}. Run ${manifest.mechanism.syncCommand}.`)
      }
      if (!(yield* fs.exists(targetPath))) {
        errors.push(`Missing Craft skill projection: ${projection.targetFile}. Run ${manifest.mechanism.syncCommand}.`)
        continue
      }

      const actual = yield* fs.readFileString(targetPath)
      if (actual !== expected) {
        errors.push(`${projection.targetFile} does not match Craft source ${projection.sourceFile} at ${manifest.source.ref}. Run ${manifest.mechanism.syncCommand}.`)
      }
    }
  }

  if (errors.length > 0) {
    yield* Console.error('Craft skill projection verification failed:')
    for (const error of errors) {
      yield* Console.error(`- ${error}`)
    }
    return yield* new HarnessError({ message: 'Craft skill projection verification failed.' })
  }

  yield* Console.log(`Craft skill projections verified: ${manifest.projections.length} files from ${manifest.source.repoPath} @ ${manifest.source.ref}`)
})
