// @ts-check

/**
 * @type {import('@playwright/test').PlaywrightTestConfig}
 */
const config = {
  testDir: './e2e',
  testMatch: /.*local-api\.spec\.js/,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'cd infra/aws-sam && PATH="../../node_modules/esbuild/bin:$PATH" CACHE_TABLE_NAME="" AWS_REGION="eu-central-1" /home/gerd/.local/bin/sam local start-api --host 127.0.0.1 --port 3000',
      url: 'http://127.0.0.1:3000/products/mortgages',
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        DEFAULT_HISTORY_MONTHS: '12',
        ONS_CPIH_VERSION: '66',
        CACHE_TABLE_NAME: '',
      },
    },
    {
      command: 'npm -w client run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};

module.exports = config;
