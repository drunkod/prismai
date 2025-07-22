import { storage } from 'wxt/storage';

const currentPage = ref()

export async function usePopupNavigation() {
  // Set the new default page
  const storedPage = await storage.getItem('local:popupCurrentPage');
  if (storedPage === 'splash-screen') {
    await storage.setItem('local:popupCurrentPage', 'context-manager');
  }

  currentPage.value = await popupCurrentPage.getValue()

  const updatePage = async (newValue: string) => {
    await popupCurrentPage.setValue(newValue)
    currentPage.value = await popupCurrentPage.getValue()
  }

  return {
    currentPage,
    updatePage,
  }
}