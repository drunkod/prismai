<template>
  <div class="saved-website-item">
    <img :src="website.favicon" class="favicon" />
    <span class="title">{{ website.title }}</span>
    <button @click="$emit('remove', website.url)">Remove</button>
  </div>
</template>

<script setup lang="ts">
import type { StoredWebsite } from '@/composables/useWebsiteManager';

defineProps<{
  website: StoredWebsite;
}>();

defineEmits(['remove']);
</script>

<style scoped>
.saved-website-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.favicon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.title {
  flex-grow: 1;
}
</style>
