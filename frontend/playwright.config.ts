import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  webServer: process.env.CI
    ? [
        {
          command: "npm run dev",
          url: "http://127.0.0.1:5173",
          timeout: 120000,
        },
        {
          command: "bash mvnw -B -ntp spring-boot:run",
          cwd: "../backend",
          url: "http://127.0.0.1:8080/actuator/health",
          timeout: 180000,
        },
      ]
    : undefined,
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "pt-BR",
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        isMobile: true,
      },
    },
  ],
});
