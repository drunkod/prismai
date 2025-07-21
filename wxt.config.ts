// /home/alex/Documents/projects/extentions/prismai/wxt.config.ts

import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: () => ({
    key: import.meta.env.WXT_WEB_EXTENSION_KEY,
    // ADD THIS PERMISSION:
    host_permissions: ["<all_urls>"],
    permissions: ['storage', 'tabs'],
    web_accessible_resources: [{
      resources: ['fonts/Roboto/Roboto-VariableFont_wdth,wght.ttf'],
      matches: ['<all_urls>']
    }]
  }),
  webExt: {
    disabled: true,
  }
});