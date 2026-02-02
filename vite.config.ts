import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

const samplesDir = path.resolve(__dirname, 'public/samples')
const sampleFiles = fs.existsSync(samplesDir)
    ? fs.readdirSync(samplesDir)
        .filter((f: string) => f.endsWith('.xml'))
        .map((f: string) => {
            const filePath = `/samples/${f}`
            const content = fs.readFileSync(path.join(samplesDir, f), 'utf-8')
            const match = content.match(/mapName="([^"]+)"/)
            return { path: filePath, mapName: match ? match[1] : null }
        })
    : []

export default defineConfig({
    root: '.',
    base: process.env.BASE_URL ?? '/',
    define: {
        __SAMPLE_FILES__: JSON.stringify(sampleFiles),
    },
    build: {
        outDir: 'dist',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false,
            },
            mangle: {
                keep_classnames: true,
                keep_fnames: true,
            },
        },
        target: 'ES2025',
        sourcemap: 'hidden',
    },
    server: {
        port: 5173,
    },
})
