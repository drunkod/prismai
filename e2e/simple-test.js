// e2e/simple-test.js

import { startWorker } from "jazz-tools/worker";
import { WebSocket } from "ws";
import { MyAppAccount, ChromeStorageData, StorageSnapshots, AccountRoot } from "./test-data-schema.js";

// This polyfill is required for Jazz to run in Node.js
global.WebSocket = WebSocket;

// --- Configuration ---
const SYNC_URL = "ws://127.0.0.1:4200";
const ACCOUNT_ID = process.env.JAZZ_ACCOUNT_ID;
const ACCOUNT_SECRET = process.env.JAZZ_ACCOUNT_SECRET;

async function main() {
  console.log("🚀 Starting simple client-server test...");

  if (!ACCOUNT_ID || !ACCOUNT_SECRET) {
    console.error("❌ ERROR: JAZZ_ACCOUNT_ID and JAZZ_ACCOUNT_SECRET environment variables must be set.");
    process.exit(1);
  }

  // --- STEP 1: WRITE DATA ---
  console.log("\n--- STEP 1: WRITING DATA ---");
  let writerWorker;
  try {
    const { worker } = await startWorker({
      syncServer: SYNC_URL,
      accountID: ACCOUNT_ID,
      accountSecret: ACCOUNT_SECRET,
      AccountSchema: MyAppAccount,
    });
    writerWorker = worker;
    console.log(`✅ Writer connected with Account ID: ${writerWorker.id}`);
  } catch (error) {
    console.error("❌ Failed to connect writer client:", error);
    process.exit(1);
  }

  // Load the account to get the snapshots list
  const me = await MyAppAccount.load(writerWorker.id, {
    resolve: { root: { snapshots: true } },
    loadAs: writerWorker
  });

  // Safety check: Ensure the snapshots list exists
  if (!me.root.snapshots) {
      console.log("⚠️ Snapshots list not found, creating it...");
      me.root.snapshots = StorageSnapshots.create([], { owner: me });
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait for creation to sync
  }

  const initialCount = me.root.snapshots.length;
  console.log(`  - Snapshot count before writing: ${initialCount}`);

  // Create a new snapshot with a unique title
  const testTitle = `Simple Test @ ${new Date().toISOString()}`;
  const newSnapshot = ChromeStorageData.create({
    testTitle: testTitle,
    retrievedAt: new Date().toISOString(),
    storageContent: '{"status": "ok"}',
  }, { owner: me });

  console.log(`  - Pushing new snapshot: "${testTitle}"`);
  me.root.snapshots.push(newSnapshot);

  console.log("  - Write complete. Waiting 3 seconds for data to sync...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // --- STEP 2: VERIFY DATA ---
  console.log("\n--- STEP 2: VERIFYING DATA ---");
  let verifierWorker;
  try {
     const { worker } = await startWorker({
      syncServer: SYNC_URL,
      accountID: ACCOUNT_ID,
      accountSecret: ACCOUNT_SECRET,
      AccountSchema: MyAppAccount,
    });
    verifierWorker = worker;
    console.log(`✅ Verifier connected with Account ID: ${verifierWorker.id}`);
  } catch (error)
  {
    console.error("❌ Failed to connect verifier client:", error);
    process.exit(1);
  }


  console.log("  - Reading account data from server...");
  const verifiedAccount = await MyAppAccount.load(verifierWorker.id, {
    resolve: { root: { snapshots: { $each: true } } }, // Deep load all snapshots
    loadAs: verifierWorker
  });

  const verifiedCount = verifiedAccount.root.snapshots.length;
  console.log(`  - Snapshot count after writing: ${verifiedCount}`);

  // --- STEP 3: CONCLUSION ---
  console.log("\n--- STEP 3: CONCLUSION ---");
  if (verifiedCount > initialCount) {
    const found = verifiedAccount.root.snapshots.some(s => s && s.testTitle === testTitle);
    if (found) {
        console.log("✅ SUCCESS: Data was written and verified successfully!");
    } else {
        console.log("❌ FAILURE: Snapshot count increased, but the specific test snapshot was not found.");
    }
  } else {
    console.log("❌ FAILURE: Data was not persisted on the server.");
  }
}

main().catch(console.error).finally(() => process.exit(0));