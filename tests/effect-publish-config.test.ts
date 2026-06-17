import type { PublishEventConfig } from '../src/harness/Publish.ts'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { fileURLToPath } from 'node:url'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { assert, it } from '@effect/vitest'

import * as Effect from 'effect/Effect'
import { HarnessError } from '../src/harness/Errors.ts'
import {
  parsePackOutput,
  readWorkflowPublishConfig,
  resolvePackFilename,
  resolvePublishConfig,
  withTemporaryPackageVersion,
} from '../src/harness/Publish.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultHarnessRoot = repoRoot

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-publish-'))
}

it.layer(NodeServices.layer)('publish config resolves CLI args over env and env over workflow event', (it) => {
  it.effect('publish config resolves CLI args over env and env over workflow event', () => Effect.gen(function* () {
    const eventConfig = {
      version: '1.0.0',
      npmTag: 'event-tag',
      dryRun: false,
      provenance: false,
    } satisfies PublishEventConfig

    const config = yield* resolvePublishConfig(
      {
        harness: defaultHarnessRoot,
        version: '0.3.0',
        npmTag: 'cli-tag',
      },
      {
        PUBLISH_VERSION: '2.0.0',
        NPM_TAG: 'env-tag',
        DRY_RUN: 'true',
      },
      eventConfig,
    )

    assert.equal(config.version, '0.3.0')
    assert.equal(config.npmTag, 'cli-tag')
    assert.equal(config.dryRun, true)
  }))
})

it.layer(NodeServices.layer)('publish config uses publish workflow inputs from file', (it) => {
  it.effect('publish config uses publish workflow inputs from file', () => Effect.gen(function* () {
    const root = makeTempDir()
    const eventPath = join(root, 'event.json')
    const event = {
      inputs: {
        version: '3.0.0',
        npm_tag: 'workflow-tag',
        dry_run: 'false',
        provenance: 'true',
      },
    }

    try {
      writeFileSync(eventPath, `${JSON.stringify(event, null, 2)}\n`)

      const eventConfig = yield* readWorkflowPublishConfig({
        GITHUB_EVENT_NAME: 'workflow_dispatch',
        GITHUB_EVENT_PATH: eventPath,
      })
      const config = yield* resolvePublishConfig(
        {
          harness: defaultHarnessRoot,
        },
        {
          GITHUB_EVENT_NAME: 'workflow_dispatch',
          GITHUB_EVENT_PATH: eventPath,
        },
        eventConfig,
      )

      assert.equal(config.version, '3.0.0')
      assert.equal(config.npmTag, 'workflow-tag')
      assert.equal(config.dryRun, false)
      assert.equal(config.provenance, true)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  }))
})

it.layer(NodeServices.layer)('publish workflow ignores blank env values', (it) => {
  it.effect('publish workflow ignores blank env values and uses workflow inputs', () => Effect.gen(function* () {
    const root = makeTempDir()
    const eventPath = join(root, 'event.json')
    const event = {
      inputs: {
        version: '4.0.0-beta.5',
        npm_tag: 'next',
        dry_run: 'false',
        provenance: 'true',
      },
    }

    try {
      writeFileSync(eventPath, `${JSON.stringify(event, null, 2)}\n`)
      const eventConfig = yield* readWorkflowPublishConfig({
        GITHUB_EVENT_NAME: 'workflow_dispatch',
        GITHUB_EVENT_PATH: eventPath,
      })
      const config = yield* resolvePublishConfig(
        {
          harness: defaultHarnessRoot,
        },
        {
          PUBLISH_VERSION: '',
          NPM_TAG: '   ',
          DRY_RUN: '',
          NPM_PROVENANCE: '',
          GITHUB_EVENT_NAME: 'workflow_dispatch',
          GITHUB_EVENT_PATH: eventPath,
        },
        eventConfig,
      )

      assert.equal(config.version, '4.0.0-beta.5')
      assert.equal(config.npmTag, 'next')
      assert.equal(config.dryRun, false)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  }))
})

it.layer(NodeServices.layer)('publish ignores GitHub release event payloads', (it) => {
  it.effect('publish ignores GitHub release event payloads', () => Effect.gen(function* () {
    const root = makeTempDir()
    const eventPath = join(root, 'event.json')
    const event = {
      release: {
        prerelease: true,
        tag_name: 'v4.0.0-beta.5',
      },
    }

    try {
      writeFileSync(eventPath, `${JSON.stringify(event, null, 2)}\n`)
      const eventConfig = yield* readWorkflowPublishConfig({
        GITHUB_EVENT_NAME: 'release',
        GITHUB_EVENT_PATH: eventPath,
      })

      assert.deepStrictEqual(eventConfig, {})
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  }))
})

it.layer(NodeServices.layer)('publish config reports invalid dist-tag', (it) => {
  it.effect('publish config reports invalid dist-tag', () => Effect.gen(function* () {
    const failure = yield* Effect.flip(resolvePublishConfig(
      {
        harness: defaultHarnessRoot,
        npmTag: 'bad tag!',
      },
      {
        PUBLISH_VERSION: '1.2.3',
      },
      {},
    ))

    assert.instanceOf(failure, Error)
    assert.match(failure.message, /Invalid npm dist-tag/u)
  }))
})

it.effect('publish package json path resolution is effect-safe', () => Effect.sync(() => {
  const temp = makeTempDir()
  const packagePath = join(temp, 'package.json')
  writeFileSync(packagePath, `${JSON.stringify({ name: 'temp', version: '0.1.0' }, null, 2)}\n`)

  try {
    const result = readFileSync(packagePath, 'utf8')
    assert.equal(JSON.parse(result).name, 'temp')
    assert.equal(JSON.parse(result).version, '0.1.0')
  }
  finally {
    rmSync(temp, { recursive: true, force: true })
  }
}))

it.layer(NodeServices.layer)('publish temporary package version restores on failure', (it) => {
  it.effect('publish temporary package version restores on failure', () => Effect.gen(function* () {
    const temp = makeTempDir()
    const packagePath = join(temp, 'package.json')
    const original = `${JSON.stringify({ name: 'temp', version: '0.1.0' }, null, 2)}\n`
    writeFileSync(packagePath, original)

    try {
      const failure = yield* Effect.flip(withTemporaryPackageVersion(
        {
          packageJsonText: original,
          version: '0.2.0',
        },
        packagePath,
        Effect.fail(new HarnessError({ message: 'publish failed after version write' })),
      ))

      assert.match(failure.message, /publish failed/u)
      assert.equal(readFileSync(packagePath, 'utf8'), original)
    }
    finally {
      rmSync(temp, { recursive: true, force: true })
    }
  }))
})

it.effect('publish pack filename keeps absolute paths and resolves relative paths', () => Effect.sync(() => {
  assert.equal(
    resolvePackFilename('/tmp/effect-harness-pack', 'effect-harness-0.0.1.tgz'),
    '/tmp/effect-harness-pack/effect-harness-0.0.1.tgz',
  )
  assert.equal(
    resolvePackFilename('/tmp/effect-harness-pack', '/tmp/effect-harness-pack/effect-harness-0.0.1.tgz'),
    '/tmp/effect-harness-pack/effect-harness-0.0.1.tgz',
  )
}))

it.effect('publish pack output parser skips non-json prefixes', () => Effect.gen(function* () {
  const parsed = yield* parsePackOutput([
    'Scope: all 1 workspace project',
    '[{"filename":"/tmp/effect-harness-publish-check/effect-harness-0.0.1.tgz"}]',
    '',
  ].join('\n'))

  assert.deepStrictEqual(parsed, [{
    filename: '/tmp/effect-harness-publish-check/effect-harness-0.0.1.tgz',
  }])
}))
