/**
 * The complete Harness-owned ESLint policy.
 *
 * Effect and TypeScript semantics belong to tsgo. Targets own every other lint
 * choice and compose those rules around this minimal import boundary.
 */
export const sharedEffectEslintPolicy = {
  restrictedImports: {
    patterns: [
      { group: ['repos/effect/**', '**/repos/effect/**'], message: 'Import installed packages, never pinned Effect reference trees.' },
      { group: ['repos/tsgo/**', '**/repos/tsgo/**'], message: 'Use tsgo through its installed package, never its pinned reference tree.' },
    ],
  },
} as const
