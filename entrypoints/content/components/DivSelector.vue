<script lang="ts" setup>
import { onUnmounted, ref } from "vue";

const isSelectionModeActive = ref(false);
const selectedDivs = ref<Set<HTMLElement>>(new Set());
const hoverElement = ref<HTMLElement | null>(null);
const copyStatus = ref('');

const selectedDivClassName = 'prismai-div-selected';
const hoverDivClassName = 'prismai-div-hover';

const toggleSelectionMode = () => {
  isSelectionModeActive.value = !isSelectionModeActive.value;
  if (isSelectionModeActive.value) {
    document.addEventListener("click", handlePageClick, true);
    document.addEventListener("mouseover", handlePageMouseOver);
    document.addEventListener("mouseout", handlePageMouseOut);
  } else {
    document.removeEventListener("click", handlePageClick, true);
    document.removeEventListener("mouseover", handlePageMouseOver);
    document.removeEventListener("mouseout", handlePageMouseOut);
    clearSelection();
  }
};

const handlePageMouseOver = (event: MouseEvent) => {
    if (!isSelectionModeActive.value) return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'DIV' && !selectedDivs.value.has(target)) {
        if (hoverElement.value) {
            hoverElement.value.classList.remove(hoverDivClassName);
        }
        hoverElement.value = target;
        hoverElement.value.classList.add(hoverDivClassName);
    }
}

const handlePageMouseOut = (event: MouseEvent) => {
    if (hoverElement.value) {
        hoverElement.value.classList.remove(hoverDivClassName);
        hoverElement.value = null;
    }
}

const handlePageClick = (event: MouseEvent) => {
  if (!isSelectionModeActive.value) return;

  event.preventDefault();
  event.stopPropagation();

  const target = event.target as HTMLElement;

  if (target.tagName === "DIV") {
    if (selectedDivs.value.has(target)) {
      target.classList.remove(selectedDivClassName);
      selectedDivs.value.delete(target);
    } else {
      target.classList.add(selectedDivClassName);
      selectedDivs.value.add(target);
    }
  }
};

const copySelectedDivsContent = async () => {
  if (selectedDivs.value.size === 0) {
    copyStatus.value = 'No divs selected.';
    setTimeout(() => copyStatus.value = '', 2000);
    return;
  }

  let content = "";
  selectedDivs.value.forEach((div) => {
    content += div.innerText + "\n\n";
  });

  try {
    await navigator.clipboard.writeText(content.trim());
    copyStatus.value = `Copied ${selectedDivs.value.size} div(s)!`;
  } catch (err) {
    console.error("Failed to copy text: ", err);
    copyStatus.value = 'Copy failed!';
  }

  setTimeout(() => copyStatus.value = '', 2000);
};

const clearSelection = () => {
    selectedDivs.value.forEach(div => {
        div.classList.remove(selectedDivClassName);
    });
    selectedDivs.value.clear();
    if (hoverElement.value) {
        hoverElement.value.classList.remove(hoverDivClassName);
        hoverElement.value = null;
    }
}

onUnmounted(() => {
  document.removeEventListener("click", handlePageClick, true);
  document.removeEventListener("mouseover", handlePageMouseOver);
  document.removeEventListener("mouseout", handlePageMouseOut);
  clearSelection();
});
</script>

<template>
  <div class="div-selector-toolbar">
    <button @click="toggleSelectionMode" :class="{ active: isSelectionModeActive }">
      {{ isSelectionModeActive ? "Stop Selecting" : "Select Divs" }}
    </button>
    <button @click="copySelectedDivsContent" :disabled="selectedDivs.size === 0">
      Copy Text ({{ selectedDivs.size }})
    </button>
    <span v-if="copyStatus" class="copy-status">{{ copyStatus }}</span>
  </div>
</template>

<style scoped>
.div-selector-toolbar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999;
  background-color: var(--prismai-main-white, #fff);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: "Roboto Variable", sans-serif;
}

button {
  font-family: inherit;
  font-size: 14px;
  border: 1px solid #ccc;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  background-color: #f0f2f6;
  color: #111;
  transition: background-color 0.2s, color 0.2s;
}

button:hover {
  background-color: #e0e2e6;
}

button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

button.active {
  background-color: var(--prismai-primary-color-dark, #076eff);
  color: var(--prismai-main-white, #fff);
  border-color: var(--prismai-primary-color-dark, #076eff);
}

.copy-status {
    font-size: 12px;
    color: var(--prismai-primary-color-dark, #076eff);
}
</style>
