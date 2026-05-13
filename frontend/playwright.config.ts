import { defineConfig, devices } from '@playwright/test';

const apiUrl = 'http://localhost:5000';
const webUrl = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command:
        'cd ../backend && ASPNETCORE_ENVIRONMENT=Testing ASPNETCORE_URLS=http://localhost:5000 dotnet run --project LedgerOne.Api --no-launch-profile',
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --port 5173',
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
