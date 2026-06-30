import type { PackageJson } from '../Model.ts'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { readJsonLike } from '../../platform/Json.ts'
import { decodeTsConfig } from '../Model.ts'
import { isRecord } from './JsonFields.ts'

export function assertScript(errors: Array<string>, packageJson: PackageJson, name: string): void {
  if (!packageJson.scripts?.[name]) {
    errors.push(`Missing package script: ${name}.`)
  }
}

export function assertTypecheckScript(errors: Array<string>, packageJson: PackageJson): void {
  const typecheck = packageJson.scripts?.typecheck
  if (!typecheck) {
    errors.push('Missing package script: typecheck.')
    return
  }

  if (!/\btsgo\s+--noEmit\b/u.test(typecheck)) {
    errors.push('typecheck must run the @effect/tsgo-patched tsgo --noEmit as the primary Effect diagnostic path.')
  }

  if (/\beffect-tsgo\s+--noEmit\b/u.test(typecheck)) {
    errors.push('effect-tsgo is the setup/patch manager; typecheck must use the patched tsgo --noEmit binary.')
  }
}

export function assertVerifyScript(errors: Array<string>, packageJson: PackageJson): void {
  const verify = packageJson.scripts?.verify
  if (!verify) {
    errors.push('Missing package script: verify.')
    return
  }

  if (!/\bpnpm\s+effect:verify\b/u.test(verify)) {
    errors.push('verify must run pnpm effect:verify.')
  }
}

function hasFloatingEffectError(plugin: Record<string, unknown>): boolean {
  const options = plugin.options
  if (!isRecord(options)) {
    return false
  }

  const diagnosticSeverity = options.diagnosticSeverity
  if (!isRecord(diagnosticSeverity)) {
    return false
  }

  return diagnosticSeverity.floatingEffect === 'error'
}

export const assertTsgoConfig = Effect.fnUntraced(function* (errors: Array<string>, root: string) {
  const fs = yield* FileSystem.FileSystem
  const tsconfigPath = `${root}/tsconfig.json`
  const exists = yield* fs.exists(tsconfigPath)
  if (!exists) {
    errors.push('Missing tsconfig.json.')
    return
  }

  const tsconfig = yield* readJsonLike(tsconfigPath, decodeTsConfig)
  const plugins = tsconfig.compilerOptions?.plugins ?? []
  const effectPlugin = plugins.find(plugin => plugin.name === '@effect/language-service')
  if (!effectPlugin) {
    errors.push('tsconfig.json must configure the @effect/language-service plugin for @effect/tsgo.')
    return
  }

  if (!hasFloatingEffectError(effectPlugin)) {
    errors.push('@effect/tsgo plugin config must treat floatingEffect as error for runtime source.')
  }
})
