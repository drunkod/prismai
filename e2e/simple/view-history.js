// view-history.js
import { startWorker } from "jazz-tools/worker";
import { WebSocket } from "ws";
import { MyAccount } from "./inbox-schema.js";

global.WebSocket = WebSocket;

async function viewHistory() {
  const { worker: me } = await startWorker({
    syncServer: "ws://127.0.0.1:4200",
    accountID: process.env.JAZZ_CLIENT_ACCOUNT,
    accountSecret: process.env.JAZZ_CLIENT_SECRET,
    AccountSchema: MyAccount,
  });

  const loadedMe = await me.ensureLoaded({ 
    resolve: { root: { responseIds: true } } 
  });

  console.log(`\n📚 Response History for ${me.id}:`);
  console.log(`Total responses: ${loadedMe.root.responseIds.length}\n`);

  for (const responseId of loadedMe.root.responseIds) {
    try {
      const response = await co.CoValue.load(responseId, { loadAs: me });
      console.log(`ID: ${responseId}`);
      console.log(`Type: ${response.type}`);
      console.log(`Processed: ${response.processedAt}`);
      console.log(`Details:`, response);
      console.log("---");
    } catch (error) {
      console.log(`❌ Could not load: ${responseId}`);
    }
  }
}

viewHistory().catch(console.error).finally(() => process.exit(0));