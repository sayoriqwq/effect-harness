export interface TargetVerifyOptions {
  readonly target: string
  readonly harness: string
  readonly providerRecord?: string | undefined
}

export interface PreludeManifest {
  readonly maintainProviders: ReadonlyArray<{
    readonly id: string
    readonly recordPath: string
  }>
}

export interface LifecycleSurfaceRecord {
  readonly id: string
  readonly owner: string
  readonly lifecycle: string
  readonly kind: 'ownedFile' | 'structuredPointer' | 'managedBlock'
  readonly path: string
  readonly pointer?: string | undefined
  readonly base?: string | undefined
  readonly snapshot?: string | undefined
}

export interface EffectProviderRecord {
  readonly schemaVersion: number
  readonly id: string
  readonly contractVersion: string
  readonly providerVersion: string
  readonly profile: string
  readonly artifact: {
    readonly id: string
    readonly version: string
    readonly sourceIdentity?: unknown
  }
  readonly projectedContext: Record<string, unknown>
  readonly options: Record<string, unknown>
  readonly runtime?: {
    readonly files?: ReadonlyArray<string> | undefined
  } | undefined
  readonly surfaces: ReadonlyArray<LifecycleSurfaceRecord>
  readonly verificationRecordId: string
}

export const providerId = 'effect-harness'
export const providerProfile = 'codex-effect-v4'
export const supportedProviderContractVersion = '1'
export const supportedProviderVersion = '0.1.0'

export const legacyAgentsStart = '<!-- effect-harness:start -->'
export const legacyAgentsEnd = '<!-- effect-harness:end -->'

export const legacyRuntimePaths = [
  '.effect-harness.json',
  '.codex/skills/effect-code',
  '.codex/skills/effect-feedback',
  '.codex/agents/effect-worker.md',
  '.codex/effect-feedback',
] as const
