<template>
  <div>
    <CurrentPageActions
      :isLoading="currentTabInfo.isLoading"
      :isSaved="currentTabInfo.isSaved"
      :canBeSaved="currentTabInfo.canBeSaved"
      :title="currentTabInfo.title"
      @save="saveCurrentPage"
      @remove="removeWebsite(currentTabInfo.url!)"
    />
    <draggable v-model="savedWebsites" @end="updateWebsitesOrder">
      <template #item="{ element }">
        <SavedWebsiteItem
          :website="element"
          @remove="removeWebsite(element.url)"
        />
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';
import { useWebsiteManager } from '@/composables/useWebsiteManager';
import SavedWebsiteItem from './SavedWebsiteItem.vue';
import CurrentPageActions from './CurrentPageActions.vue';

const {
  savedWebsites,
  currentTabInfo,
  saveCurrentPage,
  removeWebsite,
  updateWebsitesOrder,
} = useWebsiteManager();
</script>
