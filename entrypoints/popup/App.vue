<template>
  <div class="main-container">
    <header class="header-container">
      <LogoPrismai />
      <div class="header-controls">
        <button @click="navigateTo('settings')">
          <IconSettings />
        </button>
      </div>
    </header>

    <main class="content-container">
      <template v-if="currentPage === 'context-manager'">
        <ContextManagerScreen />
      </template>
      <template v-else-if="currentPage === 'settings'">
        <SettingsScreen />
      </template>
      <template v-else>
        <SplashScreen />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { usePopupNavigation } from '@/composables/popup-navigation';
import LogoPrismai from '@/components/LogoPrismai.vue';
import IconSettings from '@/components/icons/IconSettings.vue';
import SettingsScreen from './components/SettingsScreen.vue';
import SplashScreen from './components/SplashScreen.vue';
import ContextManagerScreen from './components/ContextManagerScreen.vue';

const { currentPage, updatePage: navigateTo } = usePopupNavigation();
</script>

<style>
/* Add your styles here */
</style>
