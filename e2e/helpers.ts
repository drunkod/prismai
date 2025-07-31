// /home/alex/Documents/projects/extentions/prismai/e2e/helpers.ts

import { Page } from "@playwright/test";

interface RequestLogEntry {
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  postData: string | undefined;
  resourceType: string;
}

export function setupRequestMonitoring(page: Page) {
  const requestLog: RequestLogEntry[] = [];
  
  page.on('request', (request) => {
    const entry: RequestLogEntry = {
      timestamp: Date.now(),
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      postData: request.postData() ?? undefined,
      resourceType: request.resourceType(),
    };
    requestLog.push(entry);
    console.log(`📤 ${entry.method} ${entry.url} [${entry.resourceType}]`);
  });
  
  page.on('response', (response) => {
    console.log(`📥 ${response.status()} ${response.url()}`);
  });
  
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    console.log(`❌ Failed: ${request.url()} - ${failure ? failure.errorText : "Unknown error"}`);
  });
  
  return requestLog;
}