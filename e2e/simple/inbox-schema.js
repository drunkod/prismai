// inbox-schema.js (ENHANCED)
import { co, z } from "jazz-tools";

// Different message types
export const ProcessTextMessage = co.map({
  type: co.literal("processText"),
  text: z.string(),
});

export const AnalyzeDataMessage = co.map({
  type: co.literal("analyzeData"),
  data: z.array(z.number()),
  operation: z.enum(["sum", "average", "max", "min"]),
});

export const FetchDataMessage = co.map({
  type: co.literal("fetchData"),
  url: z.string(),
  headers: z.record(z.string()).optional(),
});

// Combined message type using discriminated union
export const InboxMessage = co.discriminatedUnion("type", [
  ProcessTextMessage,
  AnalyzeDataMessage,
  FetchDataMessage,
]);

// Response types
export const TextResponse = co.map({
  type: co.literal("text"),
  responseText: z.string(),
  processedAt: z.string(),
});

export const DataResponse = co.map({
  type: co.literal("data"),
  result: z.number(),
  operation: z.string(),
  processedAt: z.string(),
});

export const FetchResponse = co.map({
  type: co.literal("fetch"),
  data: z.any(),
  status: z.number(),
  processedAt: z.string(),
});

// Account schemas 


// 1. Define the schema for the account's root object separately.
export const AccountRoot = co.map({
  responseIds: co.list(z.string())
});

// 2. Use this schema in the main Account definition.
export const MyAccount = co.account({
  profile: co.profile({ name: z.string() }),
  root: AccountRoot, // Use the schema definition here
}).withMigration((account) => {
  // 3. In the migration, create INSTANCES of the CoValues.
  if (!account.root) {
    // First, create an instance of the list for the initial value.
    const initialResponseList = co.list(z.string()).create([]);

    // Then, create an instance of the root, passing the list instance as the value.
    account.root = AccountRoot.create({
      responseIds: initialResponseList
    });
  }
});