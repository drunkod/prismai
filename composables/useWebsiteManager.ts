import { sendMessage } from 'webext-bridge/popup';
import { HtmlParser } from '@/utils/html-parser';
import localforage from 'localforage';

export type StoredWebsite = {
  url: string;
  content: string;
  title?: string;
  favicon?: string; // Base64 encoded favicon
  order?: number;
};

// Initialize localforage instance for website data
const websitesStore = localforage.createInstance({
  name: 'prismai-websites',
  storeName: 'websites',
});

// Main composable for managing website context
export function useWebsiteManager() {
  const savedWebsites = ref<StoredWebsite[]>([]);
  const currentTabInfo = ref<{
    url?: string;
    title?: string;
    content?: string;
    favicon?: string;
    isSaved: boolean;
    isLoading: boolean;
    canBeSaved: boolean;
  }>({
    isSaved: false,
    isLoading: true,
    canBeSaved: false,
  });

  // Notify background script about website changes
  const notifyWebsiteChanges = async () => {
    try {
      const websites = await getAllWebsites();
      await sendMessage('update-saved-websites', { websites }, 'background');
    } catch (error) {
      console.error('[useWebsiteManager] Error notifying website changes:', error);
    }
  };

  const getWebsite = async (url: string): Promise<StoredWebsite | null> => {
    try {
      const stored = await websitesStore.getItem(url);
      return stored as StoredWebsite | null;
    } catch (error) {
      console.error(`[useWebsiteManager] Error getting website ${url}:`, error);
      return null;
    }
  };

  const getAllWebsites = async (): Promise<StoredWebsite[]> => {
    const websites: StoredWebsite[] = [];
    try {
      await websitesStore.iterate<StoredWebsite, void>((value: any) => {
        if (value.order === undefined) {
          value.order = 0; // Legacy support
        }
        websites.push(value);
      });
      return websites.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error('[useWebsiteManager] Error getting all websites:', error);
      return [];
    }
  };

  const loadSavedWebsites = async () => {
    savedWebsites.value = await getAllWebsites();
  };

  const fetchCurrentTabContent = async () => {
    currentTabInfo.value.isLoading = true;
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const url = tab.url;
      const title = tab.title;

      if (url && url.startsWith('http')) {
        currentTabInfo.value.url = url;
        currentTabInfo.value.title = title;

        const stored = await getWebsite(url);
        if (stored) {
          currentTabInfo.value.content = stored.content;
          currentTabInfo.value.favicon = stored.favicon;
          currentTabInfo.value.isSaved = true;
          currentTabInfo.value.canBeSaved = true;
        } else {
          const response = await sendMessage('get-tab-data', {}, 'background');
          if (response) {
            currentTabInfo.value.favicon = response.favicon_base64;
            const parsedContent = await HtmlParser.parse(response.html);
            if (parsedContent) {
              currentTabInfo.value.content = parsedContent;
              currentTabInfo.value.canBeSaved = true;
            } else {
              currentTabInfo.value.canBeSaved = false;
            }
          }
          currentTabInfo.value.isSaved = false;
        }
      } else {
        currentTabInfo.value.canBeSaved = false;
      }
    } catch (error) {
      console.error('[useWebsiteManager] Error fetching current tab content:', error);
      currentTabInfo.value.canBeSaved = false;
    } finally {
      currentTabInfo.value.isLoading = false;
    }
  };

  const saveCurrentPage = async () => {
    const { url, title, content, favicon } = currentTabInfo.value;
    if (!url || !content) return;

    try {
      const allSites = await getAllWebsites();
      const maxOrder = allSites.length > 0 ? Math.max(...allSites.map(site => site.order || 0)) : -1;
      const storedWebsite: StoredWebsite = { url, title, content, favicon, order: maxOrder + 1 };
      await websitesStore.setItem(url, storedWebsite);
      currentTabInfo.value.isSaved = true;
      await loadSavedWebsites();
      await notifyWebsiteChanges();
    } catch (error) {
      console.error('[useWebsiteManager] Error saving page:', error);
    }
  };

  const removeWebsite = async (url: string) => {
    try {
      await websitesStore.removeItem(url);
      if (url === currentTabInfo.value.url) {
        currentTabInfo.value.isSaved = false;
      }
      await loadSavedWebsites();
      await notifyWebsiteChanges();
    } catch (error) {
      console.error('[useWebsiteManager] Error removing page:', error);
    }
  };

  const updateWebsitesOrder = async (orderedWebsites: StoredWebsite[]) => {
    try {
      savedWebsites.value = orderedWebsites;
      for (let i = 0; i < orderedWebsites.length; i++) {
        const website = await getWebsite(orderedWebsites[i].url);
        if (website) {
          website.order = i;
          await websitesStore.setItem(orderedWebsites[i].url, website);
        }
      }
      await notifyWebsiteChanges();
    } catch(error) {
      console.error('[useWebsiteManager] Error updating order:', error);
    }
  };

  // Initial load
  onMounted(async () => {
    await loadSavedWebsites();
    await fetchCurrentTabContent();
  });

  return {
    savedWebsites,
    currentTabInfo,
    saveCurrentPage,
    removeWebsite,
    updateWebsitesOrder,
    notifyWebsiteChanges,
  };
}
