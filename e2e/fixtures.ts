// /home/alex/Documents/projects/extentions/prismai/e2e/fixtures.ts

import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

const pathToExtension = path.resolve(".output/chrome-mv3");

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    if (!process.env.CHROMIUM_EXECUTABLE_PATH) {
      throw new Error("CHROMIUM_EXECUTABLE_PATH environment variable is not set.");
    }

    const context = await chromium.launchPersistentContext("", {
      // Conditionally set headless mode based on our environment variable
      headless: process.env.BROWSER_HEADLESS === 'true',
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        // Add the --no-sandbox arg, which is often required in CI/container environments
        '--no-sandbox',
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    const extensionId = serviceWorker.url().split("/")[2];
    await use(extensionId);
  },
});

export const expect = test.expect;