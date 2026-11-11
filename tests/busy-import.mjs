import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge' } : {});
  const page = await browser.newPage();
  await page.route(`${origin}/busy-import-test`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>BUSY import test</title>' }));
  await page.goto(`${origin}/busy-import-test`);
  const fixture = await page.evaluate(async () => {
    const { parseBusyFile, busyMasterRows, busyVoucherPlan } = await import('/utils/busyImport.js');
    const { fileToSheets } = await import('/utils/importFile.js');
    const { productsCsvToList, clientsCsvToList } = await import('/utils/listCsv.js');
    const tax = '<BSDetail><BSName>CGST</BSName><Amt>9</Amt></BSDetail><BSDetail><BSName>SGST</BSName><Amt>9</Amt></BSDetail>';
    const common = `<VchNo>S-1</VchNo><Date>01-04-2026</Date><MasterName1>Example party</MasterName1><TranCurName>Rs.</TranCurName>
      <BillingDetails><tmpStateName>Rajasthan</tmpStateName></BillingDetails><tmpTotalAmt>118</tmpTotalAmt><tmpSalePurcAmt>100</tmpSalePurcAmt>
      <ItemEntries><ItemDetail><ItemName>Example part</ItemName><ItemHSNCode>87083000</ItemHSNCode><Qty>2</Qty><UnitName>Set</UnitName><NettAmount>100</NettAmount><ItemTaxCategory>GST 18%</ItemTaxCategory></ItemDetail></ItemEntries>`;
    const file = `<BusyData FinYear="01-04-2026"><Items><Item><Name>Example part</Name><Alias>001-A</Alias><ParentGroup>Braking</ParentGroup><MainUnit>Set</MainUnit><TaxRateCentral>18</TaxRateCentral><OPStockInMainUnit>17</OPStockInMainUnit></Item></Items>
      <Accounts><Account><Name>Example party</Name><ParentGroup>Sundry Debtors</ParentGroup><Address><CountryName>India</CountryName><Mobile>9000000000</Mobile></Address></Account><Account><Name>Tax</Name><ParentGroup>Duties &amp; Taxes</ParentGroup></Account></Accounts>
      <Sales><Sale>${common}<BillSundries>${tax}</BillSundries><AccEntries><AccDetail><tmpGroupName>Cash-in-hand</tmpGroupName><AmountType>1</AmountType><AmtMainCur>118</AmtMainCur></AccDetail></AccEntries></Sale>
      <Sale>${common.replace('S-1', 'S-2').replace('>118<', '>119<')}<BillSundries>${tax}</BillSundries></Sale></Sales>
      <Purcs><Purchase>${common}<VchOtherInfoDetails><PurchaseBillNo>P-1</PurchaseBillNo><PurchaseBillDate>01-04-2026</PurchaseBillDate></VchOtherInfoDetails><BillSundries>${tax}</BillSundries></Purchase></Purcs></BusyData>`;
    const root = parseBusyFile(new TextEncoder().encode(file));
    const profile = { businessName: 'Test company', state: 'Rajasthan', country: 'India' };
    const sales = busyVoucherPlan(root, 'sales', { profile });
    const purchases = busyVoucherPlan(root, 'purchase', { profile });
    const duplicate = busyVoucherPlan(root, 'sales', { profile, existingIds: new Set(['S-1']) });
    let invalid = 0;
    for (const content of ['binary backup', '<BusyData><Invalid></BusyData>', '<!DOCTYPE BusyData><BusyData/>']) {
      try { parseBusyFile(new TextEncoder().encode(content)); } catch { invalid++; }
    }
    return { product: productsCsvToList(busyMasterRows(root, 'products')).products[0], clients: clientsCsvToList(busyMasterRows(root, 'clients')).clients,
      sales, purchases, duplicate, invalid, routed: (await fileToSheets(new File([file], 'example.DAT'), 'products'))[0].busy };
  });
  assert.equal(fixture.product.partNo, '001-A');
  assert.equal(fixture.product.taxPercent, 18);
  assert.ok(!('stock' in fixture.product));
  assert.deepEqual(fixture.clients.map(c => [c.name, c.country]), [['Example party', 'India']]);
  assert.equal(fixture.sales.bills.length, 1);
  assert.equal(fixture.sales.bills[0].payments[0].mode, 'cash');
  assert.equal(fixture.sales.bills[0].totalAmount, 118);
  assert.deepEqual(fixture.sales.bills[0].data.stockApplied, {});
  assert.match(fixture.sales.errors[0], /do not reconcile/);
  assert.deepEqual(fixture.duplicate.skipped, ['S-1']);
  assert.equal(fixture.purchases.purchases.length, 1);
  assert.equal(fixture.purchases.purchases[0].invoiceNumber, 'P-1');
  assert.equal(fixture.purchases.purchases[0].inventoryExcluded, true);
  assert.equal(fixture.invalid, 3);
  assert.equal(fixture.routed, true);
  console.log('BUSY fixture checks passed.');

  const samplePaths = JSON.parse(process.env.BUSY_TEST_FILES || '[]');
  for (const [index, path] of samplePaths.entries()) {
    const bytes = Array.from(await readFile(path));
    const counts = await page.evaluate(async bytes => {
      const { parseBusyFile, busyMasterRows, busyVoucherPlan } = await import('/utils/busyImport.js');
      const { productsCsvToList, clientsCsvToList } = await import('/utils/listCsv.js');
      const root = parseBusyFile(new Uint8Array(bytes));
      const products = productsCsvToList(busyMasterRows(root, 'products'));
      const clients = clientsCsvToList(busyMasterRows(root, 'clients'));
      const profile = { businessName: 'Test company', state: 'Rajasthan', country: 'India' };
      const sales = busyVoucherPlan(root, 'sales', { profile });
      const purchases = busyVoucherPlan(root, 'purchase', { profile });
      const reasons = list => list.reduce((acc, entry) => {
        const reason = /AUTO-GST totals differ/.test(entry) ? 'app totals differ'
          : /do not reconcile/.test(entry) ? 'source totals differ'
          : /state/.test(entry) ? 'state mismatch' : /no .* vouchers/.test(entry) ? 'no vouchers' : 'other';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
      return { products: products.products.length, productErrors: products.errors.length, clients: clients.clients.length,
        sales: sales.bills.length, salesExcluded: reasons(sales.errors), purchases: purchases.purchases.length, purchasesExcluded: reasons(purchases.errors) };
    }, bytes);
    assert.ok(counts.products > 0 && counts.clients > 0 && counts.productErrors === 0);
    if (index === 1) assert.ok(counts.sales > 0 && counts.purchases > 0);
    console.log(`BUSY sample ${index + 1}: ${JSON.stringify(counts)}`);
  }
} finally {
  await browser?.close();
  await server.close();
}
