// Isolated browser test: API requests are mocked; no business files are touched.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge' } : {});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  const profile = { businessName: 'Shortcut Test Parts', state: 'Delhi', country: 'India', gstin: '07AAAAA0000A1Z5' };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    let body = [];
    if (url.pathname === '/api/profile') body = profile;
    else if (url.pathname === '/api/profiles') body = [{ id: 'test', ...profile }];
    else if (url.pathname === '/api/lock') body = { enabled: false };
    else if (url.pathname === '/api/local-prefs' || url.pathname.startsWith('/api/meta/')) body = { value: null };
    else if (url.pathname === '/api/check-update') body = { updateAvailable: false };
    await route.fulfill({ json: body });
  });
  await page.addInitScript(() => {
    localStorage.setItem('gst_printSettings', JSON.stringify({ onboardingComplete: true }));
    localStorage.setItem('freegstbill_onboarded', '1');
    localStorage.setItem('gst_offlineMode', '1');
  });
  await page.goto(origin);
  await page.locator('.main-content').waitFor();
  const view = () => page.evaluate(() => sessionStorage.getItem('gst_currentView'));
  const press = async key => {
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press(key);
  };
  const waitView = id => page.waitForFunction(expected => sessionStorage.getItem('gst_currentView') === expected, id);
  await press('F1');
  await page.getByRole('dialog', { name: 'Keyboard shortcuts' }).waitFor();
  await page.keyboard.press('F8');
  assert.equal(await view(), 'dashboard', 'Dialog must block navigation');
  await page.keyboard.press('Escape');
  await press('Shift+Digit2');
  await waitView('inventory');
  const search = page.locator('[data-shortcut-search]');
  await search.waitFor();
  await press('F3');
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  await search.fill('brake pads');
  await page.keyboard.press('F8');
  assert.equal(await view(), 'inventory', 'Typing field must block navigation');
  await press('F9'); await waitView('purchases');
  await page.locator('[data-shortcut-search]').waitFor();
  await press('F6'); await waitView('receipts');
  await press('F8'); await waitView('new');
  await page.getByPlaceholder('Item', { exact: true }).first().waitFor();
  const items = page.getByPlaceholder('Item', { exact: true });
  const count = await items.count();
  await page.keyboard.press('Control+Enter');
  await page.waitForFunction(expected => document.querySelectorAll('[placeholder="Item"]').length === expected, count + 1);
  await press('F1');
  await page.getByRole('dialog', { name: 'Keyboard shortcuts' }).waitFor();
  await page.keyboard.press('Control+Enter');
  assert.equal(await items.count(), count + 1, 'Invoice actions must not fire behind help');
  await page.keyboard.press('Escape');
  await items.first().fill('Brake pads');
  await press('F9');
  await page.getByRole('heading', { name: 'Unsaved changes' }).waitFor();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  assert.equal(await view(), 'new');
  await press('F9');
  await page.getByRole('button', { name: 'Discard & leave' }).click();
  await waitView('purchases');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Browser shortcuts passed: navigation, search focus, typing/dialog guards, add row, unsaved invoice cancel/discard.');
} finally {
  await browser?.close();
  await server.close();
}
