<template>
  <div class="splash-screen">
    <button @click="navigateTo('context-manager')">
      Go to Context Manager
    </button>
  </div>
</template>

<script setup lang="ts">
import { usePopupNavigation } from '@/composables/popup-navigation';

const { updatePage: navigateTo } = usePopupNavigation();
</script>
