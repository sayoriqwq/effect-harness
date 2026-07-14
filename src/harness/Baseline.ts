const versions = {
  effect: '4.0.0-beta.97',
  tsgo: '0.19.0',
  typescript: '6.0.2',
  nativeTypescript: '7.0.2',
} as const

const requiredRuntimeTarget = {
  presence: 'required',
  defaultSection: 'dependencies',
  peerFallbackSection: 'devDependencies',
} as const

const optionalPlatformTarget = {
  presence: 'declared-or-manifest-unavailable',
  defaultSection: 'dependencies',
  peerFallbackSection: 'devDependencies',
} as const

const requiredDevToolTarget = {
  presence: 'required',
  defaultSection: 'devDependencies',
  peerFallbackSection: 'devDependencies',
} as const

/**
 * The accepted, version-aligned Effect authoring baseline.
 *
 * This is domain data only. Consumers own observation and delivery mechanics;
 * checked-in manifests, catalogs, and managed guidance are verified
 * projections because those formats cannot import this TypeScript source.
 */
export const acceptedEffectBaseline = {
  versions,
  packages: {
    effect: {
      id: 'runtime',
      packageName: 'effect',
      range: versions.effect,
      installedIdentity: { name: 'effect', version: versions.effect },
      role: 'runtime',
      target: requiredRuntimeTarget,
      sourcePin: 'effect',
    },
    platformNode: {
      id: 'platform-node',
      packageName: '@effect/platform-node',
      range: versions.effect,
      installedIdentity: { name: '@effect/platform-node', version: versions.effect },
      role: 'optional-platform',
      target: optionalPlatformTarget,
      sourcePin: 'effect',
    },
    effectVitest: {
      id: 'vitest',
      packageName: '@effect/vitest',
      range: versions.effect,
      installedIdentity: { name: '@effect/vitest', version: versions.effect },
      role: 'effect-test-integration',
      target: requiredDevToolTarget,
      sourcePin: 'effect',
    },
    tsgo: {
      id: 'tsgo',
      packageName: '@effect/tsgo',
      range: versions.tsgo,
      installedIdentity: { name: '@effect/tsgo', version: versions.tsgo },
      role: 'effect-compiler-patch',
      target: requiredDevToolTarget,
      sourcePin: 'tsgo',
    },
    typescript: {
      id: 'typescript',
      packageName: 'typescript',
      range: `npm:@typescript/typescript6@${versions.typescript}`,
      installedIdentity: { name: '@typescript/typescript6', version: versions.typescript },
      role: 'typescript-api',
      target: requiredDevToolTarget,
      sourcePin: null,
    },
    nativeTypescript: {
      id: 'native-typescript',
      packageName: '@typescript/native',
      range: `npm:typescript@${versions.nativeTypescript}`,
      installedIdentity: { name: 'typescript', version: versions.nativeTypescript },
      role: 'native-compiler',
      target: requiredDevToolTarget,
      sourcePin: null,
    },
  },
  sourcePins: {
    effect: {
      publicationName: 'effect',
      outputId: 'effect.reference.effect',
      targetPath: 'repos/effect',
      sourceUrl: 'https://github.com/Effect-TS/effect-smol',
    },
    tsgo: {
      publicationName: 'tsgo',
      outputId: 'effect.reference.tsgo',
      targetPath: 'repos/tsgo',
      sourceUrl: 'https://github.com/Effect-TS/tsgo',
    },
  },
} as const

/** Checked-in package.json section projection for Effect Harness itself. */
export const effectHarnessBaselineSelfProjection = {
  dependencies: ['effect', 'typescript'],
  devDependencies: ['platformNode', 'effectVitest', 'tsgo', 'nativeTypescript'],
} as const satisfies Readonly<Record<'dependencies' | 'devDependencies', ReadonlyArray<keyof typeof acceptedEffectBaseline.packages>>>
