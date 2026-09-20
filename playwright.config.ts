import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Point everything at the emulator suite before anything else reads env.
loadEnv({ path: ".env.test", override: true });

const PORT = 3000;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/support/**"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The suite mutates shared emulator state, so it must run serially.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    permissions: ["geolocation"],
    geolocation: { latitude: 32.0975, longitude: 34.7742 }, // Tel Aviv Port
    locale: "en-GB",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          NEXT_PUBLIC_USE_FIREBASE_EMULATOR: "true",
          FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
          FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
          FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
        },
      },
});
