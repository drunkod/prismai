import { onMessage } from "webext-bridge/background";
import { useThePromptApi, useTranslatorApi, useSummarizerApi } from "./scripts";

type RequestPayload = {
  actionType: PreferenceKeys;
  textSelection: string;
}

let fetchPromptApi: ((actionType: Exclude<PreferenceKeys, 'translate' | 'summarize'>, textSelection: string) => Promise<string>) | undefined;

export default defineBackground(() => {
  // Handle extension installation - open welcome page
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      const welcomeUrl = browser.runtime.getURL('/welcome.html');
      browser.tabs.create({
        url: welcomeUrl
      });
    }
  });

  (async () => {
    try {
      const { promptApi } = await useThePromptApi();
      fetchPromptApi = promptApi;
    } catch (error) {
      console.error("Failed to initialize The Prompt API:", error);
    }
  })();

  const getLanguagePreference = async () => {
    const currentPreferences = await preferences.getValue()
    return currentPreferences.sentence.translate
  }

  const promptBuiltInByActionType = async (actionType: PreferenceKeys, textSelection: string): Promise<string> => {
    // console.log(`[Background] Calling AI for: "${actionType}" with text selection: "${textSelection}"`);
    try {
      switch (actionType) {
        case 'translate':
          const language = await getLanguagePreference();
          const translatorResult = await useTranslatorApi(language, textSelection);
          if (translatorResult instanceof Error) throw translatorResult;
          return translatorResult;
        case 'summarize':
          const summarizerResult = await useSummarizerApi(textSelection);
          if (summarizerResult instanceof Error) throw summarizerResult;
          return summarizerResult;
        default:
          if (!fetchPromptApi) {
            throw new Error("Prompt API is not available.");
          }
          return await fetchPromptApi(actionType, textSelection);
      }
    } catch (error) {
      console.error("[Background] Error calling AI API:", error);
      throw new Error(`AI API Call Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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
});
