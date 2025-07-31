// /home/alex/Documents/projects/extentions/prismai/e2e/diagnostic-test.js

import { startWorker } from "jazz-tools/worker";
import { co } from "jazz-tools";
import { MyAppAccount, ChromeStorageData } from "./test-data-schema.js";
import { WebSocket } from "ws";

global.WebSocket = WebSocket;

async function runDiagnostic() {
  console.log("🚀 Starting Jazz Server Diagnostic Test...");

  const syncUrl = "ws://node205197-env-9764176354321.mircloud.host:11129";
  const accountId = process.env.JAZZ_ACCOUNT_ID;
  const accountSecret = process.env.JAZZ_ACCOUNT_SECRET;

  if (!accountId || !accountSecret) {
    console.error("❌ Error: JAZZ_ACCOUNT_ID and JAZZ_ACCOUNT_SECRET must be set.");
    process.exit(1);
  }

  let worker;
  try {
    // --- STEP 1: Connect and Write Data ---
    console.log("\n--- STEP 1: Connecting and Writing ---");
    console.log(`📡 Connecting to Jazz server at ${syncUrl}...`);
    const { worker: initialWorker } = await startWorker({
      syncServer: syncUrl,
      accountID: accountId,
      accountSecret: accountSecret,
      AccountSchema: MyAppAccount,
    });
    worker = initialWorker;
    console.log(`✅ Connected with worker ID: ${worker.id}`);

    // Load the account fully to ensure we have the snapshots list
    let me = await MyAppAccount.load(worker.id, {
        resolve: { root: { snapshots: true } },
        loadAs: worker
    });

    if (!me?.root?.snapshots) {
      console.error("❌ Account structure is invalid. `root` or `snapshots` is missing.");
      if (me?.root && !me.root.snapshots) {
        console.log("Fixing: creating snapshots list...");
        me.root.snapshots = co.list(ChromeStorageData).create([], {owner: me});
      } else {
         process.exit(1);
      }
    }

    const initialCount = me.root.snapshots.length;
    console.log(`  - Initial snapshot count: ${initialCount}`);

    const diagnosticSnapshot = ChromeStorageData.create({
      testTitle: `Diagnostic Test @ ${new Date().toISOString()}`,
      retrievedAt: new Date().toISOString(),
      storageContent: '{"status": "testing persistence"}',
    }, { owner: me });

    console.log(`  - Pushing new snapshot (ID: ${diagnosticSnapshot.id})...`);
    me.root.snapshots.push(diagnosticSnapshot);
    console.log(`  - Local snapshot count is now: ${me.root.snapshots.length}`);
    console.log("  - Write operation complete. Waiting 3 seconds for sync...");
    await new Promise(resolve => setTimeout(resolve, 3000));


    // --- STEP 2: Verify Persistence with a Fresh Load ---
    console.log("\n--- STEP 2: Verifying Persistence ---");
    console.log("  - Performing a fresh load of the account from the server...");
    const verificationAccount = await MyAppAccount.load(worker.id, {
      resolve: { root: { snapshots: { $each: true } } },
      loadAs: worker
    });

    const verificationCount = verificationAccount?.root?.snapshots?.length || 0;
    console.log(`  - Server reports snapshot count: ${verificationCount}`);

    // --- STEP 3: Conclusion ---
    console.log("\n--- STEP 3: Conclusion ---");
    if (verificationCount > initialCount) {
      console.log("✅ SUCCESS: The data was successfully written and persisted on the server.");
      const newSnapshot = verificationAccount.root.snapshots.find(s => s.id === diagnosticSnapshot.id);
      console.log(`  - Verified new snapshot: ${newSnapshot.testTitle}`);
    } else {
      console.log("❌ FAILURE: The data was NOT persisted by the server.");
      console.log("  - The local push succeeded, but a fresh load did not retrieve the new data.");
      console.log("  - This strongly indicates a problem with the self-hosted server's storage configuration.");
      console.log("\n  - TROUBLESHOOTING: ");
      console.log("    1. Check how you run your sync server. Are you using the `--in-memory` flag? If so, remove it.");
      console.log("    2. If not using `--in-memory`, check the `--db` path (`sync-db/storage.db` by default).");
      console.log("    3. Ensure the process has write permissions to the database file and its directory.");
      console.log("    4. Check the server logs for any SQLite or file system errors.");
    }

  } catch (error) {
    console.error("\n❌ An unexpected error occurred during the diagnostic test:", error);
    process.exit(1);
  }
}

runDiagnostic().then(() => {
  console.log("\n🏁 Diagnostic finished.");
  process.exit(0);
});