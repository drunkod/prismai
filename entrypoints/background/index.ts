import { onMessage } from "webext-bridge/background";
import { useThePromptApi, useTranslatorApi, useSummarizerApi } from "./scripts";
import { HtmlParser } from '@/utils/html-parser';

type RequestPayload = {
  actionType: PreferenceKeys;
  textSelection: string;
}

type StoredWebsite = {
  url: string;
  content: string;
  title?: string;
  favicon?: string;
};

// --- WebSocket Logic from gemini-coder ---
const WEBSOCKET_URL = 'ws://localhost:55155';
const RECONNECT_DELAY = 5000;
let websocket: WebSocket | null = null;
let isReconnecting = false;

async function checkServerHealth(): Promise<boolean> {
  // This is a placeholder. In a real scenario, you might want to
  // have a specific health check endpoint on your server.
  return true;
}

function connectWebSocket() {
  if (isReconnecting || websocket?.readyState === WebSocket.OPEN) return;
  isReconnecting = true;

  checkServerHealth().then(isHealthy => {
    if (!isHealthy) {
      console.debug('Prismai: Server not healthy, retrying...');
      setTimeout(() => {
        isReconnecting = false;
        connectWebSocket();
      }, RECONNECT_DELAY);
      return;
    }

    const manifest = browser.runtime.getManifest();
    const version = manifest.version;
    const token = 'gemini-coder'; // Security token from gemini-coder

    console.log('Prismai: Attempting to connect to local server...');
    websocket = new WebSocket(`${WEBSOCKET_URL}?token=${token}&version=${version}`);

    websocket.onopen = () => {
      console.log('Prismai: Connected with the local server!');
      isReconnecting = false;
      // Immediately send saved websites on connection
      sendMessage('sync-websites-on-connect', {}, 'background');
    };

    websocket.onmessage = async (event) => {
      // Logic to handle messages from the server if needed in the future
      console.log('Prismai: Message from server:', event.data);
    };

    websocket.onclose = () => {
      console.log('Prismai: Disconnected, attempting to reconnect...');
      websocket = null;
      isReconnecting = false;
      setTimeout(connectWebSocket, RECONNECT_DELAY);
    };

    websocket.onerror = (error) => {
      console.error('Prismai: WebSocket error:', error);
      isReconnecting = false;
      websocket = null;
    };
  });
}

function sendWebsitesToSocket(websites: StoredWebsite[]) {
  if (websocket?.readyState === WebSocket.OPEN) {
    const message = {
      action: 'update-saved-websites',
      websites: websites.map(site => ({
        url: site.url,
        title: site.title,
        content: site.content,
        favicon: site.favicon,
      })),
    };
    websocket.send(JSON.stringify(message));
    console.log('Prismai: Sent updated websites to local server.');
    return true;
  }
  return false;
}
// --- End of WebSocket Logic ---

let fetchPromptApi: (actionType: Exclude<PreferenceKeys, 'translate' | 'summarize'>, textSelection: string) => Promise<any>;

export default defineBackground(() => {
  // --- Start WebSocket connection on install/startup ---
  connectWebSocket();

  // Handle extension installation - open welcome page
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      const welcomeUrl = browser.runtime.getURL('/welcome.html');
      browser.tabs.create({ url: welcomeUrl });
    }
  });

  (async () => {
    const { promptApi } = await useThePromptApi();
    fetchPromptApi = promptApi;
  })();

  const getLanguagePreference = async () => {
    const currentPreferences = await preferences.getValue()
    return currentPreferences.sentence.translate
  }

  const promptBuiltInByActionType = async (actionType: PreferenceKeys, textSelection: string): Promise<any> => {
    // Placeholder for the actual implementation
  };

  // --- Message Handlers ---

  // Handle original AI response requests
  onMessage<RequestPayload, string>('get-ai-response', async (message) => {
    const { actionType, textSelection } = message.data;

    if (typeof actionType === 'string' && actionType.trim() !== '') {
      try {
        return await promptBuiltInByActionType(actionType, textSelection);
      } catch (error) {
        console.error("[Background] Error processing AI request:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error during AI processing.";
        return `Error: ${errorMessage}`;
      }
    } else {
      return "Error: Invalid type request received.";
    }
  });

  // Handle request for current tab's HTML content
  onMessage('get-tab-data', async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.url || !tab.url.startsWith('http')) {
        throw new Error('URL is not valid');
      }
      const response = await fetch(tab.url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const html = await response.text();

      // Favicon logic can be complex, for now we can skip it or add a simple version
      // let favicon_base64;
      // if (tab.favIconUrl) { ... }

      return { html, favicon_base64: tab.favIconUrl /* Sending URL for now */ };
    } catch (error) {
      console.error("[Background] Error getting tab data:", error);
      return undefined;
    }
  });

  // Handle website list updates and forward to WebSocket
  onMessage('update-saved-websites', (message) => {
    if (message.data.websites) {
      sendWebsitesToSocket(message.data.websites);
    }
  });

  // Handle request to sync websites when WebSocket reconnects
  onMessage('sync-websites-on-connect', (message) => {
    // This message is just a trigger. The logic to fetch and send is in the popup's composable.
    // The composable will call 'update-saved-websites' upon loading if the connection is ready.
  });
});
