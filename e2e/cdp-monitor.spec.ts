// /home/alex/Documents/projects/extentions/prismai/e2e/cdp-monitor.spec.ts

import { test, expect } from "./fixtures";

test("monitor proxy request with CDP", async ({ page, context, extensionId }) => {
  // Step 1: Create CDP session
  const client = await context.newCDPSession(page);
  console.log('✅ CDP session created');
  
  // Step 2: Enable Network monitoring
  await client.send('Network.enable');
  console.log('✅ Network monitoring enabled');
  
  // Step 3: Set up request listener
  client.on('Network.requestWillBeSent', (params) => {
    // Check if this is our target request
    if (params.request.url.includes('188.166.142.39/servers/list')) {
      console.log('\n🎯 FOUND PROXY REQUEST!');
      console.log('URL:', params.request.url);
      console.log('Method:', params.request.method);
      console.log('Headers:', params.request.headers);
      console.log('Request ID:', params.requestId);
    }
  });
  
  // Step 4: Set up response listener
  client.on('Network.responseReceived', (params) => {
    // Check if this is response for our target
    if (params.response.url.includes('188.166.142.39/servers/list')) {
      console.log('\n📥 PROXY RESPONSE RECEIVED!');
      console.log('Status:', params.response.status);
      console.log('Response Headers:', params.response.headers);
    }
  });
  
  // Step 5: Set up response body listener
  client.on('Network.loadingFinished', async (params) => {
    try {
      // Get the response body
      const response = await client.send('Network.getResponseBody', {
        requestId: params.requestId
      });
      
      // Check if this is our target by checking the body
      if (response.body && response.body.includes('servers')) {
        console.log('\n📦 RESPONSE BODY:');
        console.log(response.body);
      }
    } catch (e) {
      // Ignore errors for non-text responses
    }
  });
  
  // Step 6: Navigate to extension popup
  console.log('\n🚀 Opening extension popup...');
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  
  // Step 7: Wait for the request to happen
  console.log('⏳ Waiting for proxy request...');
  await page.waitForTimeout(5000);
  
  console.log('\n✅ Monitoring complete');
});

test("simple CDP proxy monitor", async ({ page, context, extensionId }) => {
  // 1. Create CDP session
  const cdp = await context.newCDPSession(page);
  
  // 2. Enable network
  await cdp.send('Network.enable');
  
  // 3. Listen for THE request
  cdp.on('Network.requestWillBeSent', (params) => {
    if (params.request.url === 'http://188.166.142.39/servers/list') {
      console.log('🎯 PROXY REQUEST FOUND!');
      console.log(JSON.stringify(params, null, 2));
    }
  });
  
  // 4. Open extension
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  
  // 5. Wait
  await page.waitForTimeout(5000);
});

import fs from "fs";

test("capture proxy request details", async ({ page, context, extensionId }) => {
  let proxyRequestFound = false;
  const capturedData: any = {};
  
  // Setup CDP
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await page.pause();
  // Capture request
  cdp.on('Network.requestWillBeSent', (params) => {
    if (params.request.url.includes('188.166.142.39/servers/list')) {
      proxyRequestFound = true;
      capturedData.request = params;
      console.log('✅ Proxy request captured!');
    }
  });
  
  // Capture response
  cdp.on('Network.responseReceived', (params) => {
    if (params.response.url.includes('188.166.142.39/servers/list')) {
      capturedData.response = params;
      console.log('✅ Proxy response captured!');
    }
  });
  
  // Capture response body
  cdp.on('Network.loadingFinished', async (params) => {
    if (capturedData.request && params.requestId === capturedData.request.requestId) {
      try {
        const body = await cdp.send('Network.getResponseBody', {
          requestId: params.requestId
        });
        capturedData.responseBody = body.body;
        console.log('✅ Response body captured!');
        
        // Save to file
        fs.writeFileSync('proxy-request.json', JSON.stringify(capturedData, null, 2));
        console.log('📄 Saved to proxy-request.json');
      } catch (e) {
        console.log('Could not get body:', e);
      }
    }
  });
  await page.waitForTimeout(5000);
  // Open extension
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.pause();
  // Wait for request
  await page.waitForTimeout(5000);
  
  // Verify we found it
  if (proxyRequestFound) {
    console.log('\n✅ SUCCESS! Proxy request was detected and captured.');
  } else {
    console.log('\n❌ No proxy request detected.');
  }
});