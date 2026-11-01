const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.cjs',
  timeout: 30000,
  expect: { timeout: 12000 },
  retries: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:8765', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: !process.env.CI,
    timeout: 15000
  }
});
