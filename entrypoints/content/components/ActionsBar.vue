<script lang="ts" setup>
import ActionAccordion from "./ActionAccordion.vue";
import { IconCopy } from "@/components/icons";

defineProps<{
  type: "word" | "sentence";
}>();

const { instancePreferences } = await usePreferences();
const { textSelection } = useSelection();

const copyStatusText = ref("Copy");

const copyToClipboard = async () => {
  if (!textSelection.value || copyStatusText.value !== "Copy") return;

  try {
    await navigator.clipboard.writeText(textSelection.value);
    copyStatusText.value = "Copied!";
  } catch (err) {
    console.error("Failed to copy text: ", err);
    copyStatusText.value = "Failed!";
  } finally {
    setTimeout(() => {
      copyStatusText.value = "Copy";
    }, 1500);
  }
};
</script>

<template>
  <ul class="prismai-accordions">
    <li v-if="type === 'word'" class="prismai-accordions__item">
      <ActionAccordion
        :preference-value="true"
        preference-key="description"
        auto
      />
    </li>
    <template v-if="instancePreferences">
      <li class="prismai-accordions__item">
        <div class="prismai-accordions__item-header copy-button" @click="copyToClipboard">
          <span class="prismai-accordions__item-title">{{ copyStatusText }}</span>
          <IconCopy />
        </div>
      </li>
      <li
        v-for="(preferenceValue, preferenceKey) in instancePreferences[type]"
        class="prismai-accordions__item"
      >
        <ActionAccordion
          :preference-value="preferenceValue"
          :preference-key="preferenceKey"
        />
      </li>
    </template>
  </ul>
</template>

<style scoped>
/* -- Accordion */
.prismai-accordions {
  list-style: none;
  padding: 0;
  margin: 0;
}

.copy-button {
  cursor: pointer;

  &:hover {
    background-color: var(--prismai-main-gray);
  }
}
</style>
