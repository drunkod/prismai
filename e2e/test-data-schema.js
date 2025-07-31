// e2e/test-data-schema.js
import { co, z } from "jazz-tools";

// Simple message types (no nested lists in messages)
export const StorageSnapshotMessage = co.map({
  type: z.literal("storageSnapshot"),
  testTitle: z.string(),
  storageContent: z.string(),
  timestamp: z.string(),
});

export const TestResultMessage = co.map({
  type: z.literal("testResult"),
  testTitle: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  duration: z.number(),
  error: z.string().optional(),
  timestamp: z.string(),
});

export const TestRunSummaryMessage = co.map({
  type: z.literal("testRunSummary"),
  totalTests: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  duration: z.number(),
  timestamp: z.string(),
});

// Combined message type
export const TestReportMessage = co.discriminatedUnion("type", [
  StorageSnapshotMessage,
  TestResultMessage,
  TestRunSummaryMessage,
]);

// Response types (simple)
export const MessageResponse = co.map({
  messageType: z.string(),
  id: z.string(),
  savedAt: z.string(),
  message: z.string(),
});

// Storage structures (only used on server)
export const ChromeStorageData = co.map({
  testTitle: z.string(),
  retrievedAt: z.string(),
  storageContent: z.string(),
});

export const TestResult = co.map({
  testTitle: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  duration: z.number(),
  error: z.string().optional(),
  timestamp: z.string(),
});

export const TestRunSummary = co.map({
  totalTests: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  duration: z.number(),
  timestamp: z.string(),
  // We'll add results and snapshots manually on the server
});

// Account roots
export const ServerAccountRoot = co.map({
  testRuns: co.list(TestRunSummary),
  allSnapshots: co.list(ChromeStorageData),
  allResults: co.list(TestResult),
});

export const ClientAccountRoot = co.map({
  responseIds: co.list(z.string()),
  currentRunId: z.string().optional(),
});

// Account schemas WITHOUT migration
export const TestServerAccount = co.account({
  profile: co.profile({ 
    name: z.string(),
    type: z.literal("testServer"),
  }),
  root: ServerAccountRoot,
});

export const TestClientAccount = co.account({
  profile: co.profile({ 
    name: z.string(),
    type: z.literal("testClient"),
  }),
  root: ClientAccountRoot,
});