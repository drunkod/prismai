// e2e/test-server-worker.js
import { startWorker } from "jazz-tools/worker";
import { WebSocket } from "ws";
import { Group } from "jazz-tools";
import { 
  TestServerAccount,
  TestClientAccount,
  TestReportMessage,
  MessageResponse,
  ChromeStorageData,
  TestResult,
  TestRunSummary,
  ServerAccountRoot
} from "./test-data-schema.js";

global.WebSocket = WebSocket;

// Global reference to ensure persistence
let serverWorker = null;

async function ensureAccountStructure(worker) {
  // Load the account with full resolution
  const account = await TestServerAccount.load(worker.id, {
    loadAs: worker,
    resolve: {
      root: {
        testRuns: true,
        allSnapshots: true,
        allResults: true
      }
    }
  });

  // If root doesn't exist or lists are missing, create them
  if (!account.root) {
    console.log("⚠️  Creating account root...");
    const root = ServerAccountRoot.create({
      testRuns: co.list(TestRunSummary).create([], { owner: worker }),
      allSnapshots: co.list(ChromeStorageData).create([], { owner: worker }),
      allResults: co.list(TestResult).create([], { owner: worker }),
    }, { owner: worker });
    
    account.root = root;
    await account.waitForSync();
    console.log("✅ Account root created and synced");
  }

  return account;
}

async function handleStorageSnapshot(message, senderID, worker) {
  const { testTitle, storageContent, timestamp } = message;
  console.log(`📸 Processing storage snapshot for test: ${testTitle}`);

  const senderAccount = await TestClientAccount.load(senderID, { loadAs: worker });
  if (!senderAccount) {
    throw new Error(`Could not load sender account: ${senderID}`);
  }

  // Get fresh account state
  const account = await ensureAccountStructure(worker);

  // Create the snapshot
  const snapshot = ChromeStorageData.create({
    testTitle,
    retrievedAt: timestamp,
    storageContent,
  }, { owner: worker });

  // Add to list
  account.root.allSnapshots.push(snapshot);
  console.log(`   Added snapshot ${snapshot.id} to list`);
  
  // Wait for both the snapshot and the list to sync
  await snapshot.waitForSync();
  await account.root.allSnapshots.waitForSync();
  await account.root.waitForSync();
  await account.waitForSync();
  
  console.log(`   ✅ Snapshot synced, list now has ${account.root.allSnapshots.length} items`);

  // Verify persistence
  const verification = await TestServerAccount.load(worker.id, {
    loadAs: worker,
    resolve: { root: { allSnapshots: true } }
  });
  console.log(`   📍 Verification: ${verification.root.allSnapshots.length} snapshots found`);

  // Create response
  const responseGroup = Group.create({ owner: worker });
  responseGroup.addMember(senderAccount, "reader");
  
  const response = MessageResponse.create({
    messageType: "storageSnapshot",
    id: snapshot.id,
    savedAt: new Date().toISOString(),
    message: `Storage snapshot saved for test: ${testTitle}`,
  }, { owner: responseGroup });

  await responseGroup.waitForSync();
  return response;
}

async function handleTestResult(message, senderID, worker) {
  const { testTitle, status, duration, error, timestamp } = message;
  console.log(`📊 Processing test result: ${testTitle} - ${status}`);

  const senderAccount = await TestClientAccount.load(senderID, { loadAs: worker });
  if (!senderAccount) {
    throw new Error(`Could not load sender account: ${senderID}`);
  }

  // Get fresh account state
  const account = await ensureAccountStructure(worker);

  // Create the test result
  const testResult = TestResult.create({
    testTitle,
    status,
    duration,
    error,
    timestamp,
  }, { owner: worker });

  // Add to list
  account.root.allResults.push(testResult);
  console.log(`   Added result ${testResult.id} to list`);
  
  // Multiple sync calls to ensure persistence
  await testResult.waitForSync();
  await account.root.allResults.waitForSync();
  await account.root.waitForSync();
  await account.waitForSync();
  
  console.log(`   ✅ Result synced, list now has ${account.root.allResults.length} items`);

  // Verify persistence
  const verification = await TestServerAccount.load(worker.id, {
    loadAs: worker,
    resolve: { root: { allResults: true } }
  });
  console.log(`   📍 Verification: ${verification.root.allResults.length} results found`);

  // Create response
  const responseGroup = Group.create({ owner: worker });
  responseGroup.addMember(senderAccount, "reader");
  
  const response = MessageResponse.create({
    messageType: "testResult",
    id: testResult.id,
    savedAt: new Date().toISOString(),
    message: `Test result saved: ${testTitle} - ${status}`,
  }, { owner: responseGroup });

  await responseGroup.waitForSync();
  return response;
}

async function handleTestRunSummary(message, senderID, worker) {
  const { totalTests, passed, failed, skipped, duration, timestamp } = message;
  console.log(`📈 Processing test run summary: ${passed}/${totalTests} passed`);

  const senderAccount = await TestClientAccount.load(senderID, { loadAs: worker });
  if (!senderAccount) {
    throw new Error(`Could not load sender account: ${senderID}`);
  }

  // Get fresh account state
  const account = await ensureAccountStructure(worker);

  // Create test run summary
  const testRunSummary = TestRunSummary.create({
    totalTests,
    passed,
    failed,
    skipped,
    duration,
    timestamp,
  }, { owner: worker });

  // Add to list
  account.root.testRuns.push(testRunSummary);
  console.log(`   Added run ${testRunSummary.id} to list`);
  
  // Multiple sync calls to ensure persistence
  await testRunSummary.waitForSync();
  await account.root.testRuns.waitForSync();
  await account.root.waitForSync();
  await account.waitForSync();
  
  console.log(`   ✅ Run synced, list now has ${account.root.testRuns.length} items`);

  // Verify persistence
  const verification = await TestServerAccount.load(worker.id, {
    loadAs: worker,
    resolve: { root: { testRuns: true } }
  });
  console.log(`   📍 Verification: ${verification.root.testRuns.length} runs found`);

  // Create response
  const responseGroup = Group.create({ owner: worker });
  responseGroup.addMember(senderAccount, "reader");
  
  const response = MessageResponse.create({
    messageType: "testRunSummary",
    id: testRunSummary.id,
    savedAt: new Date().toISOString(),
    message: `Test run summary saved: ${passed}/${totalTests} passed`,
  }, { owner: responseGroup });

  await responseGroup.waitForSync();
  return response;
}

async function startTestServer() {
  if (!process.env.JAZZ_TEST_SERVER_ACCOUNT || !process.env.JAZZ_TEST_SERVER_SECRET) {
    throw new Error("❌ ERROR: JAZZ_TEST_SERVER_ACCOUNT and JAZZ_TEST_SERVER_SECRET must be set.");
  }

  console.log("🚀 Starting Test Data Server Worker...");

  const { worker, experimental: { inbox } } = await startWorker({
    syncServer: process.env.JAZZ_SYNC_URL || "ws://127.0.0.1:4200",
    accountID: process.env.JAZZ_TEST_SERVER_ACCOUNT,
    accountSecret: process.env.JAZZ_TEST_SERVER_SECRET,
    AccountSchema: TestServerAccount,
  });

  serverWorker = worker;

  // Ensure account structure exists
  console.log("🔑 Setting up worker account...");
  const account = await ensureAccountStructure(worker);
  
  // Make profile public
  const profile = await account.ensureLoaded({ resolve: { profile: true } });
  const profileGroup = profile.profile._owner;
  if (profileGroup.getRoleOf("everyone") !== "reader") {
    profileGroup.addMember("everyone", "reader");
    await profileGroup.waitForSync();
    console.log("   ✅ Profile is now public.");
  }

  console.log("   ✅ Account structure verified:");
  console.log(`     - Test runs: ${account.root.testRuns.length}`);
  console.log(`     - Snapshots: ${account.root.allSnapshots.length}`);
  console.log(`     - Results: ${account.root.allResults.length}`);

  console.log(`✅ Test Server connected with Account ID: ${worker.id}`);
  console.log("📬 Listening for test reports...");

  // Subscribe to inbox
  inbox.subscribe(TestReportMessage, async (message, senderID) => {
    console.log(`\n📥 Received ${message.type} message from: ${senderID}`);

    try {
      switch (message.type) {
        case "storageSnapshot":
          return await handleStorageSnapshot(message, senderID, worker);
        case "testResult":
          return await handleTestResult(message, senderID, worker);
        case "testRunSummary":
          return await handleTestRunSummary(message, senderID, worker);
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling message: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  });

  // Periodic status report
  setInterval(async () => {
    try {
      const freshAccount = await TestServerAccount.load(worker.id, {
        loadAs: worker,
        resolve: { 
          root: { 
            testRuns: true, 
            allSnapshots: true, 
            allResults: true 
          } 
        }
      });
      
      if (freshAccount?.root) {
        console.log("\n📊 Server Status (Fresh Load):");
        console.log(`  - Account ID: ${freshAccount.id}`);
        console.log(`  - Total test runs: ${freshAccount.root.testRuns?.length || 0}`);
        console.log(`  - Total snapshots: ${freshAccount.root.allSnapshots?.length || 0}`);
        console.log(`  - Total results: ${freshAccount.root.allResults?.length || 0}`);
      }
    } catch (error) {
      console.error("❌ Error loading fresh status:", error);
    }
  }, 30000);

  // Keep the process alive
  process.on('SIGINT', async () => {
    console.log("\n⏹️  Shutting down server...");
    // Give time for final sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(0);
  });
}

startTestServer().catch(console.error);