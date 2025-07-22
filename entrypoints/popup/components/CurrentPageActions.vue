<template>
  <div class="current-page-actions">
    <div v-if="isLoading">Loading...</div>
    <div v-else>
      <p>
        <strong>{{ title }}</strong>
      </p>
      <button v-if="canBeSaved && !isSaved" @click="$emit('save')">Save Page</button>
      <button v-if="isSaved" @click="$emit('remove')">Remove Page</button>
      <p v-if="!canBeSaved">This page cannot be saved.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isLoading: boolean;
  isSaved: boolean;
  canBeSaved: boolean;
  title?: string;
}>();

defineEmits(['save', 'remove']);
</script>

<style scoped>
.current-page-actions {
  padding: 16px;
  border-bottom: 1px solid #eee;
}
</style>
