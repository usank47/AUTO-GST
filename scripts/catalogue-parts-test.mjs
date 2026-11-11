import assert from 'node:assert/strict';
import { buildXlsx } from '../src/utils/xlsx.js';
import { readXlsx } from '../src/utils/xlsxRead.js';
import { trackedStock } from '../src/utils.js';
import { matchCatalogueProduct, cataloguePartKey, partFieldError } from '../src/utils/catalogueParts.js';
import { PRODUCT_EXPORT_HEADERS, productExportRow, productsCsvToList, serializeProductCsv } from '../src/utils/listCsv.js';

const part = {
  id: 'pad-1', name: 'Front brake pad', kind: 'goods', hsn: '87083000', unit: 'Set',
  purchasePrice: 150, sellingPrice: 280, taxPercent: 18, stock: 5, description: 'Front axle',
  partNo: '0001-A', altPartNo: 'ALT-1; ALT-2, rev. B', brand: 'Example',
  category: 'Braking', compatibility: 'Swift petrol 1.2; Baleno petrol 1.2',
};
for (const query of ['BRAKE pad', '0001-a', 'alt-2', 'example', 'braking', 'swift 1.2', '87083000']) {
  assert.ok(matchCatalogueProduct(part, query), `Search finds ${query}`);
}
assert.ok(!matchCatalogueProduct(part, 'diesel'));
assert.ok(matchCatalogueProduct({ name: 'Legacy', stock: 2 }, 'legacy'));
assert.equal(trackedStock({ name: 'Legacy', stock: 2 }), 2);
assert.equal(cataloguePartKey(part), cataloguePartKey({ partNo: '0001-a', brand: 'EXAMPLE' }));
assert.equal(partFieldError(part), '');
assert.match(partFieldError({ partNo: [] }), /Part number/);

const rows = [PRODUCT_EXPORT_HEADERS, productExportRow(part)];
const csv = serializeProductCsv(rows.slice(1));
const xlsx = readXlsx(buildXlsx(rows, 'Products'))[0].rows;
for (const input of [csv, xlsx]) {
  const result = productsCsvToList(input);
  assert.deepEqual(result.errors, []);
  assert.equal(result.products.length, 1);
  assert.deepEqual(productExportRow(result.products[0]), productExportRow(part));
  assert.equal(productsCsvToList(input, [part]).skipped, 1);
}
const signed = { ...part, partNo: '+001A', altPartNo: '-AB-2' };
const signedCsv = serializeProductCsv([productExportRow(signed)]);
assert.match(signedCsv, /Part text encoding/);
assert.equal(productsCsvToList(signedCsv).products[0].partNo, signed.partNo);
assert.equal(productsCsvToList(signedCsv).products[0].altPartNo, signed.altPartNo);

const legacy = { id: 'old', name: 'Front brake pad', stock: 9, unit: 'Box', brand: 'Example' };
const fill = productsCsvToList('Name,Part number,Brand,Stock,Unit\nFront brake pad,0001-A,,,', [legacy]);
assert.deepEqual(fill.updates, [{ ...legacy, partNo: '0001-A' }]);
assert.deepEqual(fill.errors, []);

const conflicting = productsCsvToList('Name,Part number,Brand\nDifferent name,0001-a,example\nFront brake pad,OTHER,Example', [part]);
assert.equal(conflicting.products.length, 0);
assert.equal(conflicting.updates.length, 0);
assert.match(conflicting.errors[0], /Row 2.*Part number already belongs/);
assert.match(conflicting.errors[1], /Row 3.*Part number conflicts/);
assert.equal(productsCsvToList('Name,Part number,Brand\nDifferent brand,0001-A,Other', [part]).products.length, 1);
assert.match(productsCsvToList('Name,Part number\nNew part,P-1\nNew part,P-2').errors[0], /Row 3.*conflicts/);
assert.match(productsCsvToList('Name,Part number\n\n,P-1').errors[0], /Row 3: Name is required/);
assert.match(productsCsvToList('Name,Locations\nPad,anything').errors[0], /Unsupported columns: Locations/);
assert.match(productsCsvToList('Name,Part number\nSame,P-1', [{ id: 'a', name: 'Same' }, { id: 'b', name: 'Same' }]).errors[0], /multiple saved products/);
console.log('Catalogue search, CSV and XLSX round trips, legacy updates, and conflicts passed.');
