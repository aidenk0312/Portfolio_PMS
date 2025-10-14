import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
    testDir: path.resolve(__dirname, 'tests/e2e'),
    testMatch: ['**/*.e2e-spec.ts'],
    timeout: 60_000,
    fullyParallel: false,
    workers: 1,
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        trace: 'retain-on-failure'
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],
    webServer: {
        command: 'pnpm dev',
        cwd: __dirname,
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI
    }
});
