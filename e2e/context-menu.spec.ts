import { test, expect } from "./fixtures";
import path from "path";

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
    await page.addScriptTag({ path: 'entrypoints/content/index.ts' });

    // Find and select the text in the paragraph
    const textToCopy =
      "This is a simple sentence to test the copy functionality.";
    await page.locator("#test-paragraph").selectText();

    // Wait for the PrismAI container to appear (it's in a Shadow DOM)
    const prismaiContainer = page.locator(
      "prismai-ui >> .prismai-container"
    );
    await expect(prismaiContainer).toBeVisible({ timeout: 2000 });

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
