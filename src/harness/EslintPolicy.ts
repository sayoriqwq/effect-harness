import type { ESLint, Rule } from 'eslint'

const noDisableValidationRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow disabling Effect Schema validation.',
    },
    messages: {
      noDisableValidation: 'Do not use { disableValidation: true }. Fix the data or schema instead of disabling validation.',
    },
    schema: [],
  },
  create(context) {
    return {
      Property(node) {
        if (
          (
            (node.key.type === 'Identifier' && node.key.name === 'disableValidation')
            || (node.key.type === 'Literal' && node.key.value === 'disableValidation')
          )
          && node.value.type === 'Literal'
          && node.value.value === true
        ) {
          context.report({
            node,
            messageId: 'noDisableValidation',
          })
        }
      },
    }
  },
}

export const effectHarnessEslintPlugin: ESLint.Plugin = {
  rules: {
    'no-disable-validation': noDisableValidationRule,
  },
}

export const sharedEffectEslintPolicy = {
  rules: {
    'effect-harness/no-disable-validation': 'error',
  },
  restrictedImports: {
    paths: [
      { name: 'node:test', message: 'Use @effect/vitest for Effect test entries.' },
      { name: '@effect/cli', message: 'Use effect/unstable/cli for Effect v4 beta.' },
    ],
    patterns: [
      { group: ['@effect/cli/*'], message: 'Use effect/unstable/cli for Effect v4 beta.' },
      { group: ['repos/effect/**', '**/repos/effect/**'], message: 'Import installed packages, never pinned source trees.' },
      { group: ['repos/tsgo/**', '**/repos/tsgo/**'], message: 'Use tsgo through its installed package.' },
    ],
  },
  restrictedSyntax: [
    { selector: 'MemberExpression[object.name="Context"][property.name="Tag"]', message: 'Use Context.Service for Effect v4 services.' },
    { selector: 'MemberExpression[object.name="Effect"][property.name=/^(catchAllCause|serviceOption)$/]', message: 'Use the Effect-native safer pattern.' },
  ],
} as const

export const effectTestEslintPolicy = {
  restrictedImportPaths: [
    { name: 'vitest', importNames: ['describe', 'it', 'test'], message: 'Use @effect/vitest Effect entries.' },
  ],
  restrictedSyntax: [
    { selector: 'CallExpression[callee.name="it"]', message: 'Use it.effect, it.live, or layer from @effect/vitest.' },
  ],
} as const
