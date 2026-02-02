import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.ts', 'tests/**/*.test.js'],
        globals: true,
        reporters: ['verbose'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts', 'src/**/*.js'],
            exclude: ['src/**/*.test.ts', 'src/**/*.test.js'],
            reportsDirectory: 'coverage',
            reporter: ['text', 'lcov', 'html'],
        },
    },
}))
