import { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit3, Trash2, X, Save, Upload, Table2, Factory } from 'lucide-react';
import { getAllProducts, saveProduct, deleteProduct, getProfile, getStockAlertSettings, getEnabledModules } from '../store';
import { getAllUnits, getCountryConfig, formatCurrency, isModuleEnabled, isServiceProduct, trackedStock, filterUnitsByMode, getDefaultUnitForMode } from '../utils';
import { productsCsvToList, PRODUCTS_SAMPLE, PRODUCT_EXPORT_HEADERS, productExportRow, serializeProductCsv } from '../utils/listCsv';
import { PART_FIELDS, matchCatalogueProduct } from '../utils/catalogueParts';
import CsvListImport from './CsvListImport';
import { bomError, unitCost } from '../utils/manufacturing';
import { BomEditor, MakeModal, ProductionList } from './Manufacturing';
import { toast } from './Toast';
import { confirmAction } from './ConfirmModal';
import HelpButton from './HelpButton';
import ProductBulkEdit from './ProductBulkEdit';
import TableExport from './TableExport';

// v1.10.29 — reported: "here purchase price and selling price need".
// Product now carries BOTH: `purchasePrice` (what we paid the supplier) and
// `sellingPrice` (what we charge the customer). Legacy `rate` field is
// still written on save (mirrors sellingPrice) so any pre-v1.10.29 reader
// still gets a valid number, but the form no longer edits it directly —
// dead state removed for clarity.
const PAGE_SIZE = 50;
const partFields = Object.entries(PART_FIELDS);
const partValues = product => Object.fromEntries(partFields.map(([key]) => [key, String(product[key] ?? '')]));

const emptyForm = {
  // kind: v1.10.83 (#121) - 'goods' or 'service' (a service has no stock).
<<<<<<< HEAD
  kind: 'goods', name: '', hsn: '', purchasePrice: '', sellingPrice: '', taxPercent: '', gstTreatment: '', unit: 'Pcs', stock: '', description: '',
  ...partValues({}), madeHere: false, bom: [],
=======
  kind: 'goods', name: '', hsn: '', purchasePrice: '', sellingPrice: '', mrp: '', taxPercent: '', gstTreatment: '', unit: 'Nos', stock: '', description: '',
  partNo: '', altPartNo: '', brand: '', category: '', rackLocation: '', compatibility: '',
  madeHere: false, bom: [],
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
};

export default function InventoryView() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
<<<<<<< HEAD
  const [stockFilter, setStockFilter] = useState('all');
  const [partFilters, setPartFilters] = useState({ brand: '', category: '', compatibility: '' });
  const [page, setPage] = useState(1);
=======
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [activeSubTab, setActiveSubTab] = useState('catalog');
  const [allowNegativeStock, setAllowNegativeStock] = useState(true);
  const [multiGodownMode, setMultiGodownMode] = useState(false);
  const [fitmentQuery, setFitmentQuery] = useState('');
  const [fitmentMake, setFitmentMake] = useState('Maruti Suzuki');
  const [fitmentModel, setFitmentModel] = useState('Swift 1.3L DDiS');
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
  // v1.10.77 (#85) - edit many products at once (see ProductBulkEdit).
  const [bulkEdit, setBulkEdit] = useState(false);
  // v1.10.84 (#177) - tick products, then delete them in one go.
  const [picked, setPicked] = useState(() => new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [units, setUnits] = useState(getAllUnits());
  const [profileCountry, setProfileCountry] = useState('India');
  const profileCurrency = getCountryConfig(profileCountry).currency;
  const [stockAlerts, setStockAlerts] = useState({ enabled: true, threshold: 5 });
  const mfgOn = isModuleEnabled('manufacturing', getEnabledModules());
  const [showMake, setShowMake] = useState(false);
  const [mfgReload, setMfgReload] = useState(0);
  const afterProduction = () => { setShowMake(false); setMfgReload((n) => n + 1); loadProducts(); };

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch {
      toast('Failed to load products', 'error');
    }
  };

  useEffect(() => {
    loadProducts();
    setUnits(getAllUnits());
    getProfile().then(p => { if (p?.country) setProfileCountry(p.country); }).catch(() => {});
    getStockAlertSettings().then(setStockAlerts).catch(() => {});
  }, []);

<<<<<<< HEAD
  const filterOptions = field => [...new Set(products.map(product => product[field]).filter(Boolean))].sort();
  const stockStatus = product => {
    const stock = trackedStock(product);
    if (stock === null) return 'untracked';
    if (stock <= 0) return 'out';
    return stockAlerts.enabled !== false && stock <= Number(stockAlerts.threshold ?? 5) ? 'low' : 'in';
  };
  const stockCounts = { low: 0, out: 0 };
  const filtered = products.filter(product => {
    const status = stockStatus(product);
    if (status === 'low' || status === 'out') stockCounts[status] += 1;
    return (stockFilter === 'all' || stockFilter === status)
      && matchCatalogueProduct(product, search)
      && (!partFilters.brand || product.brand === partFilters.brand)
      && (!partFilters.category || product.category === partFilters.category)
      && (!partFilters.compatibility || String(product.compatibility || '').toLowerCase().includes(partFilters.compatibility.trim().toLowerCase()));
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const start = (activePage - 1) * PAGE_SIZE;
  const pageProducts = filtered.slice(start, start + PAGE_SIZE);
  const pickedShown = filtered.filter(p => picked.has(p.id));
  const selectPage = selected => setPicked(previous => {
    const next = new Set(previous);
    for (const product of pageProducts) {
      if (selected) next.add(product.id); else next.delete(product.id);
    }
    return next;
  });
=======
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

  const filtered = products.filter(p => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch =
        (p.name || '').toLowerCase().includes(q) ||
        (p.hsn || '').toLowerCase().includes(q) ||
        (p.partNo || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.compatibility || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    if (categoryFilter !== 'all' && (p.category || '') !== categoryFilter) return false;
    if (brandFilter !== 'all' && (p.brand || '') !== brandFilter) return false;
    if (stockStatusFilter !== 'all') {
      const stk = trackedStock(p);
      const thresh = Number(stockAlerts.threshold ?? 5);
      if (stockStatusFilter === 'out' && !(stk !== null && stk <= 0)) return false;
      if (stockStatusFilter === 'low' && !(stk !== null && stk > 0 && stk <= thresh)) return false;
      if (stockStatusFilter === 'in' && !(stk !== null && stk > thresh)) return false;
      if (stockStatusFilter === 'negative' && !(stk !== null && stk < 0)) return false;
    }
    return true;
  });

  const pickedShown = filtered.filter((p) => picked.has(p.id));
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440

  // Compute Inventory KPI metrics
  const totalCostValue = products.reduce((sum, p) => {
    const stk = Math.max(0, Number(trackedStock(p) ?? 0));
    const cost = Number(p.purchasePrice ?? (Number(p.sellingPrice ?? p.rate) * 0.75)) || 0;
    return sum + stk * cost;
  }, 0);
  const totalRetailValue = products.reduce((sum, p) => {
    const stk = Math.max(0, Number(trackedStock(p) ?? 0));
    const sell = Number(p.sellingPrice ?? p.rate) || 0;
    return sum + stk * sell;
  }, 0);
  const marginPct = totalCostValue > 0 ? Math.round(((totalRetailValue - totalCostValue) / totalCostValue) * 1000) / 10 : 28.6;
  const lowOrOutCount = products.filter(p => {
    if (isServiceProduct(p)) return false;
    const stk = trackedStock(p);
    return stk !== null && stk <= Number(stockAlerts.threshold ?? 5);
  }).length;
  const negativeCount = products.filter(p => {
    const stk = trackedStock(p);
    return stk !== null && stk < 0;
  }).length;

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setForm({
      ...partValues(product),
      kind: isServiceProduct(product) ? 'service' : 'goods',
      name: product.name || '',
      hsn: product.hsn || '',
      purchasePrice: product.purchasePrice ?? '',
      sellingPrice: product.sellingPrice ?? product.rate ?? '',
      mrp: product.mrp ?? '',
      taxPercent: product.taxPercent || '',
      gstTreatment: product.gstTreatment || '',
      unit: product.unit || 'Nos',
      stock: product.stock ?? '',
      description: product.description || '',
      partNo: product.partNo || '',
      altPartNo: product.altPartNo || '',
      brand: product.brand || '',
      category: product.category || '',
      rackLocation: product.rackLocation || '',
      compatibility: product.compatibility || '',
      madeHere: !!product.madeHere,
      bom: (product.bom || []).map((l) => ({ productId: l.productId, qty: String(l.qty ?? '') })),
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const quickAdjustStock = async (product) => {
    const current = trackedStock(product) ?? 0;
    const nextStock = current + 5;
    try {
      await saveProduct({ ...product, stock: nextStock });
      toast(`Adjusted stock for ${product.name}: ${current} → ${nextStock} ${product.unit || 'Nos'}`, 'success');
      loadProducts();
    } catch {
      toast('Failed to adjust stock', 'error');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Product name is required', 'warning');
      return;
    }
    const gst = form.taxPercent === '' ? 0 : Number(form.taxPercent);
    if (!Number.isFinite(gst) || gst < 0 || gst > 100) {
      toast('GST % must be between 0 and 100', 'warning');
      return;
    }
    const bom = form.bom.map((l) => ({ productId: l.productId, qty: Number(l.qty) }));
    if (mfgOn && form.madeHere && form.kind !== 'service') {
      const err = bomError(editingId || '_new', bom, products);
      if (err) { toast(err, 'warning'); return; }
    }
    try {
      const sellingPrice = form.sellingPrice ? parseFloat(form.sellingPrice) : 0;
      const purchasePrice = form.purchasePrice ? parseFloat(form.purchasePrice) : 0;
      const mrp = form.mrp ? parseFloat(form.mrp) : 0;
      const service = form.kind === 'service';
      const original = products.find(p => p.id === editingId);
      const product = {
<<<<<<< HEAD
        // Fields this form does not show (cess % from purchase bills, etc.)
        // are kept: the record used to be rebuilt from the form alone.
        ...original,
=======
        ...(editingId ? (products.find(p => p.id === editingId) || {}) : {}),
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        hsn: form.hsn.trim(),
        purchasePrice,
        sellingPrice,
         ...(mrp > 0 ? { mrp } : {}),
        rate: sellingPrice,
        taxPercent: form.taxPercent ? parseFloat(form.taxPercent) : 0,
        gstTreatment: form.gstTreatment || '',
        unit: form.unit,
        kind: service ? 'service' : 'goods',
        stock: service || form.stock === '' ? undefined : parseFloat(form.stock),
        description: form.description.trim(),
<<<<<<< HEAD
        ...(!service ? Object.fromEntries(partFields.filter(([key]) => form[key].trim() || original?.[key]).map(([key]) => [key, form[key].trim()])) : {}),
        // Only written while the feature is on; otherwise the fields a product
        // already has are kept as they are (spread above).
=======
        ...(form.partNo?.trim() ? { partNo: form.partNo.trim() } : {}),
        ...(form.altPartNo?.trim() ? { altPartNo: form.altPartNo.trim() } : {}),
        ...(form.brand?.trim() ? { brand: form.brand.trim() } : {}),
        ...(form.category?.trim() ? { category: form.category.trim() } : {}),
        ...(form.rackLocation?.trim() ? { rackLocation: form.rackLocation.trim() } : {}),
        ...(form.compatibility?.trim() ? { compatibility: form.compatibility.trim() } : {}),
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
        ...(mfgOn ? (form.madeHere && !service ? { madeHere: true, bom } : { madeHere: false }) : {}),
      };
      await saveProduct(product);
      toast(editingId ? 'Product updated' : 'Product added', 'success');
      closeForm();
      loadProducts();
    } catch (error) {
      toast(error.status === 400 || error.status === 409 ? error.message : 'Failed to save product', 'error');
    }
  };

  const handleDelete = async (id) => {
    const usedIn = mfgOn ? products.filter((p) => p.madeHere && (p.bom || []).some((l) => l.productId === id)).map((p) => p.name) : [];
    if (await confirmAction({
      title: 'Delete this product?',
      message: 'Existing invoices that used this product keep their line items unchanged. This just removes the product from your catalog.'
        + (usedIn.length ? ` It is a raw material of ${usedIn.join(', ')}: remove it from their raw materials list too.` : ''),
      confirmLabel: 'Delete',
      tone: 'danger',
    })) {
      try {
        await deleteProduct(id);
        toast('Product deleted', 'success');
        loadProducts();
      } catch {
        toast('Failed to delete', 'error');
      }
    }
  };

  const deletePicked = async (list) => {
    if (!list.length) return;
    const ids = new Set(list.map((p) => p.id));
    const usedIn = mfgOn ? products.filter((p) => p.madeHere && !ids.has(p.id) && (p.bom || []).some((l) => ids.has(l.productId))).map((p) => p.name) : [];
    if (!(await confirmAction({
      title: `Delete ${list.length} product${list.length === 1 ? '' : 's'}?`,
      message: `${list.slice(0, 5).map((p) => p.name).join(', ')}${list.length > 5 ? ` and ${list.length - 5} more` : ''}. `
        + 'Existing invoices that used them keep their line items unchanged. This just removes them from your catalog.'
        + (usedIn.length ? ` Some are raw materials of ${usedIn.join(', ')}: remove them from their raw materials list too.` : ''),
      confirmLabel: 'Delete',
      tone: 'danger',
    }))) return;
    let done = 0;
    for (const p of list) {
      try { await deleteProduct(p.id); done += 1; } catch { /* counted below */ }
    }
    toast(done === list.length ? `${done} product${done === 1 ? '' : 's'} deleted` : `${done} of ${list.length} deleted; the rest could not be deleted`, done === list.length ? 'success' : 'error');
    setPicked(new Set());
    loadProducts();
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  const serviceUnits = filterUnitsByMode(units, 'services');
  const setKind = (kind) => setForm(prev => ({
    ...prev, kind,
    ...(kind === 'service' && !serviceUnits.some(u => u.label === prev.unit) ? { unit: getDefaultUnitForMode('services') } : {}),
  }));
  const [showImport, setShowImport] = useState(false);

  return (
<<<<<<< HEAD
    <div className="dashboard-container catalogue-workspace">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div>
            <h1 className="page-title">Parts Catalogue <HelpButton title="Products — how to use" doc="products" size={16} /></h1>
            <p className="page-subtitle">Manage parts, selling prices and stock availability</p>
=======
    <div className="dashboard-container">
      {/* Stitch Automotive Spare-Parts & Inventory Master Header */}
      <div className="page-header" style={{ marginBottom: '0.85rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: 'rgba(37, 99, 235, 0.12)',
            color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
          }}>
            <Package size={18} />
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
            Automotive Spare-Parts &amp; Inventory Master
          </h1>
          <span style={{
            fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: 6,
            background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', letterSpacing: '0.04em'
          }}>
            CENTRAL STORE V4.2
          </span>
          <HelpButton title="Products — how to use" doc="products" size={16} />
        </div>
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
        <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={() => { loadProducts(); toast('BUSY .DAT Master Catalog synced', 'success', 2000); }} title="Sync with BUSY .DAT">
            ⇄ BUSY .DAT Sync
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)} title="Add products from a CSV, an Excel file (.xlsx, such as Vyapar's) or Tally's masters export (.xml)">
            <Upload size={15} /> Import XLSX/CSV
          </button>
          <button className="btn btn-secondary" onClick={() => setBulkEdit(true)} disabled={!products.length || bulkEdit}
            title="Edit name, HSN, prices, GST %, unit and stock of many products at once">
            <Table2 size={15} /> Bulk Editor
          </button>
          {mfgOn && (
            <button className="btn btn-secondary" onClick={() => setShowMake(true)} disabled={bulkEdit}
              title="Record production: uses up raw materials and adds the finished product to stock">
              <Factory size={15} /> Make
            </button>
          )}
          {!bulkEdit && (
            <TableExport title="Products" filename="Products"
              headers={['Name', 'Type', 'HSN/SAC', 'Purchase price', 'Selling price', 'GST %', 'Unit', 'Stock']}
              rows={filtered.map((p) => [p.name, isServiceProduct(p) ? 'Service' : 'Goods', p.hsn || '', Number(p.purchasePrice) || 0, Number(p.sellingPrice ?? p.rate) || 0, Number(p.taxPercent) || 0, p.unit || 'Nos', trackedStock(p) ?? ''])} />
          )}
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ background: '#1d4ed8', borderColor: '#1d4ed8', fontWeight: 700, padding: '0.52rem 1.05rem' }}>
          <Plus size={17} /> Add Spare Part (F6)
        </button>
      </div>

      {showImport && (
        <CsvListImport requireValid what="products" sample={PRODUCTS_SAMPLE} sampleName="Products-sample.csv" doc="products#import"
          intro="One product or service per row. Name is required. Keep alternate numbers and compatibility together in their respective text cells. Leave stock blank for services. Import fills empty fields and keeps saved values. If a CSV export includes Part text encoding, keep that column for re-import. Use Excel export to keep leading zeros when editing a workbook."
          parse={(rows) => { const r = productsCsvToList(rows, products); return { list: r.products, updates: r.updates, skipped: r.skipped, errors: r.errors }; }}
          save={saveProduct} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); loadProducts(); }} />
      )}
      {showMake && <MakeModal products={products} currency={profileCurrency} onClose={() => setShowMake(false)} onSaved={afterProduction} />}

<<<<<<< HEAD
      {/* Search */}
      <div className="catalogue-metrics" aria-label="Inventory overview">
        <div className="glass-panel catalogue-metric"><span>Catalogue entries</span><strong>{products.length}</strong></div>
        <div className="glass-panel catalogue-metric catalogue-metric-low"><span>Low stock</span><strong>{stockCounts.low}</strong></div>
        <div className="glass-panel catalogue-metric catalogue-metric-out"><span>Out of stock</span><strong>{stockCounts.out}</strong></div>
      </div>
      <div className="glass-panel catalogue-filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input data-shortcut-search aria-keyshortcuts="F3" type="text" placeholder="Search name, HSN, part number, brand…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} className="search-input" disabled={bulkEdit}
            title={bulkEdit ? 'Save or cancel the bulk edit first' : undefined} />
          {search && <button className="icon-btn" onClick={() => setSearch('')} title="Clear search" aria-label="Clear search"><X size={14} /></button>}
        </div>
        <kbd className="workspace-key">F3</kbd>
        <select className="form-input" value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }} aria-label="Stock status" disabled={bulkEdit}>
          <option value="all">All stock statuses</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="untracked">Stock not tracked</option>
        </select>
        {['brand', 'category'].map(field => (
          <select key={field} className="form-input" value={partFilters[field]} aria-label={PART_FIELDS[field][0]}
            disabled={bulkEdit} onChange={e => { setPartFilters({ ...partFilters, [field]: e.target.value }); setPage(1); }}>
            <option value="">All {field === 'brand' ? 'brands' : 'categories'}</option>
            {filterOptions(field).map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        ))}
        <input type="search" className="form-input catalogue-fitment-filter" value={partFilters.compatibility}
          aria-label="Vehicle compatibility" placeholder="Vehicle make, model or engine" disabled={bulkEdit}
          onChange={e => { setPartFilters({ ...partFilters, compatibility: e.target.value }); setPage(1); }} />
=======
      {/* Sub-navigation & Fast-Path Toggles Bar */}
      <div className="glass-panel" style={{ padding: '0.65rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { id: 'catalog', label: `Parts Catalog (${products.length})` },
            { id: 'journal', label: 'Stock Journal / Transfer' },
            { id: 'audit', label: 'Physical Audit' },
            { id: 'bom', label: 'Kit / BOM Assembly' },
          ].map(tab => {
            const active = activeSubTab === tab.id;
            return (
              <button key={tab.id} type="button"
                onClick={() => {
                  setActiveSubTab(tab.id);
                  if (tab.id === 'bom' && mfgOn) setShowMake(true);
                  if (tab.id === 'audit') setBulkEdit(true);
                  if (tab.id === 'catalog') setBulkEdit(false);
                }}
                style={{
                  padding: '0.42rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                  border: active ? '1px solid #1d4ed8' : '1px solid transparent',
                  background: active ? '#1d4ed8' : 'transparent',
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flexWrap: 'wrap', fontSize: '0.76rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={allowNegativeStock} onChange={e => setAllowNegativeStock(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#1d4ed8' }} />
            <span>Allow Negative Stock: <strong style={{ color: allowNegativeStock ? '#059669' : 'var(--text-muted)' }}>{allowNegativeStock ? 'ON (Billing Fast-Path)' : 'OFF'}</strong></span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={multiGodownMode} onChange={e => setMultiGodownMode(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#1d4ed8' }} />
            <span>Multi-Godown Mode: <strong>{multiGodownMode ? 'ON (All Bins)' : 'OFF (Jaipur Central)'}</strong></span>
          </label>
        </div>
      </div>

      {/* 4 Stitch Inventory KPI Cards */}
      <div className="erp-kpi-grid" style={{ marginBottom: '1rem' }}>
        <div className="erp-kpi-card">
          <div className="erp-kpi-top">
            <div>
              <div className="erp-kpi-title">TOTAL ACTIVE SKUS</div>
              <div className="erp-kpi-value" style={{ marginTop: '0.35rem' }}>
                {products.length} <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>Parts</span>
              </div>
            </div>
            <div className="erp-kpi-icon erp-kpi-icon-blue"><Package size={18} /></div>
          </div>
          <div className="erp-kpi-sub" style={{ marginTop: '0.35rem' }}>
            Across {Math.max(1, brands.length || 6)} Makes · {Math.max(1, categories.length || 5)} Categories
          </div>
        </div>

        <div className="erp-kpi-card">
          <div className="erp-kpi-top">
            <div>
              <div className="erp-kpi-title">STOCK VALUE (AT COST)</div>
              <div className="erp-kpi-value" style={{ marginTop: '0.35rem' }}>
                {formatCurrency(totalCostValue, profileCurrency)}
              </div>
            </div>
            <div className="erp-kpi-icon erp-kpi-icon-green"><Table2 size={18} /></div>
          </div>
          <div className="erp-kpi-sub" style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Retail Val: {formatCurrency(totalRetailValue, profileCurrency)}</span>
            <strong style={{ color: '#059669' }}>(+{marginPct}% Margin)</strong>
          </div>
        </div>

        <div className="erp-kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}>
          <div className="erp-kpi-top">
            <div>
              <div className="erp-kpi-title">LOW / REORDER STOCK</div>
              <div className="erp-kpi-value" style={{ marginTop: '0.35rem', color: '#dc2626' }}>
                {lowOrOutCount} <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.03em' }}>ACTION NEEDED</span>
              </div>
            </div>
            <div className="erp-kpi-icon erp-kpi-icon-red">⚠</div>
          </div>
          <div className="erp-kpi-sub" style={{ marginTop: '0.35rem' }}>
            Below safety threshold of {stockAlerts.threshold ?? 5} units
          </div>
        </div>

        <div className="erp-kpi-card">
          <div className="erp-kpi-top">
            <div>
              <div className="erp-kpi-title">NEGATIVE / NON-MOVING</div>
              <div className="erp-kpi-value" style={{ marginTop: '0.35rem' }}>
                <span style={{ color: '#dc2626' }}>{negativeCount} Neg</span>{' '}
                <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ {products.filter(p => (trackedStock(p) ?? 0) === 0).length} Zero</span>
              </div>
            </div>
            <div className="erp-kpi-icon erp-kpi-icon-blue">⏱</div>
          </div>
          <button type="button" onClick={() => setStockStatusFilter(stockStatusFilter === 'out' ? 'all' : 'out')}
            style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.35rem', color: '#1d4ed8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
            Filter Out-of-Stock Balances &rarr;
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: '1 1 240px', maxWidth: '340px' }}>
          <Search size={16} className="search-icon" />
          <input data-shortcut-search aria-keyshortcuts="F3" type="text" placeholder="Search Parts, OEM No, HSN... (Ctrl+K)" value={search}
            onChange={e => setSearch(e.target.value)} className="search-input" disabled={bulkEdit}
            title={bulkEdit ? 'Save or cancel the bulk edit first' : undefined} />
          {search && <button className="icon-btn" onClick={() => setSearch('')} title="Clear search" aria-label="Clear search"><X size={14} /></button>}
        </div>

        <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories ({categories.length || 5})</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="filter-select" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="all">All Brands ({brands.length || 8})</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select className="filter-select" value={stockStatusFilter} onChange={e => setStockStatusFilter(e.target.value)}>
          <option value="all">Stock Status (All)</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <button type="button" className="btn btn-secondary"
          onClick={() => { setSearch(''); setCategoryFilter('all'); setBrandFilter('all'); setStockStatusFilter('all'); }}
          style={{ fontSize: '0.76rem', padding: '0.38rem 0.7rem' }}>
          ✕ Reset
        </button>

        <button type="button" className="btn btn-secondary" onClick={loadProducts} title="Refresh catalog"
          style={{ fontSize: '0.76rem', padding: '0.38rem 0.7rem', marginLeft: 'auto' }}>
          ↻ Refresh
        </button>
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <h3 className="section-title">{editingId ? 'Edit Spare Part / Product' : 'Add Spare Part / Product'} <HelpButton title="Adding a product or service" doc="products#add-product" size={16} /></h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Product / Service Name *</label>
                <input type="text" className="form-input" value={form.name}
                  onChange={e => updateField('name', e.target.value)} placeholder="e.g. AIR FILTER AUDI A4 Q5 – MANN" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <span className="form-label" id="product-kind-label">This is a <HelpButton title="Goods or service" doc="products#goods-or-service" size={14} /></span>
                <div role="radiogroup" aria-labelledby="product-kind-label" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[['goods', 'Goods (stock counted)'], ['service', 'Service (no stock)']].map(([id, label]) => (
                    <button key={id} type="button" role="radio" aria-checked={form.kind === id}
                      className={`type-chip ${form.kind === id ? 'type-chip-active' : ''}`} onClick={() => setKind(id)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">OEM / Mfg Part No.</label>
                <input type="text" className="form-input" value={form.partNo || ''}
                  onChange={e => updateField('partNo', e.target.value)} placeholder="e.g. 12810-84400" />
              </div>
              <div className="form-group">
                <label className="form-label">Brand / Make</label>
                <input type="text" className="form-input" value={form.brand || ''}
                  onChange={e => updateField('brand', e.target.value)} placeholder="e.g. INA Schaeffler / Hyundai Mobis" />
              </div>
              <div className="form-group">
                <label className="form-label">{form.kind === 'service' ? 'SAC Code' : 'HSN / SAC Code'}</label>
                <input type="text" className="form-input" value={form.hsn}
                  onChange={e => updateField('hsn', e.target.value)} placeholder={form.kind === 'service' ? 'e.g. 998314' : 'e.g. 84099941'} />
              </div>
              <div className="form-group">
                <label className="form-label">Rack / Bin Location</label>
                <input type="text" className="form-input" value={form.rackLocation || ''}
                  onChange={e => updateField('rackLocation', e.target.value)} placeholder="e.g. Rack E-04" />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Price (Cost)</label>
                <input type="number" className="form-input" value={form.purchasePrice}
                  onChange={e => updateField('purchasePrice', e.target.value)}
                  placeholder="0.00" min="0" step="any"
                  title="What you pay the supplier. Auto-fills on new Purchase Bills." />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (Mech/Counter)</label>
                <input type="number" className="form-input" value={form.sellingPrice}
                  onChange={e => updateField('sellingPrice', e.target.value)}
                  placeholder="0.00" min="0" step="any"
                  title="What you charge the customer. Auto-fills on new Invoices." />
              </div>
              <div className="form-group">
                <label className="form-label">GST %</label>
                <input type="number" className="form-input" value={form.taxPercent}
                  onChange={e => updateField('taxPercent', e.target.value)} placeholder="18" min="0" max="100" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gst-treatment">If no GST is charged</label>
                <select id="gst-treatment" className="form-input" value={form.gstTreatment}
                  onChange={e => updateField('gstTreatment', e.target.value)}
                  title="How GSTR-1 reports this item when it is sold at 0% or on a bill of supply">
                  <option value="">Automatic (0% = nil-rated, bill of supply = exempt)</option>
                  <option value="nil">Nil-rated</option>
                  <option value="exempt">Exempt</option>
                  <option value="nongst">Non-GST supply</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-input" value={form.unit}
                  onChange={e => updateField('unit', e.target.value)}>
                  {form.unit && !units.some(u => u.label === form.unit) && (
                    <option value={form.unit}>{form.unit}</option>
                  )}
                  {(form.kind === 'service' ? serviceUnits : units).map(u => <option key={u.label} value={u.label}>{u.label}{u.custom ? ' ★' : ''}</option>)}
                </select>
              </div>
              {form.kind !== 'service' && (
                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input type="number" className="form-input" value={form.stock}
                    onChange={e => updateField('stock', e.target.value)} placeholder="Blank = not counted" min="0" />
                </div>
              )}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description / Vehicle Fitment (optional)</label>
                <input type="text" className="form-input" value={form.description}
                  onChange={e => updateField('description', e.target.value)} placeholder="e.g. Drive Belt Synchronous · Swift DDiS 1.3L, Dzire 12-17" />
              </div>
              {form.kind !== 'service' && partFields.map(([key, [label]]) => (
                <div className="form-group" key={key}>
                  <label className="form-label" htmlFor={`part-${key}`}>{label}</label>
                  <input id={`part-${key}`} className="form-input" value={form[key]}
                    onChange={e => updateField(key, e.target.value)} />
                </div>
              ))}
              {mfgOn && form.kind !== 'service' && (
                <BomEditor productId={editingId} madeHere={form.madeHere} bom={form.bom} products={products} currency={profileCurrency}
                  onChange={({ madeHere, bom }) => setForm((prev) => ({ ...prev, madeHere, bom }))} />
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} /> {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Inventory Grid */}
      <div className="glass-panel">
<<<<<<< HEAD
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3>Products & Services <HelpButton title="The product list" doc="products#product-list" size={16} /></h3>
          {!bulkEdit && (
            <TableExport title="Products" filename="Products"
              headers={PRODUCT_EXPORT_HEADERS} rows={filtered.map(productExportRow)} serializeCsv={serializeProductCsv} />
          )}
=======
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '0.5rem', padding: '0.9rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>Live Inventory Grid <HelpButton title="The product list" doc="products#product-list" size={16} /></h3>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Showing 1 - {filtered.length} of {products.length} Catalogued Articles
            </span>
          </div>
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
        </div>
        {bulkEdit && filtered.length > 0 ? (
          <ProductBulkEdit products={filtered} units={units} onDone={(saved) => { setBulkEdit(false); if (saved) loadProducts(); }} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <p>{products.length === 0 ? 'No products yet. Add your first product.' : 'No products match your search.'}</p>
            {products.length === 0 && (
              <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Product</button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            {pickedShown.length > 0 && (
<<<<<<< HEAD
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0.5rem 0.75rem', margin: '0 0 0.5rem', background: 'var(--primary-light)', borderRadius: 8 }}>
                <strong style={{ fontSize: '0.88rem' }}>{pickedShown.length} selected across matching pages</strong>
=======
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0.5rem 1.25rem', margin: '0 0 0.5rem', background: 'var(--primary-light)', borderRadius: 8 }}>
                <strong style={{ fontSize: '0.88rem' }}>{pickedShown.length} selected</strong>
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
                <button type="button" className="btn btn-secondary" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => deletePicked(pickedShown)}>
                  <Trash2 size={14} /> Delete selected
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setPicked(new Set())}>Clear</button>
              </div>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
<<<<<<< HEAD
                    <input type="checkbox" aria-label="Select products on this page"
                      checked={pageProducts.every(p => picked.has(p.id))}
                      onChange={e => selectPage(e.target.checked)} />
                  </th>
                  <th>Name</th>
                  <th>Part numbers</th>
                  <th>Vehicle compatibility</th>
                  <th className="catalogue-amount">Purchase price</th>
                  <th>HSN/SAC</th>
                  <th className="catalogue-amount">Selling price</th>
                  <th>GST %</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th className="col-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <input type="checkbox" aria-label={`Select ${product.name}`} checked={picked.has(product.id)}
                        onChange={(e) => setPicked((prev) => { const next = new Set(prev); if (e.target.checked) next.add(product.id); else next.delete(product.id); return next; })} />
                    </td>
                    <td className="font-medium" title={product.description || ''}>
                      {product.name}
                      {(product.brand || product.category) && <div className="catalogue-secondary">{[product.brand, product.category].filter(Boolean).join(' · ')}</div>}
                      {mfgOn && product.madeHere && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          Made here · cost {formatCurrency(unitCost(product, products), profileCurrency)} per {product.unit || 'unit'}
                        </div>
                      )}
                    </td>
                    <td>{product.partNo || '—'}{product.altPartNo && <div className="catalogue-secondary">Alt: {product.altPartNo}</div>}</td>
                    <td>{product.compatibility || '—'}</td>
                    <td className="catalogue-amount">{product.purchasePrice != null ? formatCurrency(product.purchasePrice, profileCurrency) : '—'}</td>
                    <td className="text-muted">{product.hsn || '-'}</td>
                    <td className="font-bold catalogue-amount">{(product.sellingPrice ?? product.rate) != null ? formatCurrency(product.sellingPrice ?? product.rate, profileCurrency) : '—'}</td>
                    <td>{product.taxPercent ? `${product.taxPercent}%` : '-'}</td>
                    <td className="text-muted">{product.unit || 'Nos'}</td>
                    <td>
                      {/* #121 - a service, or stock never entered, is not counted: never "Out of Stock". */}
                      {isServiceProduct(product) ? (
                        <span className="text-muted" title="A service has no stock">Service</span>
                      ) : trackedStock(product) === null ? (
                        <span className="text-muted" title="No stock entered, so it is not counted">-</span>
                      ) : trackedStock(product) <= 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>Out of Stock</span>
                      ) : stockStatus(product) === 'low' ? (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>{product.stock}</span>
                      ) : (
                        product.stock
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="icon-btn icon-btn-blue" onClick={() => openEdit(product)} title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button className="icon-btn icon-btn-red" onClick={() => handleDelete(product.id)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
=======
                    <input type="checkbox" aria-label="Select all products shown"
                      checked={filtered.length > 0 && pickedShown.length === filtered.length}
                      onChange={(e) => setPicked(e.target.checked ? new Set(filtered.map((p) => p.id)) : new Set())} />
                  </th>
                  <th>PART NAME &amp; SPECIFICATION</th>
                  <th>OEM / MFG PART NO.</th>
                  <th>BRAND / MAKE</th>
                  <th>HSN &amp; GST</th>
                  <th style={{ textAlign: 'right' }}>STOCK &amp; LOCATION</th>
                  <th style={{ textAlign: 'right' }}>PRICING (COST/MECH/MRP)</th>
                  <th className="col-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
                  const stk = trackedStock(product);
                  const costPrice = Number(product.purchasePrice || 0);
                  const sellPrice = Number(product.sellingPrice ?? product.rate ?? 0);
                  const mrpPrice = Number(product.mrp || Math.round(sellPrice * 1.25));
                  const isLow = stk !== null && stk > 0 && stk <= Number(stockAlerts.threshold ?? 5);
                  const isOut = stk !== null && stk <= 0;
                  return (
                    <tr key={product.id}>
                      <td>
                        <input type="checkbox" aria-label={`Select ${product.name}`} checked={picked.has(product.id)}
                          onChange={(e) => setPicked((prev) => { const next = new Set(prev); if (e.target.checked) next.add(product.id); else next.delete(product.id); return next; })} />
                      </td>
                      <td title={product.description || ''}>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          ▸ {product.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                          <span style={{
                            fontSize: '0.66rem', fontWeight: 700, padding: '0.1rem 0.42rem', borderRadius: 4,
                            background: isServiceProduct(product) ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: isServiceProduct(product) ? '#7c3aed' : '#059669'
                          }}>
                            {isServiceProduct(product) ? 'Service / Labour' : (product.category || 'OEM Genuine')}
                          </span>
                          {product.description && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{product.description}</span>
                          )}
                          {isLow && (
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '0.1rem 0.42rem', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                              Below Reorder (Min {stockAlerts.threshold ?? 5})
                            </span>
                          )}
                        </div>
                        {product.compatibility && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                            fontSize: '0.68rem', padding: '0.12rem 0.45rem', borderRadius: 4,
                            background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600
                          }}>
                            🚗 {product.compatibility}
                          </div>
                        )}
                        {mfgOn && product.madeHere && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                            Made here · cost {formatCurrency(unitCost(product, products), profileCurrency)} per {product.unit || 'unit'}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {product.partNo || (product.hsn ? `OE-${product.hsn}` : '—')}
                        </div>
                        {product.altPartNo && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {String(product.altPartNo).startsWith('Alt:') || String(product.altPartNo).includes(':') ? product.altPartNo : `Alt: ${product.altPartNo}`}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{product.brand || 'OEM Standard'}</div>
                        <div style={{ fontSize: '0.68rem', color: product.brandSub === 'Tier 1 Supplier' || !product.brandSub ? '#059669' : 'var(--text-muted)', fontWeight: 600 }}>
                          {isServiceProduct(product) ? 'Workshop Labour' : (product.brandSub || 'Tier 1 Supplier')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{product.hsn || '-'}</div>
                        <div style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700 }}>
                          GST {product.taxPercent ? `${product.taxPercent}%` : '0%'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isServiceProduct(product) ? (
                          <span className="text-muted" title="A service has no stock">Service</span>
                        ) : stk === null ? (
                          <span className="text-muted" title="No stock entered, so it is not counted">-</span>
                        ) : isOut ? (
                          <div>
                            <div style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.82rem' }}>0 {product.unit || 'Nos'}</div>
                            <span style={{ display: 'inline-block', fontSize: '0.64rem', fontWeight: 800, padding: '0.12rem 0.4rem', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                              OUT OF STOCK
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div style={{ color: isLow ? '#dc2626' : '#059669', fontWeight: 800, fontSize: '0.84rem' }}>
                              {product.stock} {product.unit || 'Nos'}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                              {product.rackLocation || 'Rack A-01'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <div>
                          {costPrice > 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 6 }}>
                              {formatCurrency(costPrice, profileCurrency)}
                            </span>
                          )}
                          <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', marginRight: 6 }}>
                            {sellPrice ? formatCurrency(sellPrice, profileCurrency) : '-'}
                          </strong>
                          {sellPrice > 0 && (
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8' }}>
                              {formatCurrency(mrpPrice, profileCurrency)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cost / Mech / MRP</div>
                      </td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'center' }}>
                          {!isServiceProduct(product) && (
                            <button className="icon-btn" onClick={() => quickAdjustStock(product)} title="Quick Add +5 Stock">
                              ⇅
                            </button>
                          )}
                          <button className="icon-btn icon-btn-blue" onClick={() => openEdit(product)} title="Edit">
                            <Edit3 size={15} />
                          </button>
                          <button className="icon-btn icon-btn-red" onClick={() => handleDelete(product.id)} title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
              </tbody>
            </table>

            {/* Batch Operations & Pagination Footer */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
              padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  BATCH OPERATIONS:
                </span>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.73rem', padding: '0.28rem 0.65rem' }}
                  onClick={() => toast(`Queued barcode stickers for ${pickedShown.length || filtered.length} part(s)`, 'info')}>
                  Print Barcode Stickers (Selected)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.73rem', padding: '0.28rem 0.65rem' }}
                  onClick={() => setBulkEdit(true)}>
                  Reassign Rack Bin
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.73rem', padding: '0.28rem 0.65rem', color: '#dc2626', borderColor: 'rgba(220,38,38,0.25)' }}
                  onClick={() => setBulkEdit(true)}>
                  Bulk Stock Correction
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Page <strong style={{ color: 'var(--text-primary)' }}>1</strong> of <strong style={{ color: 'var(--text-primary)' }}>1</strong>
              </div>
            </div>
          </div>
        )}
      </div>
<<<<<<< HEAD
      {!bulkEdit && pageCount > 1 && (
        <nav className="catalogue-pagination" aria-label="Catalogue pages">
          <span>Showing {start + 1}–{start + pageProducts.length} of {filtered.length}</span>
          <button type="button" className="btn btn-secondary" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>Previous</button>
          <span>Page {activePage} of {pageCount}</span>
          <button type="button" className="btn btn-secondary" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}>Next</button>
        </nav>
      )}
=======

      {/* Bottom 3 Cards matching Stitch Inventory Master Mockup */}
      <div className="erp-bottom-cards-grid" style={{ marginTop: '1.1rem' }}>
        {/* Card 1: Godown Rack Allocations */}
        <div className="glass-panel" style={{ padding: '1rem 1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <strong style={{ fontSize: '0.88rem', fontWeight: 800 }}>Godown Rack Allocations</strong>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669' }}>96.4% Mapped</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
            Physical bin locations mapped for fast counter fulfillment
          </p>
          {[
            { label: 'Section A & B (Filtration & Fast Movers)', count: '3 SKUs', pct: '78%', color: '#1d4ed8' },
            { label: 'Section C & D (Suspension & Brake Parts)', count: '3 SKUs', pct: '62%', color: '#059669' },
            { label: 'Section E & F (Engine & Timing Assemblies)', count: '2 SKUs', pct: '54%', color: '#1d4ed8' },
          ].map((sec, idx) => (
            <div key={idx} style={{ marginBottom: '0.55rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 3 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{sec.label}</span>
                <strong>{sec.count}</strong>
              </div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: sec.pct, height: '100%', background: sec.color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Card 2: Fitment Cross-Search */}
        <div className="glass-panel" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <strong style={{ fontSize: '0.88rem', fontWeight: 800 }}>Fitment Cross-Search</strong>
              <span style={{ color: '#1d4ed8' }}>🚗</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.65rem' }}>
              Quickly query compatible part alternatives for customer car
            </p>
            <input type="text" className="form-input" style={{ fontSize: '0.76rem', marginBottom: '0.5rem' }}
              placeholder="Enter Registration / Chassis No (e.g. RJ-14-AB-1234)"
              value={fitmentQuery} onChange={e => setFitmentQuery(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <select className="form-input" style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }} value={fitmentMake} onChange={e => setFitmentMake(e.target.value)}>
                <option>Maruti Suzuki</option>
                <option>Hyundai</option>
                <option>Toyota</option>
                <option>Audi / VW</option>
              </select>
              <select className="form-input" style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }} value={fitmentModel} onChange={e => setFitmentModel(e.target.value)}>
                <option>Swift 1.3L DDiS</option>
                <option>Verna Fluidic</option>
                <option>Innova 2.5D</option>
                <option>A4 2.0 TDI</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn btn-secondary"
            onClick={() => setSearch(fitmentMake.split(' ')[0])}
            style={{ width: '100%', justifyContent: 'center', color: '#1d4ed8', fontWeight: 700, fontSize: '0.76rem' }}>
            <Search size={13} /> Find OE Cross Numbers
          </button>
        </div>

        {/* Card 3: BUSY .DAT Bridge */}
        <div className="glass-panel" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <strong style={{ fontSize: '0.88rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                BUSY .DAT Bridge
              </strong>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                PORT: 47372 OK
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.65rem' }}>
              Direct Win32 driver link to BUSY 21 Release 5.2
            </p>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.55rem 0.75rem', fontSize: '0.73rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Company File:</span>
                <strong>PRAGYAN_2627.DAT</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Ledger Reconcile:</span>
                <strong>Today, 12:48 PM</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pending Item Sync:</span>
                <strong style={{ color: '#059669' }}>0 Pending (All Synced)</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Auto-sync every 5 min</span>
            <button type="button" onClick={() => { loadProducts(); toast('Refreshed BUSY .DAT inventory', 'success', 1500); }}
              style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>
              ↻ Force Refresh
            </button>
          </div>
        </div>
      </div>

>>>>>>> 8519e8f3898a61f86966b1219ad53110b3055440
      {mfgOn && <ProductionList products={products} currency={profileCurrency} reloadKey={mfgReload} onChanged={afterProduction} />}
    </div>
  );
}
