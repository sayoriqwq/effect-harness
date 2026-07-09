import { Effect, FileSystem, Path } from 'effect'
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
  readonly content: string
  readonly targetUsage?: string
}

interface ManagedFilesContribution {
  readonly mode: string
  readonly targetBasePath: string
  readonly files: ReadonlyArray<ManagedFileDeclaration>
}

interface SemanticContributions {
  readonly packageJson: JsonRecord
  readonly tsconfig: JsonRecord
  readonly editorPolicy: JsonRecord
  readonly lintGuardrails: JsonRecord
  readonly testPolicy: JsonRecord
  readonly verificationPolicy: JsonRecord
}

interface ArtifactOnlyReferenceAuditEntry {
  readonly id: string
  readonly path: string
  readonly sourceEntry: string
  readonly targetDelivery: string
  readonly available: true
}

interface ArtifactOnlyReferenceAudit {
  readonly mode: 'artifact-only-reference-audit'
  readonly references: ReadonlyArray<ArtifactOnlyReferenceAuditEntry>
}

interface NpmInvocationFailureClassification {
  readonly classification: 'npm-invocation-failure'
  readonly code: 'npm-command-failed' | 'npm-same-name-cwd-short-circuit'
  readonly providerDiscoveryStarted: false
}

interface ProviderDiscoveryFailureClassification {
  readonly classification: 'provider-discovery-failure'
  readonly code: 'provider-discovery-error'
  readonly providerDiscoveryStarted: true
}

export interface ProviderDiscoveryFailureInput {
  readonly stderr: string
  readonly stdout?: string
  readonly cwdPackageName?: string
  readonly cwdPackageVersion?: string
  readonly requestedPackageName?: string
  readonly requestedPackageVersion?: string
}

export type ProviderDiscoveryFailure
  = | NpmInvocationFailureClassification
    | ProviderDiscoveryFailureClassification

export interface ProviderDiscovery {
  readonly schemaVersion: 1
  readonly artifactRoot: string
  readonly providerProfilePath: string
  readonly providerProfileRelativePath: 'provider/effect-harness.provider.json'
  readonly packageArtifactIdentity: {
    readonly packageName: string
    readonly packageVersion: string
    readonly packageManager: string
    readonly artifactRoot: string
    readonly packageJsonPath: string
    readonly providerProfilePath: string
    readonly npmSelector: string
    readonly neutralDiscoveryCommand: string
    readonly invocationFailureClassification: {
      readonly sameNameCwdShortCircuit: NpmInvocationFailureClassification
    }
  }
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
  readonly semanticContributions: SemanticContributions
  readonly targetManagedSurfaces: {
    readonly targetReceives: ReadonlyArray<string>
    readonly targetDoesNotReceive: ReadonlyArray<string>
    readonly documentationBundle: ManagedFilesContribution
    readonly snippets: ManagedFilesContribution
    readonly contributions: SemanticContributions
  }
  readonly artifactOnlyReferences: {
    readonly mode: string
    readonly targetDelivery: string
    readonly packageSurface: ReadonlyArray<string>
    readonly references: JsonRecord
  }
  readonly artifactOnlyReferenceAudit: ArtifactOnlyReferenceAudit
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

export function resolvePackageArtifactRoot(entrypoint: string): string {
  for (const marker of ['/dist/bin/', '/dist/src/', '/bin/', '/src/']) {
    const index = entrypoint.indexOf(marker)
    if (index >= 0) {
      return entrypoint.slice(0, index)
    }
  }
  return entrypoint
}

export function classifyProviderDiscoveryFailure(input: ProviderDiscoveryFailureInput): ProviderDiscoveryFailure {
  const sameRequestedPackage = input.cwdPackageName === input.requestedPackageName
    && input.cwdPackageVersion === input.requestedPackageVersion
  const commandNotFound = /(?:^|\n)(?:sh: )?effect-harness: command not found(?:\n|$)/u.test(input.stderr)

  if (sameRequestedPackage && commandNotFound) {
    return {
      classification: 'npm-invocation-failure',
      code: 'npm-same-name-cwd-short-circuit',
      providerDiscoveryStarted: false,
    }
  }

  if (commandNotFound || input.stderr.includes('Cannot find package') || input.stderr.includes('npm ERR!')) {
    return {
      classification: 'npm-invocation-failure',
      code: 'npm-command-failed',
      providerDiscoveryStarted: false,
    }
  }

  return {
    classification: 'provider-discovery-failure',
    code: 'provider-discovery-error',
    providerDiscoveryStarted: true,
  }
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

function optionalString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
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

const expectManagedFileDeclaration = Effect.fnUntraced(function* (value: unknown, source: string, artifactRoot: string) {
  const file = yield* expectRecord(value, source)
  const path = yield* Path.Path
  const fs = yield* FileSystem.FileSystem
  const sourcePath = yield* expectString(file.sourcePath, `${source}.sourcePath`)
  const targetUsage = file.targetUsage === undefined
    ? undefined
    : yield* expectString(file.targetUsage, `${source}.targetUsage`)

  return {
    id: yield* expectString(file.id, `${source}.id`),
    sourcePath,
    targetPath: yield* expectString(file.targetPath, `${source}.targetPath`),
    contentType: yield* expectString(file.contentType, `${source}.contentType`),
    managed: yield* expectBoolean(file.managed, `${source}.managed`),
    content: yield* fs.readFileString(path.join(artifactRoot, sourcePath)),
    ...(targetUsage === undefined ? {} : { targetUsage }),
  } satisfies ManagedFileDeclaration
})

const expectManagedFilesContribution = Effect.fnUntraced(function* (value: unknown, source: string, artifactRoot: string) {
  const contribution = yield* expectRecord(value, source)
  const files = yield* expectArray(contribution.files, `${source}.files`)
  return {
    mode: yield* expectString(contribution.mode, `${source}.mode`),
    targetBasePath: yield* expectString(contribution.targetBasePath, `${source}.targetBasePath`),
    files: yield* Effect.forEach(files, (file, index) => expectManagedFileDeclaration(file, `${source}.files[${index}]`, artifactRoot)),
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

const expectArtifactOnlyReferenceAudit = Effect.fnUntraced(function* (references: JsonRecord, artifactRoot: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const entries = yield* Effect.forEach(Object.entries(references), ([id, value]) => Effect.gen(function* () {
    const reference = yield* expectRecord(value, `provider profile.artifactReferences.references.${id}`)
    const referencePath = yield* expectString(reference.path, `provider profile.artifactReferences.references.${id}.path`)
    const absolutePath = path.join(artifactRoot, referencePath)
    const available = yield* fs.exists(absolutePath)
    if (!available) {
      return yield* new HarnessError({ message: `artifact-only reference ${id} is missing from package artifact at ${referencePath}` })
    }
    return {
      available: true,
      id,
      path: referencePath,
      sourceEntry: yield* expectString(reference.sourceEntry, `provider profile.artifactReferences.references.${id}.sourceEntry`),
      targetDelivery: yield* expectString(reference.targetDelivery, `provider profile.artifactReferences.references.${id}.targetDelivery`),
    } satisfies ArtifactOnlyReferenceAuditEntry
  }))

  return {
    mode: 'artifact-only-reference-audit',
    references: entries,
  } satisfies ArtifactOnlyReferenceAudit
})

export const discoverProvider = Effect.fnUntraced(function* (harness: string) {
  const path = yield* Path.Path
  const artifactRoot = path.resolve(harness)
  const providerProfileRelativePath = 'provider/effect-harness.provider.json'
  const providerProfilePath = path.join(artifactRoot, providerProfileRelativePath)
  const packageJsonPath = path.join(artifactRoot, 'package.json')

  const providerProfile = yield* readJson(providerProfilePath, decodeJsonRecord)
  const packageManifest = yield* readJson(packageJsonPath, decodeJsonRecord)
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
  const packageName = yield* expectString(packageManifest.name, 'package.json.name')
  const packageVersion = yield* expectString(packageManifest.version, 'package.json.version')
  const packageManager = optionalString(packageManifest.packageManager, 'unknown')
  const npmSelector = `${packageName}@${packageVersion}`
  const semanticContributions = {
    packageJson: yield* expectNamedRecord(contributions, 'packageJson', `provider profile.profiles.${defaultProfile}.contributions`),
    tsconfig: yield* expectNamedRecord(contributions, 'tsconfig', `provider profile.profiles.${defaultProfile}.contributions`),
    editorPolicy: yield* expectNamedRecord(contributions, 'editorPolicy', `provider profile.profiles.${defaultProfile}.contributions`),
    lintGuardrails: yield* expectNamedRecord(contributions, 'lintGuardrails', `provider profile.profiles.${defaultProfile}.contributions`),
    testPolicy: yield* expectNamedRecord(contributions, 'testPolicy', `provider profile.profiles.${defaultProfile}.contributions`),
    verificationPolicy: yield* expectNamedRecord(contributions, 'verificationPolicy', `provider profile.profiles.${defaultProfile}.contributions`),
  } satisfies SemanticContributions

  return {
    schemaVersion: 1,
    artifactRoot,
    providerProfilePath,
    providerProfileRelativePath,
    packageArtifactIdentity: {
      packageName,
      packageVersion,
      packageManager,
      artifactRoot,
      packageJsonPath,
      providerProfilePath,
      npmSelector,
      neutralDiscoveryCommand: `npx --yes --package ${npmSelector} effect-harness provider-discover`,
      invocationFailureClassification: {
        sameNameCwdShortCircuit: {
          classification: 'npm-invocation-failure',
          code: 'npm-same-name-cwd-short-circuit',
          providerDiscoveryStarted: false,
        },
      },
    },
    packageLocator: {
      packageName,
      packageVersion,
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
    semanticContributions,
    targetManagedSurfaces: {
      targetReceives: yield* expectStringArray(managedSurfaces.targetReceives, `provider profile.profiles.${defaultProfile}.managedSurfaces.targetReceives`),
      targetDoesNotReceive: yield* expectStringArray(managedSurfaces.targetDoesNotReceive, `provider profile.profiles.${defaultProfile}.managedSurfaces.targetDoesNotReceive`),
      documentationBundle: yield* expectManagedFilesContribution(contributions.documentationBundle, `provider profile.profiles.${defaultProfile}.contributions.documentationBundle`, artifactRoot),
      snippets: yield* expectManagedFilesContribution(contributions.snippets, `provider profile.profiles.${defaultProfile}.contributions.snippets`, artifactRoot),
      contributions: semanticContributions,
    },
    artifactOnlyReferences,
    artifactOnlyReferenceAudit: yield* expectArtifactOnlyReferenceAudit(artifactOnlyReferences.references, artifactRoot),
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
