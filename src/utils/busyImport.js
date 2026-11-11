import { SALES_COLUMNS, PURCHASE_COLUMNS, salesCsvToBills, purchaseCsvToRecords, toIsoDate } from './bulkCsv.js';
import { purchaseTotals } from './purchaseOrders.js';
import { getStateCode, splitPurchaseTax } from '../utils.js';

const children = (node, tag) => [...(node?.children || [])].filter(child => child.tagName === tag);
const child = (node, tag) => children(node, tag)[0];
const text = (node, tag) => child(node, tag)?.textContent.trim() || '';
const list = (node, group, tag) => children(child(node, group), tag);
const number = (node, tag) => text(node, tag) === '' ? NaN : Number(text(node, tag));
const money = value => Math.round((value + Number.EPSILON) * 100);
const sameMoney = (a, b) => Number.isFinite(a) && Number.isFinite(b) && money(a) === money(b);
const addressOf = node => ['Address1', 'Address2', 'Address3', 'Address4', 'PINCode'].map(tag => text(node, tag)).filter(Boolean).join(', ');

export function parseBusyFile(bytes) {
  const utf8 = new TextDecoder().decode(bytes);
  // BUSY exports can declare ISO-8859-1 even when there is no BOM.
  const xml = /<\?xml[^>]*encoding\s*=\s*['"](?:iso-?8859-1|windows-1252)['"]/i.test(utf8.slice(0, 240))
    ? new TextDecoder('windows-1252').decode(bytes) : utf8;
  if (!/^\s*(?:<\?xml[^?]*\?>\s*)?<BusyData(?:\s|>)/.test(xml)) {
    throw new Error('Choose a BUSY XML data export (.DAT), not a company backup or another file. In BUSY use Administration → Data Export Import → Data Export/Import XML.');
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('This BUSY file contains unsupported XML declarations. Export it again from BUSY.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.tagName !== 'BusyData') {
    throw new Error('The BUSY export has invalid XML. Export it again from BUSY.');
  }
  return doc.documentElement;
}

export function busyMasterRows(root, kind) {
  if (kind === 'clients') {
    const accounts = list(root, 'Accounts', 'Account');
    const parties = accounts.filter(account => /^sundry\s+(?:debtors|creditors)$/i.test(text(account, 'ParentGroup')));
    if (!parties.length) throw new Error('No customer or supplier accounts found. Choose a BUSY export with account masters.');
    return [['Name', 'GSTIN', 'Phone', 'Email', 'Address', 'State', 'Country'], ...parties.map(account => {
      const address = child(account, 'Address');
      return [text(account, 'Name'), text(address, 'GSTNo'), text(address, 'Mobile') || text(address, 'TelNo'),
        text(address, 'Email'), addressOf(address), text(address, 'StateName'), text(address, 'CountryName')];
    })];
  }
  const items = list(root, 'Items', 'Item');
  if (!items.length) throw new Error('No item masters found. Choose a BUSY export with item masters.');
  return [['Name', 'HSN/SAC', 'Unit', 'Purchase Price', 'Selling Price', 'GST %', 'Part number', 'Category'], ...items.map(item => {
    const hsn = text(item, 'HSNCodeGST') || text(item, 'HSNCode');
    const gst = text(item, 'TaxRateCentral') || (/^(?:GST\s*)?([\d.]+)\s*%$/i.exec(text(item, 'TaxCategory'))?.[1] || '');
    return [text(item, 'Name'), hsn, text(item, 'MainUnit'), text(item, 'PurchasePrice'), text(item, 'SalePrice') || text(item, 'SalesPrice'), gst,
      text(item, 'Alias'), text(item, 'ParentGroup')];
  })];
}

function readVoucher(voucher, sales, profile) {
  const billing = child(voucher, 'BillingDetails');
  const other = child(voucher, 'VchOtherInfoDetails');
  const invoiceNumber = sales ? text(voucher, 'VchNo') : text(other, 'PurchaseBillNo');
  const date = toIsoDate(sales ? text(voucher, 'Date') : text(other, 'PurchaseBillDate') || text(voucher, 'Date'));
  const name = text(voucher, 'MasterName1') || text(billing, 'PartyName');
  const gstin = text(billing, 'GSTNo');
  const state = text(billing, 'tmpStateName');
  const currency = text(voucher, 'TranCurName');
  if (!invoiceNumber || !date || !name) throw new Error('Missing invoice number, date or party name.');
  if (currency && !/^(?:Rs\.?|INR|₹)$/i.test(currency)) throw new Error('Only INR vouchers are supported.');
  if (/\b(?:cancelled|canceled)\b/i.test(text(voucher, 'Status')) || /^(?:1|true|yes)$/i.test(text(voucher, 'Cancelled'))) throw new Error('Cancelled voucher.');

  const source = { cgst: 0, sgst: 0, igst: 0, rounding: 0, taxable: number(voucher, 'tmpSalePurcAmt'), total: number(voucher, 'tmpTotalAmt') };
  for (const sundry of list(voucher, 'BillSundries', 'BSDetail')) {
    const label = text(sundry, 'BSName');
    const amount = number(sundry, 'Amt');
    if (!Number.isFinite(amount)) throw new Error('Invalid charge amount.');
    if (amount === 0) continue;
    if (/^(cgst|sgst|igst)$/i.test(label)) source[label.toLowerCase()] += amount;
    else if (/^rounded? off\s*\([+-]\)$/i.test(label)) source.rounding += label.includes('(-)') ? -Math.abs(amount) : Math.abs(amount);
    else if (!/^discount$/i.test(label)) throw new Error(`Unsupported voucher charge: ${label || 'unnamed charge'}.`);
  }
  const interstate = source.igst !== 0 || /^central/i.test(text(voucher, 'STPTName'));
  const home = getStateCode(profile.state || profile.gstin);
  const destination = getStateCode(state || gstin);
  if (!home) throw new Error('Set the active company’s state in Settings before importing vouchers.');
  if ((destination && (home !== destination) !== interstate) || (interstate && !destination)) {
    throw new Error('The BUSY tax type does not match the party state and active company state.');
  }
  const items = list(voucher, 'ItemEntries', 'ItemDetail').map(item => {
    const quantity = number(item, 'Qty');
    const amount = number(item, 'NettAmount');
    const category = text(item, 'ItemTaxCategory');
    const rateText = /^(?:GST\s*)?([\d.]+)\s*%$/i.exec(category)?.[1];
    const tax = rateText === undefined ? NaN : Number(rateText);
    if (!text(item, 'ItemName') || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(tax) || tax < 0 || tax > 100) {
      throw new Error('An item has a missing name, invalid quantity or amount, or unsupported tax category.');
    }
    return { name: text(item, 'ItemName'), hsn: text(item, 'ItemHSNCode'), unit: text(item, 'UnitName'), quantity, rate: amount / quantity, tax };
  });
  if (!items.length || !sameMoney(items.reduce((sum, item) => sum + item.quantity * item.rate, 0), source.taxable)
    || !sameMoney(source.taxable + source.cgst + source.sgst + source.igst + source.rounding, source.total)) {
    throw new Error('Item amounts, taxes and rounding do not reconcile to the BUSY voucher total.');
  }
  const due = toIsoDate(text(child(child(child(voucher, 'PendingBillDetails'), 'BillDetail'), 'BillRefs'), 'DueDate'));
  const rows = items.map(item => sales ? [invoiceNumber, date, 'Tax Invoice', due, name, gstin, state, addressOf(billing), 'India', state,
    item.name, item.hsn, item.quantity, item.unit, item.rate, 0, item.tax, 0, 'No', '', '', source.rounding !== 0 ? 'Yes' : 'No']
    : [invoiceNumber, date, name, gstin, addressOf(billing), item.name, item.hsn, item.quantity, item.rate, item.tax, 0, interstate ? 'Yes' : 'No', 'Unpaid', '']);
  return { invoiceNumber, source, rows, items, interstate, cash: sales && list(voucher, 'AccEntries', 'AccDetail').some(entry =>
    text(entry, 'tmpGroupName') === 'Cash-in-hand' && text(entry, 'AmountType') === '1' && sameMoney(number(entry, 'AmtMainCur'), source.total)) };
}

export function busyVoucherPlan(root, kind, { profile = {}, existing = [], existingIds = new Set(), clients = [] } = {}) {
  const sales = kind === 'sales';
  const vouchers = sales ? list(root, 'Sales', 'Sale') : list(root, 'Purcs', 'Purchase');
  const bills = [], purchases = [], errors = [], skipped = [], newClients = new Map();
  const seenIds = new Set(existingIds);
  const seenPurchases = [...existing];
  for (const voucher of vouchers) {
    const label = text(voucher, 'VchNo') || '(unnumbered)';
    try {
      const { invoiceNumber, source, rows, items, interstate, cash } = readVoucher(voucher, sales, profile);
      if (sales) {
        const result = salesCsvToBills([SALES_COLUMNS, ...rows], { profile, existingIds: seenIds, clients,
          received: cash ? new Map([[invoiceNumber, source.total]]) : null });
        if (result.skipped.length) { skipped.push(...result.skipped); continue; }
        if (result.errors.length) throw new Error(result.errors[0]);
        const bill = result.bills[0];
        const { totals } = bill.data;
        if (!sameMoney(totals.total, source.total) || !['taxableAmount', 'cgst', 'sgst', 'igst'].every(key => sameMoney(totals[key], source[key === 'taxableAmount' ? 'taxable' : key]))) {
          throw new Error('AUTO-GST totals differ from BUSY. Review this voucher separately.');
        }
        if (cash) bill.payments = bill.payments.map(payment => ({ ...payment, mode: 'cash', note: 'Cash sale in BUSY' }));
        bills.push(bill);
        seenIds.add(bill.id);
        result.newClients.forEach(client => newClients.set(client.gstin || client.name.toLowerCase(), client));
      } else {
        const result = purchaseCsvToRecords([PURCHASE_COLUMNS, ...rows], { profile, existing: seenPurchases });
        if (result.skipped.length) { skipped.push(...result.skipped); continue; }
        if (result.errors.length) throw new Error(result.errors[0]);
        const purchase = result.purchases[0];
        purchase.items.forEach((item, index) => { item.unit = items[index].unit; });
        const totals = purchaseTotals(purchase.items, source.rounding !== 0);
        const split = splitPurchaseTax(totals.tax, interstate);
        if (!sameMoney(totals.finalTotal, source.total) || !sameMoney(totals.taxable, source.taxable)
          || !['cgst', 'sgst', 'igst'].every(key => sameMoney(split[key], source[key]))) {
          throw new Error('AUTO-GST totals differ from BUSY. Review this voucher separately.');
        }
        Object.assign(purchase, { totalAmount: source.total, totalTax: totals.tax, taxableAmount: totals.taxable, applyRoundOff: source.rounding !== 0, roundOff: totals.roundOff, inventoryExcluded: true });
        purchases.push(purchase);
        seenPurchases.push(purchase);
      }
    } catch (error) { errors.push(`BUSY voucher ${label}: ${error.message}`); }
  }
  const warnings = [`Importing into ${profile.businessName || 'the active company'}. BUSY vouchers leave inventory unchanged. Receipts, payments and journals are excluded. Vouchers start unpaid unless a sales voucher shows a full cash sale. Review balances after import.`];
  if (!vouchers.length) errors.push(`This BUSY file has no ${sales ? 'sales' : 'purchase'} vouchers.`);
  return { bills, purchases, errors, skipped, warnings, newClients: [...newClients.values()] };
}
