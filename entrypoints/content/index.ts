import './style.css';
import { createApp } from 'vue';
import App from './App.vue';

// Content Scripts references: https://wxt.dev/guide/essentials/content-scripts
export default defineContentScript({
  matches: ['<all_urls>'], // For production should be: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    console.log("PrismAI content script main function executed");
    // WXT Content Script Shadow Root UI: https://wxt.dev/guide/essentials/content-scripts#shadow-root
    const ui = await createShadowRootUi(ctx, {
      name: 'prismai-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        console.log("Mounting PrismAI UI");
        const app = createApp(App);
        app.mount(container);
        console.log("PrismAI UI mounted");
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });

    ui.mount();
  },
});
