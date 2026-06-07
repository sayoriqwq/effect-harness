import type { PublishEventConfig } from '../src/harness/Publish.ts'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { fileURLToPath } from 'node:url'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { assert, it } from '@effect/vitest'

import * as Effect from 'effect/Effect'
import {
  readWorkflowPublishConfig,
  resolvePublishConfig,
} from '../src/harness/Publish.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultHarnessRoot = repoRoot

function makeTempDir() {
  return mkdtempSync(join(dirname(repoRoot), 'effect-harness-publish-'))
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

it.layer(NodeServices.layer)('publish config uses release metadata when workflow event is a release', (it) => {
  it.effect('publish config uses release metadata when workflow event is a release', () => Effect.gen(function* () {
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
      const config = yield* resolvePublishConfig(
        {
          harness: defaultHarnessRoot,
        },
        {
          GITHUB_EVENT_NAME: 'release',
          GITHUB_EVENT_PATH: eventPath,
        },
        eventConfig,
      )

      assert.equal(config.version, '4.0.0-beta.5')
      assert.equal(config.npmTag, 'next')
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  }))
})

it.layer(NodeServices.layer)('release events ignore blank workflow env values', (it) => {
  it.effect('release event ignores blank workflow env inputs and uses workflow release metadata', () => Effect.gen(function* () {
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
      const config = yield* resolvePublishConfig(
        {
          harness: defaultHarnessRoot,
        },
        {
          PUBLISH_VERSION: '',
          NPM_TAG: '   ',
          DRY_RUN: '',
          NPM_PROVENANCE: '',
          GITHUB_EVENT_NAME: 'release',
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
