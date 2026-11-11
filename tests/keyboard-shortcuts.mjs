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
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  const profile = { businessName: 'Shortcut Test Parts', state: 'Delhi', country: 'India', gstin: '07AAAAA0000A1Z5' };
  let defaultTermsId = '';
  let products = [
    { id: 'pads', name: 'Brake pads', hsn: '87083000', stock: 2, sellingPrice: 500 },
    { id: 'filter', name: 'Air filter', hsn: '84213100', stock: 0, sellingPrice: 300 },
    { id: 'service', name: 'Fitting service', kind: 'service', stock: 0 },
  ];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    let body = [];
    if (url.pathname === '/api/profile') body = profile;
    else if (url.pathname === '/api/profiles') body = [{ id: 'test', ...profile }];
    else if (url.pathname === '/api/products') {
      if (route.request().method() === 'POST') {
        const product = route.request().postDataJSON();
        product.id ||= 'new-part';
        products = [...products.filter(p => p.id !== product.id), product];
        body = { id: product.id };
      } else body = products;
    }
    else if (url.pathname === '/api/lock') body = { enabled: false };
    else if (url.pathname === '/api/templates') body = [
      { id: 'standard', name: 'Standard', content: 'Standard test terms' },
      { id: 'parts', name: 'Parts sales', content: '<p>Parts sales test terms</p>' },
    ];
    else if (url.pathname === '/api/meta/defaultTermsTemplateId') {
      if (route.request().method() === 'POST') defaultTermsId = route.request().postDataJSON().value;
      body = { value: defaultTermsId };
    } else if (url.pathname === '/api/local-prefs' || url.pathname.startsWith('/api/meta/')) body = { value: null };
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
  await page.getByRole('button', { name: 'Search invoices, clients and parts' }).click();
  await page.keyboard.press('Escape');
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
  await page.getByRole('cell', { name: 'Brake pads', exact: true }).waitFor();
  const stockFilter = page.getByRole('combobox', { name: 'Stock status' });
  await stockFilter.selectOption('out');
  await page.getByRole('cell', { name: 'Air filter', exact: true }).waitFor();
  assert.equal(await page.locator('.catalogue-workspace tbody tr').count(), 1, 'Service stock must not count as out of stock');
  await stockFilter.selectOption('all');
  await press('F3');
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  await search.fill('brake pads');
  await page.keyboard.press('F8');
  assert.equal(await view(), 'inventory', 'Typing field must block navigation');
  await search.fill('');
  await page.getByRole('button', { name: 'Add Product', exact: true }).click();
  const form = page.locator('.modal-content');
  await form.locator('input').first().fill('New automotive part');
  await form.getByLabel('Part number', { exact: true }).fill('OEM-012');
  await form.getByLabel('Alternate part number', { exact: true }).fill('ALT-1; ALT-2');
  await form.getByLabel('Brand', { exact: true }).fill('Example brand');
  await form.getByLabel('Vehicle compatibility', { exact: true }).fill('Swift petrol 1.2');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await search.fill('ALT-2');
  const newRow = page.locator('.catalogue-workspace tbody tr').filter({ hasText: 'New automotive part' });
  await newRow.waitFor();
  await newRow.getByRole('button', { name: 'Edit' }).click();
  assert.equal(await form.getByLabel('Part number', { exact: true }).inputValue(), 'OEM-012');
  await form.getByLabel('Vehicle compatibility', { exact: true }).fill('Baleno petrol 1.2');
  await form.getByRole('button', { name: 'Update' }).click();
  await newRow.getByText('Baleno petrol 1.2').waitFor();
  await page.getByRole('combobox', { name: 'Brand', exact: true }).selectOption('Example brand');
  const fitment = page.getByRole('searchbox', { name: 'Vehicle compatibility' });
  await fitment.fill('diesel');
  await newRow.waitFor({ state: 'hidden' });
  await fitment.fill('Baleno');
  await newRow.waitFor();
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await page.locator('.modal-content input[type=file]').setInputFiles({
    name: 'conflicting-parts.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Name,Part number,Brand\nGood part,P-3,Example brand\nDifferent name,OEM-012,Example brand'),
  });
  await page.getByText(/Import blocked/).waitFor();
  assert.ok(await page.getByRole('button', { name: 'Import 1', exact: true }).isDisabled());
  assert.ok(!products.some(p => p.name === 'Good part'), 'A valid row was not committed from a file with errors');
  await page.locator('.modal-content').getByRole('button', { name: 'Close', exact: true }).last().click();
  await press('F9'); await waitView('purchases');
  await page.locator('[data-shortcut-search]').waitFor();
  await press('F6'); await waitView('receipts');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const defaultTerms = page.getByLabel('Default terms for new invoices');
  await defaultTerms.selectOption('parts');
  await page.getByText('Default invoice terms saved', { exact: true }).waitFor();
  await press('F8'); await waitView('new');
  await page.getByRole('region', { name: 'Invoice totals' }).waitFor();
  await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('gst_invoiceDraft') || '{}').customTerms === '<p>Parts sales test terms</p>');
  assert.equal(await page.locator('.generator-container .rich-editor').getByRole('textbox', { name: 'Template content' }).count(), 0);
  const toolbar = await page.locator('.invoice-command-row').evaluate(row => {
    const title = row.querySelector('h1').getBoundingClientRect();
    const actions = [...row.querySelectorAll('.generator-actions .btn')].map(button => button.getBoundingClientRect());
    return {
      singleRow: actions.length > 0 && actions.every(button => Math.abs(button.y + button.height / 2 - title.y - title.height / 2) < 2),
      fits: row.scrollWidth <= row.clientWidth + 1,
    };
  });
  assert.deepEqual(toolbar, { singleRow: true, fits: true }, 'The invoice title and all toolbar actions fit in one row at desktop width');
  const customerCard = await page.locator('#invoice-customer').boundingBox();
  const invoiceCard = await page.locator('#invoice-details').boundingBox();
  assert.ok(customerCard && invoiceCard && Math.abs(customerCard.y - invoiceCard.y) < 2 && invoiceCard.x > customerCard.x, 'Invoice details and customer cards should sit side by side at desktop width');
  if (process.env.AUTO_GST_INVOICE_SCREENSHOT) {
    await page.getByText('Default invoice terms saved', { exact: true }).waitFor({ state: 'hidden' });
    await page.locator('.sidebar').evaluate(sidebar => { sidebar.scrollTop = 0; });
    await page.screenshot({ path: process.env.AUTO_GST_INVOICE_SCREENSHOT });
  }
  await page.getByRole('navigation', { name: 'Invoice sections' }).getByRole('button', { name: 'Line items' }).click();
  await page.locator('#invoice-items').locator('h3').first().waitFor();
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
