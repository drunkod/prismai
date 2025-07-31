// server-worker.js (ENHANCED)
import { startWorker } from "jazz-tools/worker";
import { WebSocket } from "ws";
import { Group } from "jazz-tools";
import { 
  MyAccount, 
  InboxMessage, 
  TextResponse, 
  DataResponse, 
  FetchResponse 
} from "./inbox-schema.js";
import fetch from 'node-fetch';

global.WebSocket = WebSocket;

// Handler functions for different message types
async function handleProcessText(message, senderID, worker) {
  console.log(`Processing text: "${message.text}"`);
  
  const senderAccount = await MyAccount.load(senderID, { loadAs: worker });
  if (!senderAccount) {
    throw new Error(`Could not load sender account: ${senderID}`);
  }

  // Load sender profile for more information
  const sender = await senderAccount.ensureLoaded({ 
    resolve: { profile: true } 
  });
  console.log(`   From user: ${sender.profile.name}`);

  const responseGroup = Group.create();
  responseGroup.addMember(senderAccount, "reader");
  
  const response = TextResponse.create({
    type: "text",
    responseText: `Server processed: "${message.text}" for ${sender.profile.name}`,
    processedAt: new Date().toISOString(),
  }, { owner: responseGroup });

  await responseGroup.waitForSync();
  return response;
}

async function handleAnalyzeData(message, senderID, worker) {
  const { data, operation } = message;
  console.log(`Analyzing data with operation: ${operation}`);

  const senderAccount = await MyAccount.load(senderID, { loadAs: worker });
  if (!senderAccount) {
    throw new Error(`Could not load sender account: ${senderID}`);
  }

  let result;
  switch (operation) {
    case "sum":
      result = data.reduce((a, b) => a + b, 0);
      break;
    case "average":
      result = data.reduce((a, b) => a + b, 0) / data.length;
      break;
    case "max":
      result = Math.max(...data);
      break;
    case "min":
      result = Math.min(...data);
      break;
  }

  const responseGroup = Group.create();
  responseGroup.addMember(senderAccount, "reader");
  
  const response = DataResponse.create({
    type: "data",
    result,
    operation,
    processedAt: new Date().toISOString(),
  }, { owner: responseGroup });

  await responseGroup.waitForSync();
  return response;
}

async function handleFetchData(message, senderID, worker) {
  const { url, headers } = message;
  console.log(`Fetching data from: ${url}`);

  const senderAccount = await MyAccount.load(senderID, { loadAs: worker });
  if (!senderAccount) {
    throw new Error(`Could not load sender account: ${senderID}`);
  }

  try {
    const fetchResponse = await fetch(url, { headers: headers || {} });
    const data = await fetchResponse.json();

    const responseGroup = Group.create();
    responseGroup.addMember(senderAccount, "reader");
    
    const response = FetchResponse.create({
      type: "fetch",
      data,
      status: fetchResponse.status,
      processedAt: new Date().toISOString(),
    }, { owner: responseGroup });

    await responseGroup.waitForSync();
    return response;
  } catch (error) {
    console.error(`Fetch error: ${error.message}`);
    throw error;
  }
}

async function startServer() {
  // ... initialization code remains the same ...

  const { worker, experimental: { inbox } } = await startWorker({
    syncServer: "ws://127.0.0.1:4200",
    accountID: process.env.JAZZ_WORKER_ACCOUNT,
    accountSecret: process.env.JAZZ_WORKER_SECRET,
    AccountSchema: MyAccount,
  });

  // ... profile setup remains the same ...

  // Subscribe to inbox with multiple message types
  inbox.subscribe(InboxMessage, async (message, senderID) => {
    console.log(`\n📥 Received ${message.type} message from: ${senderID}`);

    try {
      switch (message.type) {
        case "processText":
          return await handleProcessText(message, senderID, worker);
        case "analyzeData":
          return await handleAnalyzeData(message, senderID, worker);
        case "fetchData":
          return await handleFetchData(message, senderID, worker);
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling message: ${error.message}`);
      throw error;
    }
  });
}

startServer().catch(console.error);