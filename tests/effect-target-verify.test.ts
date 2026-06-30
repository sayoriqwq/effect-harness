import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-target-'))
}

function runCli(args: ReadonlyArray<string>) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function makeTarget(target: string) {
  mkdirSync(target)
  writeFileSync(join(target, 'package.json'), JSON.stringify({
    name: 'effect-consumer-target',
    type: 'module',
    scripts: {},
  }, null, 2))
  writeFileSync(join(target, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true,
    },
  }, null, 2))

  const init = runCli([
    'init',
    '--target',
    target,
    '--harness',
    repoRoot,
  ])
  assert.equal(init.status, 0, init.stderr)
}

const providerBaselinePackages = [
  'effect',
  '@effect/platform-node',
  '@effect/vitest',
  '@effect/tsgo',
  '@effect/language-service',
  '@typescript/native-preview',
] as const

function packageSectionFor(name: string): 'dependencies' | 'devDependencies' {
  return name === 'effect' || name === '@effect/platform-node'
    ? 'dependencies'
    : 'devDependencies'
}

function jsonPointerSegment(segment: string): string {
  return segment.replace(/~/gu, '~0').replace(/\//gu, '~1')
}

function writePreludeProviderRecord(
  target: string,
  options: {
    readonly manifest?: boolean
    readonly topology?: 'single-package' | 'workspace'
    readonly dependencyPackagePath?: string
    readonly baselineSurfaceNames?: ReadonlyArray<string>
    readonly tsconfigSurface?: boolean
    readonly typecheckSurface?: boolean
  } = {},
) {
  const manifest = options.manifest ?? true
  const topology = options.topology ?? 'single-package'
  const dependencyPackagePath = options.dependencyPackagePath ?? 'package.json'
  const baselineSurfaceNames = options.baselineSurfaceNames ?? providerBaselinePackages
  const tsconfigSurface = options.tsconfigSurface ?? true
  const typecheckSurface = options.typecheckSurface ?? true
  mkdirSync(join(target, '.prelude/providers/effect-harness'), { recursive: true })
  writeFileSync(join(target, '.codex/effect-feedback/.gitkeep'), '')
  rmSync(join(target, '.effect-harness.json'), { force: true })

  const packageJson = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    scripts: Record<string, string>
  }
  const dependencyPackageJson = dependencyPackagePath === 'package.json'
    ? packageJson
    : JSON.parse(readFileSync(join(target, dependencyPackagePath), 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
      scripts: Record<string, string>
    }
  const tsconfig = tsconfigSurface
    ? JSON.parse(readFileSync(join(target, 'tsconfig.json'), 'utf8')) as {
      compilerOptions: {
        plugins: unknown
      }
    }
    : undefined
  const agentsBlock = readFileSync(join(target, 'AGENTS.md'), 'utf8')
    .match(/<!-- effect-harness:start -->[\s\S]*?<!-- effect-harness:end -->/u)?.[0] ?? ''
  const ownedFiles = [
    '.codex/skills/effect-code/SKILL.md',
    '.codex/skills/effect-code/agents/openai.yaml',
    '.codex/skills/effect-feedback/SKILL.md',
    '.codex/skills/effect-feedback/agents/openai.yaml',
    '.codex/agents/effect-worker.md',
    '.codex/effect-feedback/.gitkeep',
  ]
  const ownedFileSurfaces = ownedFiles.map(filePath => ({
    id: `provider-managed-file:effect-harness:${filePath}`,
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: 'file',
    locator: filePath,
    conflictPolicy: 'block',
    contractVersion: '1',
    implementationVersion: '0.1.0',
    authority: 'owner',
    kind: 'ownedFile',
    path: filePath,
    base: readFileSync(join(target, filePath), 'utf8'),
    snapshot: readFileSync(join(target, filePath), 'utf8'),
    operationId: `write-${filePath.replace(/[^a-z0-9]+/giu, '-')}`,
  }))
  const typecheckSurfaces = typecheckSurface
    ? [{
        id: 'package-manifest:root:/scripts/typecheck',
        owner: 'provider:effect-harness',
        lifecycle: 'managed',
        scope: 'entry',
        locator: 'package.json#/scripts/typecheck',
        conflictPolicy: 'block',
        contractVersion: '1',
        implementationVersion: '0.1.0',
        authority: 'bounded',
        kind: 'structuredPointer',
        path: 'package.json',
        pointer: '/scripts/typecheck',
        base: packageJson.scripts.typecheck,
        snapshot: packageJson.scripts.typecheck,
        operationId: 'write-package-json',
      }]
    : []
  const tsconfigSurfaces = tsconfigSurface
    ? [{
        id: 'tsconfig:root:/compilerOptions/plugins',
        owner: 'provider:effect-harness',
        lifecycle: 'managed',
        scope: 'entry',
        locator: 'tsconfig.json#/compilerOptions/plugins',
        conflictPolicy: 'block',
        contractVersion: '1',
        implementationVersion: '0.1.0',
        authority: 'bounded',
        kind: 'structuredPointer',
        path: 'tsconfig.json',
        pointer: '/compilerOptions/plugins',
        base: JSON.stringify(tsconfig?.compilerOptions.plugins),
        snapshot: JSON.stringify(tsconfig?.compilerOptions.plugins),
        operationId: 'write-tsconfig',
      }]
    : []
  const baselinePackageSurfaces = baselineSurfaceNames.map((name) => {
    const section = packageSectionFor(name)
    const pointer = `/${section}/${jsonPointerSegment(name)}`
    const value = dependencyPackageJson[section]?.[name]
    return {
      id: `package-manifest:${dependencyPackagePath}:${pointer}`,
      owner: 'provider:effect-harness',
      lifecycle: 'managed',
      scope: 'entry',
      locator: `${dependencyPackagePath}#${pointer}`,
      conflictPolicy: 'block',
      contractVersion: '1',
      implementationVersion: '0.1.0',
      authority: 'bounded',
      kind: 'structuredPointer',
      path: dependencyPackagePath,
      pointer,
      base: value,
      snapshot: value,
      operationId: `write-package-json-${dependencyPackagePath.replace(/[^a-z0-9]+/giu, '-')}`,
    }
  })
  const providerRecordPath = join(target, '.prelude/providers/effect-harness/provider.json')
  writeFileSync(providerRecordPath, `${JSON.stringify({
    schemaVersion: 1,
    id: 'effect-harness',
    contractVersion: '1',
    providerVersion: '0.1.0',
    profile: 'codex-effect-v4',
    artifact: {
      id: 'effect-harness',
      version: '0.1.0',
      packageBaseline: {
        'effect': '4.0.0-beta.90',
        '@effect/platform-node': '4.0.0-beta.90',
        '@effect/vitest': '4.0.0-beta.90',
        '@effect/tsgo': '0.14.6',
        '@effect/language-service': '0.86.2',
        '@typescript/native-preview': '7.0.0-dev.20260624.1',
      },
    },
    projectedContext: {
      topology,
      packageScopes: ['effect-consumer-target'],
    },
    options: {
      runtime: 'codex',
      effect: {
        major: 4,
      },
      languageService: {
        enabled: true,
        floatingEffect: 'error',
      },
      packageScopes: ['effect-consumer-target'],
    },
    runtime: {
      commands: {
        status: packageJson.scripts['effect:status'],
        verify: packageJson.scripts['effect:verify'],
      },
      routes: {
        harness: join(repoRoot, 'HARNESS.md'),
      },
      files: ownedFiles,
    },
    surfaces: [
      ...baselinePackageSurfaces,
      {
        id: 'package-manifest:root:/scripts/effect:verify',
        owner: 'provider:effect-harness',
        lifecycle: 'managed',
        scope: 'entry',
        locator: 'package.json#/scripts/effect:verify',
        conflictPolicy: 'block',
        contractVersion: '1',
        implementationVersion: '0.1.0',
        authority: 'bounded',
        kind: 'structuredPointer',
        path: 'package.json',
        pointer: '/scripts/effect:verify',
        base: packageJson.scripts['effect:verify'],
        snapshot: packageJson.scripts['effect:verify'],
        operationId: 'write-package-json',
      },
      ...typecheckSurfaces,
      ...tsconfigSurfaces,
      ...ownedFileSurfaces,
      {
        id: 'provider-managed-block:effect-harness:AGENTS.md#effect-harness',
        owner: 'provider:effect-harness',
        lifecycle: 'managed',
        scope: 'entry',
        locator: 'AGENTS.md#effect-harness',
        conflictPolicy: 'block',
        contractVersion: '1',
        implementationVersion: '0.1.0',
        authority: 'bounded',
        kind: 'managedBlock',
        path: 'AGENTS.md',
        startMarker: '<!-- effect-harness:start -->',
        endMarker: '<!-- effect-harness:end -->',
        base: agentsBlock,
        snapshot: agentsBlock,
        operationId: 'write-agents-md-block',
      },
    ],
    verificationRecordId: 'effect-harness:codex-effect-v4',
  }, null, 2)}\n`)

  if (manifest) {
    mkdirSync(join(target, '.prelude'), { recursive: true })
    writeFileSync(join(target, '.prelude/manifest.json'), `${JSON.stringify({
      maintainProviders: [
        {
          id: 'effect-harness',
          recordPath: '.prelude/providers/effect-harness/provider.json',
        },
      ],
    }, null, 2)}\n`)
  }

  return providerRecordPath
}

function updateProviderRecord(path: string, update: (record: Record<string, unknown>) => void) {
  const record = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  update(record)
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`)
}

function rewriteBaselineSurfacePaths(providerRecord: string, path: string) {
  const baselinePointers = new Set(providerBaselinePackages.map((name) => {
    const section = packageSectionFor(name)
    return `/${section}/${jsonPointerSegment(name)}`
  }))
  updateProviderRecord(providerRecord, (record) => {
    const surfaces = record.surfaces as Array<Record<string, unknown>>
    for (const surface of surfaces) {
      if (typeof surface.pointer === 'string' && baselinePointers.has(surface.pointer)) {
        surface.path = path
        surface.locator = `${path}#${surface.pointer}`
      }
    }
  })
}

it.effect('target verifier rejects caret ranges for pinned Effect baseline dependencies', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.dependencies.effect = '^4.0.0-beta.90'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /effect is \^4\.0\.0-beta\.90; expected 4\.0\.0-beta\.90 or catalog:/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale pnpm catalog entries for catalog dependencies', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.dependencies.effect = 'catalog:'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    writeFileSync(join(target, 'pnpm-workspace.yaml'), [
      'packages:',
      '  - apps/*',
      '',
      'catalog:',
      '  effect: 4.0.0-beta.0',
      '',
    ].join('\n'))

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /pnpm-workspace\.yaml catalog effect is 4\.0\.0-beta\.0; expected 4\.0\.0-beta\.90/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier scans monorepo app source directories with guardrails', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const sourceRoot = join(target, 'apps/cli/src')
    mkdirSync(sourceRoot, { recursive: true })
    writeFileSync(join(sourceRoot, 'bad.ts'), [
      'import * as Effect from "effect/Effect"',
      '',
      'export const lifted = Effect.succeed(null as string | null)',
      '',
    ].join('\n'))

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Do not wrap asserted values in Effect\.succeed/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier accepts a target with harness contracts', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect target verified against harness/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier accepts a prelude provider record without legacy effect-harness manifest', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    writePreludeProviderRecord(target)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect target verified against harness/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier accepts an explicit provider record path', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const providerRecord = writePreludeProviderRecord(target, { manifest: false })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
      '--provider-record',
      providerRecord,
    ])

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect target verified against harness/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier accepts workspace provider records without root tsconfig or typecheck surfaces', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>
    }
    packageJson.scripts.typecheck = 'pnpm -r typecheck'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    rmSync(join(target, 'tsconfig.json'), { force: true })
    writePreludeProviderRecord(target, {
      topology: 'workspace',
      tsconfigSurface: false,
      typecheckSurface: false,
    })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect target verified against harness/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier accepts workspace provider package surfaces under a package scope', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    mkdirSync(join(target, 'apps/worker'), { recursive: true })
    const rootPackagePath = join(target, 'package.json')
    const rootPackageJson = JSON.parse(readFileSync(rootPackagePath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      scripts: Record<string, string>
    }
    const childPackageJson = {
      name: 'worker',
      type: 'module',
      dependencies: rootPackageJson.dependencies,
      devDependencies: rootPackageJson.devDependencies,
      scripts: {
        typecheck: 'tsgo --noEmit --project tsconfig.json',
      },
    }
    rootPackageJson.dependencies = {}
    rootPackageJson.devDependencies = {}
    rootPackageJson.scripts.typecheck = 'pnpm -r typecheck'
    writeFileSync(rootPackagePath, `${JSON.stringify(rootPackageJson, null, 2)}\n`)
    writeFileSync(join(target, 'apps/worker/package.json'), `${JSON.stringify(childPackageJson, null, 2)}\n`)
    rmSync(join(target, 'tsconfig.json'), { force: true })
    writePreludeProviderRecord(target, {
      dependencyPackagePath: 'apps/worker/package.json',
      topology: 'workspace',
      tsconfigSurface: false,
      typecheckSurface: false,
    })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect target verified against harness/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale provider package surfaces under a package scope', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    mkdirSync(join(target, 'apps/worker'), { recursive: true })
    const rootPackagePath = join(target, 'package.json')
    const rootPackageJson = JSON.parse(readFileSync(rootPackagePath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      scripts: Record<string, string>
    }
    const childPackagePath = join(target, 'apps/worker/package.json')
    writeFileSync(childPackagePath, `${JSON.stringify({
      name: 'worker',
      type: 'module',
      dependencies: rootPackageJson.dependencies,
      devDependencies: rootPackageJson.devDependencies,
    }, null, 2)}\n`)
    rootPackageJson.dependencies = {}
    rootPackageJson.devDependencies = {}
    rootPackageJson.scripts.typecheck = 'pnpm -r typecheck'
    writeFileSync(rootPackagePath, `${JSON.stringify(rootPackageJson, null, 2)}\n`)
    rmSync(join(target, 'tsconfig.json'), { force: true })
    writePreludeProviderRecord(target, {
      dependencyPackagePath: 'apps/worker/package.json',
      topology: 'workspace',
      tsconfigSurface: false,
      typecheckSurface: false,
    })

    const childPackageJson = JSON.parse(readFileSync(childPackagePath, 'utf8')) as {
      dependencies: Record<string, string>
    }
    childPackageJson.dependencies.effect = '4.0.0-beta.0'
    writeFileSync(childPackagePath, `${JSON.stringify(childPackageJson, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /apps\/worker\/package\.json pointer \/dependencies\/effect/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects provider records missing Effect baseline package surfaces', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    packageJson.dependencies = {}
    packageJson.devDependencies = {}
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    writePreludeProviderRecord(target, { baselineSurfaceNames: [] })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /provider record surfaces must include Effect baseline package structured pointers/u)
    assert.match(result.stderr, /provider record surfaces must include baseline package pointer: effect/u)
    assert.match(result.stderr, /provider record surfaces must include baseline package pointer: @effect\/language-service/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects forbidden Effect CLI in provider package scopes', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    mkdirSync(join(target, 'apps/worker'), { recursive: true })
    const rootPackagePath = join(target, 'package.json')
    const rootPackageJson = JSON.parse(readFileSync(rootPackagePath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      scripts: Record<string, string>
    }
    const childPackagePath = join(target, 'apps/worker/package.json')
    writeFileSync(childPackagePath, `${JSON.stringify({
      name: 'worker',
      type: 'module',
      dependencies: rootPackageJson.dependencies,
      devDependencies: {
        ...rootPackageJson.devDependencies,
        '@effect/cli': '0.70.0',
      },
    }, null, 2)}\n`)
    rootPackageJson.dependencies = {}
    rootPackageJson.devDependencies = {}
    rootPackageJson.scripts.typecheck = 'pnpm -r typecheck'
    writeFileSync(rootPackagePath, `${JSON.stringify(rootPackageJson, null, 2)}\n`)
    rmSync(join(target, 'tsconfig.json'), { force: true })
    writePreludeProviderRecord(target, {
      dependencyPackagePath: 'apps/worker/package.json',
      topology: 'workspace',
      tsconfigSurface: false,
      typecheckSurface: false,
    })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /apps\/worker\/package\.json must not depend on @effect\/cli/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale provider catalog entries in package scopes', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    mkdirSync(join(target, 'apps/worker'), { recursive: true })
    const rootPackagePath = join(target, 'package.json')
    const rootPackageJson = JSON.parse(readFileSync(rootPackagePath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      scripts: Record<string, string>
    }
    const childPackageJson = {
      name: 'worker',
      type: 'module',
      dependencies: {
        'effect': 'catalog:',
        '@effect/platform-node': 'catalog:',
      },
      devDependencies: {
        '@effect/vitest': 'catalog:',
        '@effect/tsgo': 'catalog:',
        '@effect/language-service': 'catalog:',
        '@typescript/native-preview': 'catalog:',
      },
    }
    rootPackageJson.dependencies = {}
    rootPackageJson.devDependencies = {}
    rootPackageJson.scripts.typecheck = 'pnpm -r typecheck'
    writeFileSync(rootPackagePath, `${JSON.stringify(rootPackageJson, null, 2)}\n`)
    writeFileSync(join(target, 'apps/worker/package.json'), `${JSON.stringify(childPackageJson, null, 2)}\n`)
    writeFileSync(join(target, 'pnpm-workspace.yaml'), [
      'packages:',
      '  - apps/*',
      '',
      'catalog:',
      '  effect: 4.0.0-beta.0',
      '  "@effect/platform-node": 4.0.0-beta.90',
      '  "@effect/vitest": 4.0.0-beta.90',
      '  "@effect/tsgo": 0.14.6',
      '  "@effect/language-service": 0.86.2',
      '  "@typescript/native-preview": 7.0.0-dev.20260624.1',
      '',
    ].join('\n'))
    rmSync(join(target, 'tsconfig.json'), { force: true })
    writePreludeProviderRecord(target, {
      dependencyPackagePath: 'apps/worker/package.json',
      topology: 'workspace',
      tsconfigSurface: false,
      typecheckSurface: false,
    })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /pnpm-workspace\.yaml catalog effect is 4\.0\.0-beta\.0; expected 4\.0\.0-beta\.90/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects provider baseline surfaces with absolute paths', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const externalPackagePath = join(root, 'external-package.json')
    writeFileSync(externalPackagePath, `${JSON.stringify({
      name: 'external',
      type: 'module',
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
    }, null, 2)}\n`)
    const providerRecord = writePreludeProviderRecord(target)
    packageJson.dependencies = {}
    packageJson.devDependencies = {}
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    rewriteBaselineSurfacePaths(providerRecord, externalPackagePath)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /path must be target-root-relative; got absolute path/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects provider baseline surfaces with path traversal', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    mkdirSync(join(root, 'external'), { recursive: true })
    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    writeFileSync(join(root, 'external/package.json'), `${JSON.stringify({
      name: 'external',
      type: 'module',
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
    }, null, 2)}\n`)
    const providerRecord = writePreludeProviderRecord(target)
    packageJson.dependencies = {}
    packageJson.devDependencies = {}
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    rewriteBaselineSurfacePaths(providerRecord, '../external/package.json')

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /path must not contain \.\. segments/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects unsupported provider contract versions', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const providerRecord = writePreludeProviderRecord(target)
    updateProviderRecord(providerRecord, (record) => {
      record.contractVersion = '999'
    })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /provider record contractVersion is 999; expected 1/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects unsupported provider implementation versions', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const providerRecord = writePreludeProviderRecord(target)
    updateProviderRecord(providerRecord, (record) => {
      record.providerVersion = '999'
      const artifact = record.artifact as Record<string, unknown>
      artifact.version = '999'
    })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /provider record providerVersion is 999; expected 0\.1\.0/u)
    assert.match(result.stderr, /provider record artifact\.version is 999; expected 0\.1\.0/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale effect harness manifest content', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const manifestPath = join(target, '.effect-harness.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.source.split = 'stale-source-pin'
    manifest.packageBaseline.effect = '4.0.0-beta.0'
    manifest.commands.verify = 'effect-harness verify --target .'
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /\.effect-harness\.json source\.split is stale-source-pin/u)
    assert.match(result.stderr, /\.effect-harness\.json packageBaseline\.effect is 4\.0\.0-beta\.0/u)
    assert.match(result.stderr, /\.effect-harness\.json commands\.verify is effect-harness verify --target \.; expected/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale managed AGENTS and runtime files', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    writeFileSync(join(target, 'AGENTS.md'), [
      '<!-- effect-harness:start -->',
      '# stale route',
      '<!-- effect-harness:end -->',
      '',
    ].join('\n'))
    writeFileSync(join(target, '.codex/skills/effect-code/SKILL.md'), '# stale skill\n')
    writeFileSync(join(target, '.codex/skills/effect-code/extra.md'), '# extra managed content\n')

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /AGENTS\.md managed effect-harness route block does not match/u)
    assert.match(result.stderr, /\.codex\/skills\/effect-code\/SKILL\.md does not match/u)
    assert.match(result.stderr, /\.codex\/skills\/effect-code\/extra\.md is not managed/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects effect-tsgo as the typecheck command', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.scripts.typecheck = 'effect-tsgo --noEmit'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /effect-tsgo is the setup\/patch manager/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects plain @effect/vitest tests without Effect-native API', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const sourceRoot = join(target, 'src')
    mkdirSync(sourceRoot)
    writeFileSync(join(sourceRoot, 'plain.test.ts'), [
      'import { assert, it } from "@effect/vitest"',
      '',
      'it("uses plain vitest style", () => {',
      '  assert.equal(1, 1)',
      '})',
      '',
    ].join('\n'))

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /must use it\.effect, it\.live, or layer from @effect\/vitest/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects local effect harness dispatcher scripts', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.scripts['effect:verify'] = 'node scripts/effect-harness-local.js verify'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    mkdirSync(join(target, 'scripts'))
    writeFileSync(join(target, 'scripts/effect-harness-local.js'), '#!/usr/bin/env node\n')

    const manifestPath = join(target, '.effect-harness.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.commands.verify = packageJson.scripts['effect:verify']
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /local effect-harness dispatcher/u)
    assert.match(result.stderr, /\.effect-harness\.json commands do not match a valid harness CLI entry/u)
    assert.match(result.stderr, /effect-harness init/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects targets missing installed runtime files', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    rmSync(join(target, '.codex'), { recursive: true, force: true })
    rmSync(join(target, '.effect-harness.json'), { force: true })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Missing file: \.effect-harness\.json/u)
    assert.match(result.stderr, /Missing file: \.codex\/skills\/effect-code\/SKILL\.md/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
