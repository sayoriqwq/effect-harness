import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/prelude.ts', 'src/eslint.ts'],
  outDir: 'dist',
  format: 'esm',
  fixedExtension: false,
  dts: true,
  deps: {
    neverBundle: ['@sayoriqwq/prelude-contract', 'effect', 'typescript'],
  },
  tsconfig: 'tsconfig.build.json',
})
