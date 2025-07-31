// e2e/jazz-reporter.js
import { startWorker } from "jazz-tools/worker";
import { InboxSender } from "jazz-tools";
import { WebSocket } from "ws";
import { 
  TestClientAccount,
  StorageSnapshotMessage,
  TestResultMessage,
  TestRunSummaryMessage
} from "./test-data-schema.js";

global.WebSocket = WebSocket;

class JazzReporter {
  constructor(options) {
    console.log("🔧 Creating Jazz Reporter with options:", options);
    this.syncUrl = options.syncUrl || "wss://cloud.jazz.tools";
    this.serverAccountId = process.env.JAZZ_TEST_SERVER_ACCOUNT;
    this.clientAccountId = process.env.JAZZ_REPORTER_ACCOUNT;
    this.clientAccountSecret = process.env.JAZZ_REPORTER_SECRET;
    
    console.log("📋 Jazz configuration:");
    console.log("  - Sync URL:", this.syncUrl);
    console.log("  - Server Account ID:", this.serverAccountId ? "✅ Set" : "❌ Missing");
    console.log("  - Client Account ID:", this.clientAccountId ? "✅ Set" : "❌ Missing");
    
    this.me = null;
    this.sender = null;
    this.initPromise = null;
    this.testRunData = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      results: []
    };
  }

  async ensureInitialized() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize().catch(error => {
      console.error("❌ Jazz initialization failed:", error);
      throw error;
    });
    
    return this.initPromise;
  }

  async _initialize() {
    console.log("🚀 Starting Jazz Reporter initialization...");

    if (!this.serverAccountId || !this.clientAccountId || !this.clientAccountSecret) {
      throw new Error("Required environment variables are missing.");
    }

    try {
      const { worker } = await startWorker({
        syncServer: this.syncUrl,
        accountID: this.clientAccountId,
        accountSecret: this.clientAccountSecret,
        AccountSchema: TestClientAccount,
      });

      this.me = worker;
      console.log("✅ Jazz Reporter connected with Account ID:", this.me.id);

      // Initialize inbox sender
      this.sender = await InboxSender.load(this.serverAccountId, this.me);
      console.log("📬 Prepared to send messages to test server:", this.serverAccountId);
      
    } catch (error) {
      console.error("❌ Failed to start Jazz worker:", error);
      throw error;
    }
  }

  async sendMessage(message) {
    try {
      const responseId = await this.sender.sendMessage(message);
      
      // Save response ID
      const loadedMe = await this.me.ensureLoaded({ 
        resolve: { root: { responseIds: true } } 
      });
      loadedMe.root.responseIds.push(responseId);
      await loadedMe.root.responseIds.waitForSync();
      
      return responseId;
    } catch (error) {
      console.error(`❌ Failed to send ${message.type} message:`, error);
      throw error;
    }
  }

  onBegin(config, suite) {
    console.log(`▶️ Starting test run with ${suite.allTests().length} tests.`);
    this.testRunData.totalTests = suite.allTests().length;
    this.testRunData.startTime = Date.now();
    
    // Start initialization early
    this.ensureInitialized().catch(error => {
      console.error("❌ Jazz initialization failed during onBegin:", error);
    });
  }

  async onTestEnd(test, result) {
    console.log("📊 Test ended:", test.title, "-", result.status);
    
    // Update run statistics
    this.testRunData[result.status]++;
    this.testRunData.results.push({
      title: test.title,
      status: result.status,
      duration: result.duration
    });

    try {
      await this.ensureInitialized();
    } catch (error) {
      console.error("❌ Jazz not initialized, cannot send data:", error.message);
      return;
    }

    // Send test result
    const testResultMessage = TestResultMessage.create({
      type: "testResult",
      testTitle: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      timestamp: new Date().toISOString(),
    });

    await this.sendMessage(testResultMessage);
    console.log("✅ Test result sent");

    // Process attachments
    for (const attachment of result.attachments) {
      if (attachment.name === 'jazz-storage-data') {
        console.log("📡 Found storage data attachment, sending...");
        
        try {
          const storageDataString = attachment.body.toString('utf-8');
          
          const snapshotMessage = StorageSnapshotMessage.create({
            type: "storageSnapshot",
            testTitle: test.title,
            storageContent: storageDataString,
            timestamp: new Date().toISOString(),
          });
          
          await this.sendMessage(snapshotMessage);
          console.log("✅ Storage snapshot sent");
          
        } catch (error) {
          console.error("❌ Failed to send storage snapshot:", error);
        }
      }
    }
  }

  async onEnd(result) {
    console.log(`🏁 Test run finished with status: ${result.status}`);
    
    try {
      await this.ensureInitialized();
      
      // Send test run summary
      const summaryMessage = TestRunSummaryMessage.create({
        type: "testRunSummary",
        totalTests: this.testRunData.totalTests,
        passed: this.testRunData.passed,
        failed: this.testRunData.failed,
        skipped: this.testRunData.skipped,
        duration: Date.now() - this.testRunData.startTime,
        timestamp: new Date().toISOString(),
      });
      
      const responseId = await this.sendMessage(summaryMessage);
      console.log("✅ Test run summary sent, ID:", responseId);
      
      // Give time for final sync
      console.log("⏳ Waiting for final sync...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log("✅ Jazz reporter finished successfully");
      console.log(`  - Total messages sent: ${this.me.root.responseIds.length}`);
      
    } catch (error) {
      console.error("❌ Failed to send test run summary:", error);
    }
  }
}

export default JazzReporter;