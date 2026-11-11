import test from 'node:test';
import assert from 'node:assert/strict';
import { computeInvoiceTotals, nextCounterValue, formatDocNumber } from '../src/utils.js';
import { buildSampleInvoice } from '../src/utils/printSettings.js';

test('nextCounterValue increments existing counter or honours start', () => {
  assert.equal(nextCounterValue(0, 100), 100);
  assert.equal(nextCounterValue(5, 1), 6);
  assert.equal(nextCounterValue(105, 100), 106);
});

test('formatDocNumber formats sequential GST invoice numbers', () => {
  const num = formatDocNumber({
    settings: { format: 'sequential', prefix: 'INV', separator: '/', padding: 4, showFinYear: true },
    typePrefix: 'INV',
    next: 7,
    fyLabel: '2026-27',
  });
  assert.equal(num, 'INV/2026-27/0007');
});

test('computeInvoiceTotals calculates intra-state CGST + SGST accurately', () => {
  const totals = computeInvoiceTotals({
    items: [{ name: 'Consulting', quantity: 2, rate: 1000, discount: 0, taxPercent: 18 }],
    profile: { country: 'India', state: 'Maharashtra' },
    client: { state: 'Maharashtra' },
    details: { placeOfSupply: 'Maharashtra' },
    showGST: true,
  });
  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.cgst, 180);
  assert.equal(totals.sgst, 180);
  assert.equal(totals.igst, 0);
  assert.equal(totals.total, 2360);
});

test('buildSampleInvoice items all have defined, unique IDs for React list keys', () => {
  const sample = buildSampleInvoice();
  assert.ok(Array.isArray(sample.items) && sample.items.length > 0);
  const ids = sample.items.map((it) => it.id);
  assert.ok(ids.every((id) => typeof id === 'string' && id.length > 0));
  assert.equal(new Set(ids).size, ids.length);
});
