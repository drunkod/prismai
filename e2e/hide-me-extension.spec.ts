// /home/alex/Documents/projects/extentions/prismai/e2e/hide-me-extension.spec.ts

import { test, expect } from "./fixtures";
import { setupRequestMonitoring } from './helpers';

test("force stay on popup with navigation prevention", async ({ page, context, extensionId }) => {
  let navigationAttempts = 0;
  
  // Prevent navigation at the browser level using context
  await context.addInitScript(() => {
    // Override location changes
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      get: () => originalLocation,
      set: (newLocation) => {
        console.log('Blocked location change to:', newLocation);
        return originalLocation;
      }
    });
    
    // Override history methods
    window.history.pushState = () => console.log('Blocked pushState');
    window.history.replaceState = () => console.log('Blocked replaceState');
    
    // Override window.open
    window.open = () => {
      console.log('Blocked window.open');
      return null;
    };
  });
  
  // Monitor and block server-side redirects
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    
    console.log(`📡 ${request.method()} ${url}`);
    
    // If this is the initial popup request, continue
    if (url.endsWith('/popup.html') && request.method() === 'GET') {
      await route.continue();
    }
    // Block any welcome/onboarding pages
    else if (url.includes('welcome') || url.includes('onboard')) {
      console.log('🚫 Blocked redirect to:', url);
      navigationAttempts++;
      await route.abort();
    }
    // Allow resources (JS, CSS, images)
    else if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf)$/)) {
      await route.continue();
    }
    // Block any other HTML pages
    else if (url.endsWith('.html') && !url.endsWith('/popup.html')) {
      console.log('🚫 Blocked navigation to:', url);
      navigationAttempts++;
      await route.abort();
    }
    else {
      await route.continue();
    }
  });
  
  // Navigate to popup
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('networkidle');
  
  console.log(`\n🎯 Navigation attempts blocked: ${navigationAttempts}`);
  console.log('📍 Final URL:', page.url());
  
  expect(page.url()).toContain('popup.html');
  
  // Optional: pause to inspect
  await page.pause();
});

test("monitor popup with helper", async ({ page, extensionId }) => {
  const requestLog = setupRequestMonitoring(page);
  
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('networkidle');
  
  console.log('\n📊 Request Summary:');
  console.log(`Total requests: ${requestLog.length}`);
  console.log('By type:', requestLog.reduce((acc, req) => {
    acc[req.resourceType] = (acc[req.resourceType] || 0) + 1;
    return acc;
  }, {}));
   await page.pause();
  // Log all requests for debugging
  console.log('\n📝 All requests:');
  requestLog.forEach(req => {
    console.log(`  ${req.method} ${req.url}`);
  });
});