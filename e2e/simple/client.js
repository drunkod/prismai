// client.js (ENHANCED)
import { startWorker } from "jazz-tools/worker";
import { WebSocket } from "ws";
import { InboxSender } from "jazz-tools";
import { 
  MyAccount, 
  ProcessTextMessage, 
  AnalyzeDataMessage,
  FetchDataMessage 
} from "./inbox-schema.js";

global.WebSocket = WebSocket;

// Client class for better organization
class JazzClient {
  constructor(me, sender) {
    this.me = me;
    this.sender = sender;
  }

  async sendTextMessage(text) {
    const message = ProcessTextMessage.create({
      type: "processText",
      text,
    });
    
    console.log(`📤 Sending text message: "${text}"`);
    const responseId = await this.sender.sendMessage(message);
    await this.saveResponseId(responseId);
    return responseId;
  }

  async sendDataAnalysis(data, operation) {
    const message = AnalyzeDataMessage.create({
      type: "analyzeData",
      data,
      operation,
    });
    
    console.log(`📊 Sending data analysis request: ${operation} on [${data}]`);
    const responseId = await this.sender.sendMessage(message);
    await this.saveResponseId(responseId);
    return responseId;
  }

  async sendFetchRequest(url, headers = {}) {
    const message = FetchDataMessage.create({
      type: "fetchData",
      url,
      headers,
    });
    
    console.log(`🌐 Sending fetch request to: ${url}`);
    const responseId = await this.sender.sendMessage(message);
    await this.saveResponseId(responseId);
    return responseId;
  }

  async saveResponseId(responseId) {
    const loadedMe = await this.me.ensureLoaded({ 
      resolve: { root: { responseIds: true } } 
    });
    loadedMe.root.responseIds.push(responseId);
    await loadedMe.root.responseIds.waitForSync();
    console.log(`   💾 Response ID saved: ${responseId}`);
  }

  async getHistoricalResponses() {
    const loadedMe = await this.me.ensureLoaded({ 
      resolve: { root: { responseIds: true } } 
    });
    
    console.log("\n📜 Loading historical responses...");
    const responses = [];
    
    for (const responseId of loadedMe.root.responseIds) {
      try {
        // Try to load as any response type
        const response = await co.CoValue.load(responseId, { loadAs: this.me });
        if (response) {
          responses.push(response);
          console.log(`   ✅ Loaded response: ${responseId}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not load response: ${responseId}`);
      }
    }
    
    return responses;
  }
}

async function runClient() {
  // ... initialization remains the same ...

  const { worker: me } = await startWorker({
    syncServer: "ws://127.0.0.1:4200",
    accountID: process.env.JAZZ_CLIENT_ACCOUNT,
    accountSecret: process.env.JAZZ_CLIENT_SECRET,
    AccountSchema: MyAccount,
  });

  const sender = await InboxSender.load(process.env.JAZZ_WORKER_ACCOUNT, me);
  const client = new JazzClient(me, sender);

  // Example: Send different types of messages
  console.log("\n=== Sending Various Messages ===");
  
  // Text processing
  await client.sendTextMessage("Hello, Jazz Server!");
  
  // Data analysis
  await client.sendDataAnalysis([10, 20, 30, 40, 50], "average");
  
  // Fetch request (example with a public API)
  await client.sendFetchRequest(
    "https://api.github.com/users/jazz-tools",
    { "User-Agent": "Jazz-Client" }
  );

  // Load historical responses
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for sync
  const history = await client.getHistoricalResponses();
  console.log(`\n📚 Total historical responses: ${history.length}`);
}

runClient().catch(console.error).finally(() => process.exit(0));