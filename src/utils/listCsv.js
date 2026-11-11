// v1.10.83 (#121) - Products and Clients CSV import, and their sample files.
// Reported: "for import features where are the sample files to fill data".
// Pure functions (no fetch / React), so scripts/csv-test.mjs can import each
// sample back through the same code the screens use. Headings are matched
// loosely (case, spaces, %, / ignored), so the Products export imports back.
import { toCsvLine, trackedStock, isServiceProduct } from '../utils.js';
import { rowsToRecords, toNum, percentPart } from './bulkCsv.js';
import { PART_FIELDS, cataloguePartKey, identifierText } from './catalogueParts.js';

const PRODUCT_FIELDS = {
  name: ['name', 'product', 'product name', 'item', 'item name'],
  type: ['type', 'kind', 'goods or service', 'goods/service'],
  hsn: ['hsn', 'hsn code', 'sac', 'sac code', 'hsn/sac'],
  unit: ['unit'],
  purchasePrice: ['purchase price', 'cost', 'cost price'],
  sellingPrice: ['selling price', 'rate', 'price', 'sale price'],
  taxPercent: ['gst%', 'gst rate', 'tax%', 'tax rate', 'tax', 'taxpercent'],
  stock: ['stock', 'quantity', 'opening stock', 'opening stock quantity', 'opening qty', 'stock quantity'],
  description: ['description'],
  // v1.10.84 (#130) - Vyapar's item file says whether its prices hold the tax.
  taxInclusive: ['tax inclusive', 'tax inclusive (y/n)', 'inclusive of tax'],
  ...PART_FIELDS,
  partTextEncoding: ['Part text encoding'],
};

const CLIENT_FIELDS = {
  name: ['name', 'client', 'client name', 'customer', 'customer name', 'party name', 'party'],
  gstin: ['gstin', 'gst number', 'gst no'],
  phone: ['phone', 'mobile', 'phone number', 'phone no', 'mobile no', 'contact no', 'party phone no'],
  email: ['email', 'email id'],
  address: ['address', 'billing address'],
  state: ['state'],
  country: ['country'],
};

// Already in the list (trimmed name, any case), or a repeat inside the file.
const dedupe = (existing) => {
  const known = new Set((existing || []).map((x) => String(x.name || '').trim().toLowerCase()));
  return (name) => {
    const k = name.toLowerCase();
    if (known.has(k)) return true;
    known.add(k);
    return false;
  };
};

// v1.10.84 (#134) - a saved product with empty details gets them from the
// file; a value already there is never changed. 0 counts as empty for the
// prices, and for GST % only when the product has no HSN either (left so by an
// import that read only the name; an exempt item with its HSN keeps its 0%).
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const FILL = {
  hsn: blank, unit: blank, description: blank, stock: blank,
  ...Object.fromEntries(Object.keys(PART_FIELDS).map(field => [field, blank])),
  purchasePrice: (v) => blank(v) || Number(v) === 0,
  sellingPrice: (v) => blank(v) || Number(v) === 0,
  taxPercent: (v, p) => blank(v) || (Number(v) === 0 && blank(p.hsn)),
};
export function fillBlanks(saved, fresh) {
  const add = {};
  for (const [k, isEmpty] of Object.entries(FILL)) {
    if (isEmpty(saved[k], saved) && !FILL[k](fresh[k], fresh)) add[k] = fresh[k];
  }
  if ('sellingPrice' in add) add.rate = add.sellingPrice; // mirror for older readers
  return Object.keys(add).length ? { ...saved, ...add } : null;
}

// Rows (CSV text or a sheet) -> { products, updates, skipped, errors }. A row
// with a problem is left out and named in errors. A name already saved is not
// added again (importing twice is safe): its empty details are filled in
// (updates), or it is skipped when there is nothing to fill.
export function productsCsvToList(text, existing = []) {
  const { records, unknown } = rowsToRecords(text, PRODUCT_FIELDS, { originalRowNumbers: true });
  const out = { products: [], updates: [], skipped: 0, errors: [] };
  const unsupported = unknown.filter(column => /^(sku|bar[ _-]*code|(?:vehicle[ _-]*)?fitments|locations|unlocated[ _-]*stock|rack[ /_-]*bin[ /_-]*location|rack[ _-]*location|bin[ _-]*location)$/i.test(String(column).trim()));
  if (unsupported.length) {
    out.errors.push(`Unsupported columns: ${unsupported.join(', ')}. Remove them or use an app version with structured fitments and stock locations.`);
    return out;
  }
  const saved = new Map();
  const duplicateNames = new Set();
  const partOwners = new Map();
  for (const product of existing || []) {
    const key = identifierText(product.name);
    if (saved.has(key)) duplicateNames.add(key);
    saved.set(key, product);
    const partKey = cataloguePartKey(product);
    if (partKey && !partOwners.has(partKey)) partOwners.set(partKey, { name: product.name, id: product.id });
  }
  const seen = new Map();
  const partConflict = (a, b) => ['partNo', 'altPartNo', 'brand'].find(field =>
    !blank(a[field]) && !blank(b[field]) && identifierText(a[field]) !== identifierText(b[field]));
  for (const r of records) {
    const name = r.name || '';
    if (!name) { out.errors.push(`Row ${r._line}: Name is required.`); continue; }
    if (r.partTextEncoding) {
      let invalidField = r.partTextEncoding === 'json' ? '' : 'Part text encoding';
      for (const [field, [label]] of Object.entries(PART_FIELDS)) {
        if (invalidField || blank(r[field])) continue;
        try {
          const value = JSON.parse(r[field]);
          if (typeof value !== 'string') throw new Error('Expected text');
          r[field] = value;
        } catch { invalidField = label; }
      }
      if (invalidField) {
        out.errors.push(`Row ${r._line} (${name}): ${invalidField} has invalid CSV text encoding. Re-export the file or enter plain text and clear the encoding cell.`);
        continue;
      }
    }
    const key = identifierText(name);
    const type = String(r.type || '').toLowerCase();
    if (type && !/^(goods?|g|products?|services?|s)$/.test(type)) { out.errors.push(`Row ${r._line} (${name}): Type must be Goods or Service`); continue; }
    const service = type.startsWith('s');
    const nums = { purchasePrice: toNum(r.purchasePrice), sellingPrice: toNum(r.sellingPrice), taxPercent: toNum(percentPart(r.taxPercent)), stock: toNum(r.stock, null) };
    const bad = Object.entries(nums).find(([k, v]) => (k === 'stock' ? v !== null && !Number.isFinite(v) : !Number.isFinite(v)));
    if (bad) { out.errors.push(`Row ${r._line} (${name}): ${bad[0] === 'stock' ? 'stock' : bad[0] === 'taxPercent' ? 'GST %' : 'price'} must be a number`); continue; }
    if (nums.taxPercent < 0 || nums.taxPercent > 100) { out.errors.push(`Row ${r._line} (${name}): GST % must be 0 to 100`); continue; }
    if (duplicateNames.has(key)) { out.errors.push(`Row ${r._line} (${name}): Name matches multiple saved products. Use distinct names before importing.`); continue; }
    const old = saved.get(key);
    const previous = seen.get(key);
    const conflict = partConflict(r, old || {}) || partConflict(r, previous || {});
    if (conflict) { out.errors.push(`Row ${r._line} (${name}): ${PART_FIELDS[conflict][0]} conflicts with another record for this name. Correct the file or edit the saved part directly.`); continue; }
    if (previous) {
      const extraField = Object.keys(PART_FIELDS).find(field => !blank(r[field]) && blank(previous[field]));
      if (extraField) out.errors.push(`Row ${r._line} (${name}): ${PART_FIELDS[extraField][0]} is only set on a repeated row. Combine both rows before importing.`);
      else out.skipped++;
      continue;
    }
    // Our product prices are before tax: take the tax out of an inclusive one.
    if (/^(y|yes|true|1)$/i.test(String(r.taxInclusive || '').trim()) && nums.taxPercent > 0) {
      nums.sellingPrice = Math.round(nums.sellingPrice / (1 + nums.taxPercent / 100) * 100) / 100;
    }
    const product = {
      name,
      ...(service ? { kind: 'service' } : {}),
      hsn: r.hsn || '',
      purchasePrice: nums.purchasePrice,
      sellingPrice: nums.sellingPrice,
      rate: nums.sellingPrice, // mirror for older readers
      taxPercent: nums.taxPercent,
      unit: r.unit || 'Nos',
      // A service has no stock; goods with a blank stock are "not tracked yet".
      ...(!service && nums.stock !== null ? { stock: nums.stock } : {}),
      description: r.description || '',
      ...Object.fromEntries(Object.keys(PART_FIELDS).filter(field => !blank(r[field])).map(field => [field, r[field]])),
    };
    const filled = old && fillBlanks(old, { ...product, unit: r.unit });
    const next = filled || old || product;
    const partKey = cataloguePartKey(next);
    const owner = partOwners.get(partKey);
    if (owner && (!old || owner.id !== old.id)) {
      out.errors.push(`Row ${r._line} (${name}): Part number already belongs to ${owner.name} for this brand. Correct the part number or use the saved product name.`);
      continue;
    }
    if (partKey) partOwners.set(partKey, { name, id: old?.id });
    seen.set(key, next);
    if (!old) { out.products.push(product); continue; }
    if (filled) out.updates.push(filled); else out.skipped++;
  }
  return out;
}

export function clientsCsvToList(text, existing = []) {
  const { records } = rowsToRecords(text, CLIENT_FIELDS);
  const seen = dedupe(existing);
  const out = { clients: [], skipped: 0, errors: [] };
  for (const r of records) {
    const name = r.name || '';
    if (!name) continue;
    if (seen(name)) { out.skipped++; continue; }
    out.clients.push({ name, address: r.address || '', state: r.state || '', gstin: (r.gstin || '').toUpperCase(), email: r.email || '', phone: r.phone || '', ...(r.country ? { country: r.country } : {}) });
  }
  return out;
}

// Sample files (demo data, not real businesses) for "Download sample file".
export const PRODUCT_EXPORT_HEADERS = [
  'Name', 'Type', 'HSN/SAC', 'Unit', 'Purchase Price', 'Selling Price', 'GST %', 'Stock', 'Description',
  ...Object.values(PART_FIELDS).map(([label]) => label),
];
export const productExportRow = p => [
  p.name, isServiceProduct(p) ? 'Service' : 'Goods', p.hsn || '', p.unit || '',
  p.purchasePrice ?? '', p.sellingPrice ?? p.rate ?? '', p.taxPercent ?? '', trackedStock(p) ?? '', p.description || '',
  ...Object.keys(PART_FIELDS).map(field => p[field] ?? ''),
];

// Spreadsheet-safe CSV cannot emit formula-like part text as raw cells.
// Mark rows that use JSON text so import can recover the original characters.
export function serializeProductCsv(rows) {
  const firstPartColumn = PRODUCT_EXPORT_HEADERS.length - Object.keys(PART_FIELDS).length;
  const needsEncoding = row => row.slice(firstPartColumn).some(value => /^[=+\-@\t\r]/.test(value));
  if (!rows.some(needsEncoding)) return [PRODUCT_EXPORT_HEADERS, ...rows].map(toCsvLine).join('\n');
  const escaped = rows.map(row => needsEncoding(row) ? [
    ...row.slice(0, firstPartColumn), ...row.slice(firstPartColumn).map(value => value === '' ? '' : JSON.stringify(String(value))), 'json',
  ] : [...row, '']);
  return [[...PRODUCT_EXPORT_HEADERS, 'Part text encoding'], ...escaped].map(toCsvLine).join('\n');
}

export const PRODUCTS_SAMPLE = [
  toCsvLine(PRODUCT_EXPORT_HEADERS),
  toCsvLine(['Demo Brake Pad Set', 'Goods', '87083000', 'Set', 220, 280, 18, 50, 'Replace this sample with your part', 'DEMO-001', 'ALT-001; ALT-002', 'Example Brand', 'Braking', 'Example make / model / engine']),
  toCsvLine(['Demo Printing service', 'Service', '998912', 'Page', '', 5, 18, '', 'Sample service row - a service has no stock']),
].join('\n');

export const CLIENTS_SAMPLE = [
  toCsvLine(['Name', 'GSTIN', 'Phone', 'Email', 'Address', 'State']),
  toCsvLine(['Demo Traders', '27AAAAA0000A1Z5', '9800000001', 'accounts@demo-traders.example', 'Shop 4, Demo Market, Pune', 'Maharashtra']),
  toCsvLine(['Sample Studio', '', '9800000002', 'hello@sample-studio.example', '12 Sample Street, Kolkata', 'West Bengal']),
].join('\n');
