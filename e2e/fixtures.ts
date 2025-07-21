// /home/alex/Documents/projects/extentions/prismai/e2e/fixtures.ts

import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

const pathToExtension = path.resolve(".output/chrome-mv3");

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    // Check for our custom environment variable.
    if (!process.env.CHROMIUM_EXECUTABLE_PATH) {
      throw new Error("CHROMIUM_EXECUTABLE_PATH environment variable is not set.");
    }

    // Explicitly pass the executablePath to force Playwright to use our browser.
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
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