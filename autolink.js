const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  // Create pages, interact with UI elements, assert values
  const page = await browser.newPage();
  await page.goto('https://www.google.com/');
  await page.screenshot({ path: `node_modules/example.png` });
  await browser.close();
})();