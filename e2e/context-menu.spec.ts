import { test, expect } from "./fixtures";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("PrismAI Context Menu", () => {
  test("should copy selected text to clipboard", async ({
    page,
    context,
  }) => {
    // Grant permissions to read and write to the clipboard
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Navigate to our local test page
    const testPagePath = path.resolve(__dirname, "test-page.html");
    await page.goto(`file://${testPagePath}`);

    // Find and select the text in the paragraph
    const textToCopy =
      "This is a simple sentence to test the copy functionality.";

    // Instead of .selectText(), simulate a real user's mouse drag.
    const paragraph = page.locator("#test-paragraph");
    await paragraph.hover(); // Move mouse over the element
    await page.waitForTimeout(400);
    // Move the mouse to the end of the element to select the text
    const box = await paragraph.boundingBox();
    if (box) {
      // Start at the beginning of the text
      await page.mouse.move(box.x + 5, box.y + box.height / 2);
      await page.mouse.down();
      
      // Move to the end of the text
      await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
      await page.mouse.up();
    }

    await page.waitForTimeout(400);

    await page.pause();
    // Wait for the PrismAI container to appear (it's in a Shadow DOM)
    const prismaiContainer = page.locator(
      "prismai-ui >> .prismai-container"
    );
    await expect(prismaiContainer).toBeVisible({ timeout: 5000 });

    // Find the copy button and click it
    const copyButton = prismaiContainer.locator(".copy-button");
    await expect(copyButton).toContainText("Copy");
    await copyButton.click();

    // Check that the button text changes to "Copied!"
    await expect(copyButton).toContainText("Copied!");

    // Check that the button text reverts to "Copy" after a while
    await expect(copyButton).toContainText("Copy", { timeout: 2000 });
  });
});
