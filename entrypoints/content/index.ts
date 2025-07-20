import './style.css';
import { createApp } from 'vue';
import App from './App.vue';
import DivSelector from './components/DivSelector.vue';

// Content Scripts references: https://wxt.dev/guide/essentials/content-scripts
export default defineContentScript({
  matches: ['<all_urls>'], // For production should be: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    // Inject styles for highlighting divs on the host page
    const pageStyles = `
      .prismai-div-hover {
        outline: 2px dashed #076eff !important;
        outline-offset: 2px;
        cursor: pointer;
        background-color: rgba(7, 110, 255, 0.1) !important;
      }
      .prismai-div-selected {
        outline: 2px solid #ee4d5d !important;
        box-shadow: 0 0 0 2px #fff, 0 0 0 4px #ee4d5d !important;
        background-color: rgba(238, 77, 93, 0.1) !important;
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = pageStyles;
    document.head.appendChild(styleEl);

    // WXT Content Script Shadow Root UI: https://wxt.dev/guide/essentials/content-scripts#shadow-root

    // UI for the original text selection popup
    const textSelectionUI = await createShadowRootUi(ctx, {
      name: 'prismai-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const app = createApp(App);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });
    textSelectionUI.mount();

    // UI for the new Div Selector toolbar
    const divSelectorUI = await createShadowRootUi(ctx, {
        name: 'prismai-div-selector-ui',
        position: 'inline',
        anchor: 'body',
        onMount: (container) => {
            const app = createApp(DivSelector);
            app.mount(container);
            return app;
        },
        onRemove: (app) => {
            app?.unmount();
        }
    });
    divSelectorUI.mount();
  },
});
