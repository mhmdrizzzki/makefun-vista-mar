// Print boot diagnostics from the real browser without hiding a failure behind a readiness timeout.
import { launchBrowser, GAME_URL } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', message => console.log(`browser ${message.type()}: ${message.text()}`));
  page.on('pageerror', error => console.error(`PAGE ERROR: ${error.stack}`));
  await page.goto(GAME_URL + (process.argv[2] || '?seed=16'));
  await page.waitForTimeout(2500);
  console.log(await page.evaluate(() => ({ loading: document.getElementById('loading').textContent,
    modules: window.VM?.modules, installers: window.VM?.installers?.length,
    game: window.__VISTA_MAR__?.snapshot() })));
} finally { await browser.close(); }
