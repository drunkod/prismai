// /home/alex/Documents/projects/extentions/prismai/e2e/fixtures.ts

import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// Path to your extension ZIP file
const extensionZip = path.resolve("hide-me-Chrome-Chrome.zip");
// const extensionZip = path.resolve("Planet-VPN-Chrome.zip");
const extractedPath = path.resolve(".test-extension");

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    if (!process.env.CHROMIUM_EXECUTABLE_PATH) {
      throw new Error("CHROMIUM_EXECUTABLE_PATH environment variable is not set.");
    }

    // Extract the extension if not already done
    if (!fs.existsSync(extractedPath)) {
      fs.mkdirSync(extractedPath, { recursive: true });
      execSync(`unzip -o "${extensionZip}" -d "${extractedPath}"`);
      console.log(`Extracted extension to: ${extractedPath}`);
    }

    const context = await chromium.launchPersistentContext("", {
      headless: process.env.BROWSER_HEADLESS === 'true',
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: [
        `--disable-extensions-except=${extractedPath}`,
        `--load-extension=${extractedPath}`,
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