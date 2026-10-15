import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
mkdirSync('node_modules/.tmp', { recursive: true })
await build({
  entryPoints: ['tests/shipping-bill-test.ts'],
  outfile: 'node_modules/.tmp/shipping-bill.test.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm'
})
const result = spawnSync(process.execPath, ['node_modules/.tmp/shipping-bill.test.mjs'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
