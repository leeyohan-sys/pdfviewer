import { cpSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function copyPdfjsAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'))
  const destRoot = resolve(process.cwd(), 'public', 'pdfjs')

  return {
    name: 'copy-pdfjs-assets',
    buildStart() {
      for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs'] as const) {
        cpSync(resolve(pdfjsRoot, dir), resolve(destRoot, dir), { recursive: true })
      }
    },
  }
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/pdfviewer/' : '/',
  plugins: [react(), copyPdfjsAssets()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
})
