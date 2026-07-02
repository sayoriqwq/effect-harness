import { Effect, Path } from 'effect'
import { readJson } from '../platform/Json.ts'
import { HarnessError } from './Errors.ts'
import { isRecord } from './verify/JsonFields.ts'

type JsonRecord = Record<string, unknown>

interface ManagedFileDeclaration {
  readonly id: string
  readonly sourcePath: string
  readonly targetPath: string
  readonly contentType: string
  readonly managed: boolean
  readonly targetUsage?: string
}

interface ManagedFilesContribution {
  readonly mode: string
  readonly targetBasePath: string
  readonly files: ReadonlyArray<ManagedFileDeclaration>
}

export interface ProviderDiscovery {
  readonly schemaVersion: 1
  readonly artifactRoot: string
  readonly providerProfilePath: string
  readonly providerProfileRelativePath: 'provider/effect-harness.provider.json'
  readonly packageLocator: {
    readonly packageName: string
    readonly packageVersion: string
    readonly binName: 'effect-harness'
    readonly binPath: string
    readonly discoveryCommand: string
    readonly packageFiles: ReadonlyArray<string>
  }
  readonly provider: {
    readonly id: string
    readonly contractVersion: string
    readonly providerVersion: string
    readonly defaultProfile: string
  }
  readonly selectedProfile: string
  readonly discovery: {
    readonly mode: 'provider-discovery'
    readonly consumer: 'prelude'
    readonly profileSource: 'provider/effect-harness.provider.json'
    readonly targetLifecycleOwner: string
  }
  readonly deliveryModes: {
    readonly internalHarness: JsonRecord
    readonly providerArtifactReference: JsonRecord
    readonly exportedHarness: JsonRecord
  }
  readonly targetManagedSurfaces: {
    readonly targetReceives: ReadonlyArray<string>
    readonly targetDoesNotReceive: ReadonlyArray<string>
    readonly documentationBundle: ManagedFilesContribution
    readonly snippets: ManagedFilesContribution
    readonly contributions: {
      readonly packageJson: JsonRecord
      readonly tsconfig: JsonRecord
      readonly editorPolicy: JsonRecord
      readonly lintGuardrails: JsonRecord
      readonly testPolicy: JsonRecord
      readonly verificationPolicy: JsonRecord
    }
  }
  readonly artifactOnlyReferences: {
    readonly mode: string
    readonly targetDelivery: string
    readonly packageSurface: ReadonlyArray<string>
    readonly references: JsonRecord
  }
  readonly sourceIdentities: {
    readonly defaultSourceEntry: string
    readonly sourceEntries: ReadonlyArray<string>
    readonly sourceBoundary: {
      readonly providerRepoInternal: boolean
      readonly targetDelivery: string
      readonly targetMustNotReceive: ReadonlyArray<string>
      readonly allowedTargetSourceIdentity: ReadonlyArray<string>
    }
    readonly providerSourceEntries: JsonRecord
    readonly artifactReferences: JsonRecord
  }
  readonly internalHarnessSurfaces: JsonRecord
}

function decodeJsonRecord(value: unknown, source: string): Effect.Effect<JsonRecord, HarnessError> {
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must be a JSON object` }))
}

function expectRecord(value: unknown, source: string): Effect.Effect<JsonRecord, HarnessError> {
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must be a JSON object` }))
}

function expectString(value: unknown, source: string): Effect.Effect<string, HarnessError> {
  return typeof value === 'string'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must be a string` }))
}

function expectBoolean(value: unknown, source: string): Effect.Effect<boolean, HarnessError> {
  return typeof value === 'boolean'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must be a boolean` }))
}

function expectArray(value: unknown, source: string): Effect.Effect<ReadonlyArray<unknown>, HarnessError> {
  return Array.isArray(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must be an array` }))
}

const expectStringArray = Effect.fnUntraced(function* (value: unknown, source: string) {
  const array = yield* expectArray(value, source)
  return yield* Effect.forEach(array, (entry, index) => expectString(entry, `${source}[${index}]`))
})

const expectManagedFileDeclaration = Effect.fnUntraced(function* (value: unknown, source: string) {
  const file = yield* expectRecord(value, source)
  const targetUsage = file.targetUsage === undefined
    ? undefined
    : yield* expectString(file.targetUsage, `${source}.targetUsage`)

  return {
    id: yield* expectString(file.id, `${source}.id`),
    sourcePath: yield* expectString(file.sourcePath, `${source}.sourcePath`),
    targetPath: yield* expectString(file.targetPath, `${source}.targetPath`),
    contentType: yield* expectString(file.contentType, `${source}.contentType`),
    managed: yield* expectBoolean(file.managed, `${source}.managed`),
    ...(targetUsage === undefined ? {} : { targetUsage }),
  } satisfies ManagedFileDeclaration
})

const expectManagedFilesContribution = Effect.fnUntraced(function* (value: unknown, source: string) {
  const contribution = yield* expectRecord(value, source)
  const files = yield* expectArray(contribution.files, `${source}.files`)
  return {
    mode: yield* expectString(contribution.mode, `${source}.mode`),
    targetBasePath: yield* expectString(contribution.targetBasePath, `${source}.targetBasePath`),
    files: yield* Effect.forEach(files, (file, index) => expectManagedFileDeclaration(file, `${source}.files[${index}]`)),
  } satisfies ManagedFilesContribution
})

function expectNamedRecord(record: JsonRecord, field: string, source: string): Effect.Effect<JsonRecord, HarnessError> {
  return expectRecord(record[field], `${source}.${field}`)
}

const expectDeliveryModes = Effect.fnUntraced(function* (providerProfile: JsonRecord) {
  const deliveryModes = yield* expectNamedRecord(providerProfile, 'deliveryModes', 'provider profile')
  return {
    internalHarness: yield* expectNamedRecord(deliveryModes, 'internalHarness', 'provider profile.deliveryModes'),
    providerArtifactReference: yield* expectNamedRecord(deliveryModes, 'providerArtifactReference', 'provider profile.deliveryModes'),
    exportedHarness: yield* expectNamedRecord(deliveryModes, 'exportedHarness', 'provider profile.deliveryModes'),
  }
})

const expectArtifactReferences = Effect.fnUntraced(function* (providerProfile: JsonRecord) {
  const artifactReferences = yield* expectNamedRecord(providerProfile, 'artifactReferences', 'provider profile')
  const references = yield* expectNamedRecord(artifactReferences, 'references', 'provider profile.artifactReferences')
  return {
    mode: yield* expectString(artifactReferences.mode, 'provider profile.artifactReferences.mode'),
    targetDelivery: yield* expectString(artifactReferences.targetDelivery, 'provider profile.artifactReferences.targetDelivery'),
    packageSurface: yield* expectStringArray(artifactReferences.packageSurface, 'provider profile.artifactReferences.packageSurface'),
    references,
  }
})

export const discoverProvider = Effect.fnUntraced(function* (harness: string) {
  const path = yield* Path.Path
  const artifactRoot = path.resolve(harness)
  const providerProfileRelativePath = 'provider/effect-harness.provider.json'
  const providerProfilePath = path.join(artifactRoot, providerProfileRelativePath)

  const providerProfile = yield* readJson(providerProfilePath, decodeJsonRecord)
  const packageManifest = yield* readJson(path.join(artifactRoot, 'package.json'), decodeJsonRecord)
  const provider = yield* expectNamedRecord(providerProfile, 'provider', 'provider profile')
  const profiles = yield* expectNamedRecord(providerProfile, 'profiles', 'provider profile')
  const defaultProfile = yield* expectString(provider.defaultProfile, 'provider profile.provider.defaultProfile')
  const selectedProfile = yield* expectNamedRecord(profiles, defaultProfile, `provider profile.profiles.${defaultProfile}`)
  const contributions = yield* expectNamedRecord(selectedProfile, 'contributions', `provider profile.profiles.${defaultProfile}`)
  const managedSurfaces = yield* expectNamedRecord(selectedProfile, 'managedSurfaces', `provider profile.profiles.${defaultProfile}`)
  const sourceBoundary = yield* expectNamedRecord(selectedProfile, 'sourceBoundary', `provider profile.profiles.${defaultProfile}`)
  const selfConformance = yield* expectNamedRecord(providerProfile, 'selfConformance', 'provider profile')
  const packageBin = yield* expectNamedRecord(packageManifest, 'bin', 'package.json')
  const artifactOnlyReferences = yield* expectArtifactReferences(providerProfile)
  const deliveryModes = yield* expectDeliveryModes(providerProfile)

  return {
    schemaVersion: 1,
    artifactRoot,
    providerProfilePath,
    providerProfileRelativePath,
    packageLocator: {
      packageName: yield* expectString(packageManifest.name, 'package.json.name'),
      packageVersion: yield* expectString(packageManifest.version, 'package.json.version'),
      binName: 'effect-harness',
      binPath: yield* expectString(packageBin['effect-harness'], 'package.json.bin.effect-harness'),
      discoveryCommand: 'npx --yes @sayoriqwq/effect-harness provider-discover',
      packageFiles: yield* expectStringArray(packageManifest.files, 'package.json.files'),
    },
    provider: {
      id: yield* expectString(provider.id, 'provider profile.provider.id'),
      contractVersion: yield* expectString(provider.contractVersion, 'provider profile.provider.contractVersion'),
      providerVersion: yield* expectString(provider.providerVersion, 'provider profile.provider.providerVersion'),
      defaultProfile,
    },
    selectedProfile: defaultProfile,
    discovery: {
      mode: 'provider-discovery',
      consumer: 'prelude',
      profileSource: providerProfileRelativePath,
      targetLifecycleOwner: yield* expectString(selfConformance.lifecycleOwner, 'provider profile.selfConformance.lifecycleOwner'),
    },
    deliveryModes,
    targetManagedSurfaces: {
      targetReceives: yield* expectStringArray(managedSurfaces.targetReceives, `provider profile.profiles.${defaultProfile}.managedSurfaces.targetReceives`),
      targetDoesNotReceive: yield* expectStringArray(managedSurfaces.targetDoesNotReceive, `provider profile.profiles.${defaultProfile}.managedSurfaces.targetDoesNotReceive`),
      documentationBundle: yield* expectManagedFilesContribution(contributions.documentationBundle, `provider profile.profiles.${defaultProfile}.contributions.documentationBundle`),
      snippets: yield* expectManagedFilesContribution(contributions.snippets, `provider profile.profiles.${defaultProfile}.contributions.snippets`),
      contributions: {
        packageJson: yield* expectNamedRecord(contributions, 'packageJson', `provider profile.profiles.${defaultProfile}.contributions`),
        tsconfig: yield* expectNamedRecord(contributions, 'tsconfig', `provider profile.profiles.${defaultProfile}.contributions`),
        editorPolicy: yield* expectNamedRecord(contributions, 'editorPolicy', `provider profile.profiles.${defaultProfile}.contributions`),
        lintGuardrails: yield* expectNamedRecord(contributions, 'lintGuardrails', `provider profile.profiles.${defaultProfile}.contributions`),
        testPolicy: yield* expectNamedRecord(contributions, 'testPolicy', `provider profile.profiles.${defaultProfile}.contributions`),
        verificationPolicy: yield* expectNamedRecord(contributions, 'verificationPolicy', `provider profile.profiles.${defaultProfile}.contributions`),
      },
    },
    artifactOnlyReferences,
    sourceIdentities: {
      defaultSourceEntry: yield* expectString(selectedProfile.sourceEntry, `provider profile.profiles.${defaultProfile}.sourceEntry`),
      sourceEntries: yield* expectStringArray(selectedProfile.sourceEntries, `provider profile.profiles.${defaultProfile}.sourceEntries`),
      sourceBoundary: {
        providerRepoInternal: yield* expectBoolean(sourceBoundary.providerRepoInternal, `provider profile.profiles.${defaultProfile}.sourceBoundary.providerRepoInternal`),
        targetDelivery: yield* expectString(sourceBoundary.targetDelivery, `provider profile.profiles.${defaultProfile}.sourceBoundary.targetDelivery`),
        targetMustNotReceive: yield* expectStringArray(sourceBoundary.targetMustNotReceive, `provider profile.profiles.${defaultProfile}.sourceBoundary.targetMustNotReceive`),
        allowedTargetSourceIdentity: yield* expectStringArray(sourceBoundary.allowedTargetSourceIdentity, `provider profile.profiles.${defaultProfile}.sourceBoundary.allowedTargetSourceIdentity`),
      },
      providerSourceEntries: yield* expectNamedRecord(providerProfile, 'sourceEntries', 'provider profile'),
      artifactReferences: artifactOnlyReferences.references,
    },
    internalHarnessSurfaces: deliveryModes.internalHarness,
  } satisfies ProviderDiscovery
})
