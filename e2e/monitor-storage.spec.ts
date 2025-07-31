import { test, expect } from "./fixtures";
import type { TestInfo } from "@playwright/test"; // It's good practice to import the type

// The fix is in the function signature below.
// Instead of `{ ..., testInfo }`, it's now `({ ... }), testInfo`.
test("monitor chrome.storage.sync", async ({ page, context, extensionId }, testInfo: TestInfo) => { 
  console.log('🔍 Monitoring chrome.storage.sync...\n');
  await page.waitForTimeout(5000);
  // Navigate to extension page
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  
  // Method 1: Read current storage values
  const storageData = await page.evaluate(async () => {
    // Get all data from storage.sync
    const allData = await chrome.storage.sync.get();
    return allData;
  });
  
//   console.log('📦 Current storage.sync data:');
//   console.log(JSON.stringify(storageData, null, 2));
  
  // Check if _servers_list exists
  if (storageData._servers_list) {
    console.log('\n✅ Found _servers_list:');
    console.log(JSON.stringify(storageData._servers_list, null, 2));
  }
  
  // This code is now correct and will work.
  console.log('📎 Attaching storage data to test results for the reporter...');
  await testInfo.attach('jazz-storage-data', {
    body: JSON.stringify(storageData),
    contentType: 'application/json',
  });

  // Method 2: Monitor storage changes (pauses are for demonstration)
  await page.pause();
  await page.evaluate(() => {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      console.log(`Storage ${areaName} changed:`, changes);
    });
  });
  await page.pause();
  await page.waitForTimeout(5000);
});