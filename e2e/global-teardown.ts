// /home/alex/Documents/projects/extentions/prismai/e2e/global-teardown.ts

import fs from "fs";
import path from "path";

export default async function globalTeardown() {
  // Clean up extracted extension after tests
  const extractedPath = path.resolve(".test-extension");
  if (fs.existsSync(extractedPath)) {
    fs.rmSync(extractedPath, { recursive: true, force: true });
    console.log("Cleaned up extracted extension");
  }
}