// e2e/view-test-history.js
import { startWorker } from "jazz-tools/worker";
import { WebSocket } from "ws";
import { TestServerAccount } from "./test-data-schema.js";

global.WebSocket = WebSocket;

async function viewTestHistory() {
  console.log("🔍 Connecting to Jazz...");
  
  const { worker } = await startWorker({
    syncServer: process.env.JAZZ_SYNC_URL || "ws://127.0.0.1:4200",
    accountID: process.env.JAZZ_TEST_SERVER_ACCOUNT,
    accountSecret: process.env.JAZZ_TEST_SERVER_SECRET,
    AccountSchema: TestServerAccount,
  });

  console.log("📡 Loading test data...");
  
  // Load with deep resolution to ensure all nested data is loaded
  const account = await TestServerAccount.load(worker.id, {
    loadAs: worker,
    resolve: { 
      root: { 
        testRuns: {
          $each: {} // Load each item in the list
        },
        allSnapshots: {
          $each: {}
        },
        allResults: {
          $each: {}
        }
      } 
    }
  });

  if (!account || !account.root) {
    console.log("❌ Could not load account data");
    return;
  }

  console.log(`\n📚 Test History for Server ${account.id}:`);
  console.log(`Total test runs: ${account.root.testRuns?.length || 0}`);
  console.log(`Total snapshots: ${account.root.allSnapshots?.length || 0}`);
  console.log(`Total results: ${account.root.allResults?.length || 0}\n`);

  // Handle test runs with null checks
  if (account.root.testRuns && account.root.testRuns.length > 0) {
    console.log("Test Runs:");
    for (let i = 0; i < account.root.testRuns.length; i++) {
      const run = account.root.testRuns[i];
      
      // Skip null/undefined runs
      if (!run) {
        console.log(`  [${i}] ⚠️  Null or undefined run`);
        continue;
      }
      
      try {
        console.log(`  Run ID: ${run.id || 'unknown'}`);
        console.log(`  Date: ${run.timestamp ? new Date(run.timestamp).toLocaleString() : 'unknown'}`);
        console.log(`  Results: ${run.passed || 0}/${run.totalTests || 0} passed`);
        console.log(`  Duration: ${run.duration || 0}ms`);
        console.log("  ---");
      } catch (error) {
        console.log(`  [${i}] ❌ Error reading run:`, error.message);
      }
    }
  }

  // Handle snapshots with null checks
  if (account.root.allSnapshots && account.root.allSnapshots.length > 0) {
    console.log("\nRecent Storage Snapshots:");
    const recentSnapshots = account.root.allSnapshots.slice(-5);
    
    for (let i = 0; i < recentSnapshots.length; i++) {
      const snapshot = recentSnapshots[i];
      
      // Skip null/undefined snapshots
      if (!snapshot) {
        console.log(`  [${i}] ⚠️  Null or undefined snapshot`);
        continue;
      }
      
      try {
        console.log(`  Test: ${snapshot.testTitle || 'unknown'}`);
        console.log(`  Time: ${snapshot.retrievedAt ? new Date(snapshot.retrievedAt).toLocaleString() : 'unknown'}`);
        console.log(`  Data Length: ${snapshot.storageContent ? snapshot.storageContent.length : 0} chars`);
        console.log("  ---");
      } catch (error) {
        console.log(`  [${i}] ❌ Error reading snapshot:`, error.message);
      }
    }
  }

  // Handle results with null checks
  if (account.root.allResults && account.root.allResults.length > 0) {
    console.log("\nRecent Test Results:");
    const recentResults = account.root.allResults.slice(-5);
    
    for (let i = 0; i < recentResults.length; i++) {
      const result = recentResults[i];
      
      // Skip null/undefined results
      if (!result) {
        console.log(`  [${i}] ⚠️  Null or undefined result`);
        continue;
      }
      
      try {
        console.log(`  Test: ${result.testTitle || 'unknown'}`);
        console.log(`  Status: ${result.status || 'unknown'}`);
        console.log(`  Duration: ${result.duration || 0}ms`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
        console.log("  ---");
      } catch (error) {
        console.log(`  [${i}] ❌ Error reading result:`, error.message);
      }
    }
  }
}

viewTestHistory().catch(console.error).finally(() => process.exit(0));