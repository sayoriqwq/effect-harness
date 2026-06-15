import type { EffectSubtreeManifest, OfficialSnapshot } from './Model.ts'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Path from 'effect/Path'
import { parseJson, readJson } from '../platform/Json.ts'
import { commandString } from '../platform/Process.ts'
import { HarnessError } from './Errors.ts'
import { decodeManifest, decodeOfficialSnapshot, packageTargets } from './Model.ts'

export interface StatusOptions {
  readonly harness: string
  readonly snapshot?: string | undefined
  readonly json: boolean
  readonly failOnOutdated: boolean
}

interface PackageRow {
  readonly name: string
  readonly tag: string
  readonly pinned: string | undefined
  readonly official: string | undefined
  readonly status: 'current' | 'outdated'
}

const npmDistTag = Effect.fnUntraced(function* (name: string, tag: string) {
  const output = yield* commandString('npm', ['view', name, `dist-tags.${tag}`, '--json'])
  return yield* parseJson(output, `npm:${name}:${tag}`, (value, source) =>
    typeof value === 'string'
      ? Effect.succeed(value)
      : Effect.fail(new HarnessError({ message: `${source} must return a string` })))
})

const remoteHead = Effect.fnUntraced(function* (repository: string, branch: string) {
  const output = yield* commandString('git', ['ls-remote', repository, `refs/heads/${branch}`])
  return output.split(/\s+/u)[0] || undefined
})

export const resolveOfficialSnapshot = Effect.fnUntraced(function* (
  manifest: EffectSubtreeManifest,
  snapshotPath: string | undefined,
) {
  if (snapshotPath) {
    return yield* readJson(snapshotPath, decodeOfficialSnapshot)
  }

  const packages: Record<string, string> = {}
  for (const { name, tag } of packageTargets) {
    packages[name] = yield* npmDistTag(name, tag)
  }

  return {
    packages,
    sourceHead: yield* remoteHead(manifest.repository, manifest.branch),
  }
})

function packageRows(manifest: EffectSubtreeManifest, snapshot: OfficialSnapshot): ReadonlyArray<PackageRow> {
  const baseline = manifest.packageBaseline

  return packageTargets.map(({ name, tag }) => {
    const pinned = baseline[name]
    const official = snapshot.packages?.[name]
    const status = pinned === official ? 'current' : 'outdated'

    return { name, tag, pinned, official, status }
  })
}

function sourceRow(manifest: EffectSubtreeManifest, snapshot: OfficialSnapshot) {
  const official = snapshot.sourceHead
  const status = manifest.split === official ? 'current' as const : 'outdated' as const

  return {
    name: `${manifest.repository} ${manifest.branch}`,
    pinned: manifest.split,
    official,
    status,
  }
}

function summarize(result: {
  readonly manifest: Pick<EffectSubtreeManifest, 'repository' | 'branch' | 'split'>
  readonly packages: ReadonlyArray<PackageRow>
  readonly source: ReturnType<typeof sourceRow>
}): string {
  const lines = ['Effect official status:']

  for (const row of result.packages) {
    lines.push(`- ${row.name} (${row.tag}): pinned ${row.pinned ?? '<missing>'}; official ${row.official ?? '<unknown>'}; ${row.status}`)
  }

  lines.push(`- source ${result.source.name}: pinned ${result.source.pinned}; official ${result.source.official ?? '<unknown>'}; ${result.source.status}`)
  lines.push('')
  lines.push('Official sources:')
  lines.push('- https://registry.npmjs.org via npm view dist-tags')
  lines.push(`- ${result.manifest.repository} refs/heads/${result.manifest.branch}`)
  lines.push('')
  lines.push('Use pnpm effect:update from a clean worktree to sync source, manifest, workspace, and baseline docs.')

  return lines.join('\n')
}

export const showStatus = Effect.fnUntraced(function* (options: StatusOptions) {
  const path = yield* Path.Path
  const manifest = yield* readJson(path.join(options.harness, 'repos/effect.subtree.json'), decodeManifest)
  const official = yield* resolveOfficialSnapshot(manifest, options.snapshot)
  const result = {
    manifest: {
      repository: manifest.repository,
      branch: manifest.branch,
      split: manifest.split,
    },
    packages: packageRows(manifest, official),
    source: sourceRow(manifest, official),
  }
  const outdated = result.packages.some(row => row.status !== 'current') || result.source.status !== 'current'

  if (options.json) {
    yield* Console.log(JSON.stringify({ ...result, outdated }, null, 2))
  }
  else {
    yield* Console.log(summarize(result))
  }

  if (options.failOnOutdated && outdated) {
    return yield* new HarnessError({ message: 'Effect official status is outdated.' })
  }
})
