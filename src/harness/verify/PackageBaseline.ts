import type { PackageJson } from '../Model.ts'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { packageTargets } from '../Model.ts'
import { catalogVersion } from '../PnpmWorkspace.ts'

export function dependencyVersion(packageJson: PackageJson, name: string): string | undefined {
  return packageJson.dependencies?.[name]
    ?? packageJson.devDependencies?.[name]
    ?? packageJson.peerDependencies?.[name]
    ?? packageJson.optionalDependencies?.[name]
}

export function assertDependency(errors: Array<string>, packageJson: PackageJson, name: string, expected: string | undefined): void {
  if (!expected) {
    errors.push(`Missing package baseline for ${name} in repos/effect.subtree.json.`)
    return
  }

  const version = dependencyVersion(packageJson, name)
  if (!version) {
    errors.push(`Missing dependency ${name}.`)
    return
  }

  if (version !== expected && version !== 'catalog:') {
    errors.push(`${name} is ${version}; expected ${expected} or catalog:.`)
  }
}

function catalogDependencyNames(packageJson: PackageJson): ReadonlyArray<string> {
  return packageTargets
    .map(packageTarget => packageTarget.name)
    .filter(name => dependencyVersion(packageJson, name) === 'catalog:')
}

export const assertPnpmCatalog = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  packageJson: PackageJson,
  baseline: Readonly<Record<string, string>>,
) {
  const names = catalogDependencyNames(packageJson)
  if (names.length === 0) {
    return
  }

  const fs = yield* FileSystem.FileSystem
  const workspacePath = `${root}/pnpm-workspace.yaml`
  if (!(yield* fs.exists(workspacePath))) {
    errors.push('package.json uses catalog: for Effect baseline packages, but pnpm-workspace.yaml is missing.')
    return
  }

  const text = yield* fs.readFileString(workspacePath)
  for (const name of names) {
    const expected = baseline[name]
    const actual = catalogVersion(text, name)
    if (actual === undefined) {
      errors.push(`pnpm-workspace.yaml catalog is missing ${name}; package.json uses catalog:.`)
    }
    else if (actual !== expected) {
      errors.push(`pnpm-workspace.yaml catalog ${name} is ${actual}; expected ${expected}.`)
    }
  }
})

export function packagePointerName(pointer: string): string | undefined {
  const match = pointer.match(/^\/(?:dependencies|devDependencies|peerDependencies|optionalDependencies)\/(.+)$/u)
  return match?.[1]?.replace(/~1/gu, '/').replace(/~0/gu, '~')
}
