import type { CanonicalTreeArchiveSourceEntry } from '@sayoriqwq/prelude-contract'

import { execFileSync } from 'node:child_process'
import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

import {
  CANONICAL_TREE_ARCHIVE_FORMAT,
  encodeCanonicalTreeArchive,
  isSafeRelativeSymlink,
  SYMBOLIC_LINK_MODE,
} from '@sayoriqwq/prelude-contract'
import { defineConfig } from 'tsdown'

const sourcePinNames = ['tsgo'] as const
const archiveDirectory = 'dist/reference-archives'

interface LegacySourcePinContract {
  readonly name: string
  readonly github: {
    readonly repository: string
    readonly ref: string
  }
  readonly local: {
    readonly prefix: string
  }
}

interface BuildReferenceArchiveOptions {
  readonly root?: string
  readonly write?: boolean
}

export function buildReferenceArchives(options: BuildReferenceArchiveOptions = {}) {
  const root = resolve(options.root ?? process.cwd())
  const archives = sourcePinNames.map(name => buildReferenceArchive(root, name))

  if (options.write === true) {
    const outputRoot = resolve(root, archiveDirectory)
    mkdirSync(outputRoot, { recursive: true })
    for (const archive of archives)
      writeFileSync(resolve(root, archive.archivePath), archive.bytes)
  }

  return archives
}

function buildReferenceArchive(root: string, name: typeof sourcePinNames[number]) {
  const contractPath = resolve(root, `repos/${name}.subtree.json`)
  const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as LegacySourcePinContract
  const prefix = `repos/${name}`
  if (contract.name !== name || contract.local.prefix !== prefix)
    throw new Error(`Source Pin contract does not own ${prefix}`)

  const index = gitIndexUnder(root, prefix)
  const encoded = encodeCanonicalTreeArchive(scanDirectory(resolve(root, prefix), index))
  return {
    name,
    archivePath: `${archiveDirectory}/${name}.pta`,
    format: CANONICAL_TREE_ARCHIVE_FORMAT,
    sourceUrl: contract.github.repository,
    revision: contract.github.ref,
    treeDigest: encoded.treeDigest,
    bytes: encoded.bytes,
  }
}

interface GitIndex {
  readonly entries: ReadonlyMap<string, string>
  readonly gitlinks: ReadonlySet<string>
}

function gitIndexUnder(root: string, prefix: string): GitIndex {
  const output = execFileSync('git', ['ls-files', '--stage', '--', prefix], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  const entries = new Map<string, string>()
  const gitlinks = new Set<string>()

  for (const line of output.split('\n').filter(Boolean)) {
    const match = /^(\d{6}) [0-9a-f]+ \d+\t(.+)$/u.exec(line)
    if (match === null)
      throw new Error(`Cannot decode Source Pin index entry: ${line}`)
    const [, mode, path] = match
    if (mode === undefined || path === undefined || !path.startsWith(`${prefix}/`))
      throw new Error(`Source Pin index entry escaped ${prefix}: ${line}`)
    const relative = path.slice(prefix.length + 1)
    if (mode === '160000')
      gitlinks.add(relative)
    else
      entries.set(relative, mode)
  }

  return { entries, gitlinks }
}

function scanDirectory(root: string, index: GitIndex): ReadonlyArray<CanonicalTreeArchiveSourceEntry> {
  const entries: Array<CanonicalTreeArchiveSourceEntry> = []

  function visit(physicalDirectory: string, logicalDirectory: string): void {
    for (const name of readdirSync(physicalDirectory).sort(compareText)) {
      const physicalPath = resolve(physicalDirectory, name)
      const logicalPath = logicalDirectory === '' ? name : `${logicalDirectory}/${name}`
      if (index.gitlinks.has(logicalPath))
        continue

      const stat = lstatSync(physicalPath)
      if (stat.isDirectory()) {
        entries.push({ kind: 'directory', path: logicalPath, mode: 0o755 })
        visit(physicalPath, logicalPath)
        continue
      }

      const gitMode = index.entries.get(logicalPath)
      if (gitMode === undefined)
        throw new Error(`Untracked entry is outside Source Pin truth: ${logicalPath}`)

      if (stat.isSymbolicLink()) {
        if (gitMode !== '120000')
          throw new Error(`Source Pin symlink has Git mode ${gitMode}: ${logicalPath}`)
        const target = readlinkSync(physicalPath)
        if (!isSafeRelativeSymlink(logicalPath, target))
          throw new Error(`Unsafe Source Pin symlink: ${logicalPath} -> ${target}`)
        entries.push({ kind: 'symbolicLink', path: logicalPath, mode: SYMBOLIC_LINK_MODE, target })
        continue
      }

      if (!stat.isFile() || (gitMode !== '100644' && gitMode !== '100755'))
        throw new Error(`Unsupported Source Pin entry: ${logicalPath}`)
      entries.push({
        kind: 'file',
        path: logicalPath,
        mode: gitMode === '100755' ? 0o755 : 0o644,
        bytes: readFileSync(physicalPath),
      })
    }
  }

  visit(root, '')
  return entries
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export default defineConfig({
  entry: ['src/prelude.ts', 'src/eslint.ts'],
  outDir: 'dist',
  format: 'esm',
  fixedExtension: false,
  dts: true,
  deps: {
    neverBundle: ['@sayoriqwq/prelude-contract', 'effect', 'typescript'],
  },
  tsconfig: 'tsconfig.build.json',
  plugins: [{
    name: 'effect-harness-legacy-tsgo-reference-archive',
    writeBundle() {
      buildReferenceArchives({ write: true })
    },
  }],
})
