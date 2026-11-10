# Apex AutoERP — New Tax Invoice Screen Redesign

Transform the Invoice Creation workspace into a high-density, full-width enterprise ERP billing interface matching the Apex AutoERP reference design while preserving every existing calculation, keyboard shortcut, modal, and PDF/print capability.

## User Review & Critical Decisions

> [!IMPORTANT]
> All three architectural and layout preferences have been confirmed in Phase 1 and are incorporated into this plan with zero loss of existing billing functionality.

- **Confirmed Decision 1 — Default Full-Width ERP Layout**: The invoice creation screen opens in full-width ERP mode (`previewCollapsed` defaulting to `true` unless explicitly toggled on by the user) so the 2-column top cards, tabular line-items grid, and 2-column settlement/tax summary cards span the full workspace width cleanly. The live `InvoicePreview` remains mounted off-screen for instant PDF/print capture and can be toggled into a side-by-side split view or full-page modal at any time.
- **Confirmed Decision 2 — Compact ERP Table Grid for Line Items**: Line items are presented in a structured tabular ERP grid (`#`, `ITEM & DESCRIPTION`, `OEM / PART NO`, `HSN / SAC`, `QTY & UNIT`, `RATE (₹)`, `DISC %`, `TAXABLE (₹)`, `GST %`, `TAX (CGST+SGST)`, `NET TOTAL (₹)`) with inline inputs, keyboard navigation (`Enter` advances across fields and adds a new row on the last item), per-line calculated Taxable/Tax/Net Total columns, and a bottom quick-add bar (`+ Add Part by Name / OEM Barcode`, `+ Labour`, `+ Freight`, `Total Bill Discount`).
- **Confirmed Decision 3 — Blue Customer Ledger Summary & Collapsible Details**: The top row pairs `Document Specifications` (left) with `Billed To (Customer Ledger)` (right) in a balanced 2-column grid. Selecting or typing a customer displays the blue-tinted Customer Ledger summary card (`GSTIN`, phone, `Regular Taxpayer`, address, `Outstanding Balance`, `Credit Limit`, `Ship to same as bill-to address`, and `Dispatch & Transporter` drawer), with full address/country/state edit inputs accessible via an inline collapsible drawer.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a fast, keyboard-first GST billing and spare-parts invoicing screen tailored for high-volume B2B and counter operations, complete with live per-line tax breakdowns, customer ledger credit/balance visibility, bank/UPI settlement selection, and a real-time Tax Calculation Summary with pre-flight compliance checks.
- **Target Audience / Persona**: Automotive spare-parts distributors, wholesale traders, and GST-registered businesses issuing 20+ B2B/B2C invoices daily who rely on keyboard shortcuts (`F2`, `F4`, `F8`, `Ctrl+S`, `Ctrl+P`) and instant tax verification.
- **Key Value**: Eliminates vertical scrolling clutter by organizing document metadata, customer ledger details, tabular line items, and settlement/tax summaries into a scannable 1440px enterprise workspace without sacrificing any power-user customization or GST compliance controls.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Header & Fast-Mode Sub-Bar**: The user sees the contextual breadcrumb (`Sales & Billing / New Tax Invoice`), live auto-save status pill (`DRAFT · Auto-Saved`), and primary action cluster (`Discard`, `Save Draft Ctrl+S`, `Print Preview Ctrl+P`, `WhatsApp`, `e-Way Bill`, `E-invoice`, `Customize`, `Show/Hide Preview`, and primary `Save & Generate F8`). Immediately below sits the fast-mode sub-bar with `Prices Include Tax (MRP Mode)`, live `Intra-State GST / Inter-State IGST Auto-Detect Active` indicator, and keyboard shortcut hints (`F2 Add Part`, `F4 Client Search`, `F8 Finalize Bill`, `Esc Quick Close`).
  2. **2-Column Document Specifications & Customer Ledger**:
     - **Left Card (`Document Specifications`)**: Document type selector pills (`Tax Invoice (B2B)`, `B2C Retail Invoice`, `Bill of Supply`, `Proforma / Estimate`, `Credit Note`), Goods/Services/Mixed mode switcher, and a 2x2 grid for `INVOICE NUMBER` (with quick `EDIT` focus), `INVOICE DATE`, `PAYMENT TERMS` (`Net 15 Days`, `Net 7 Days`, `Net 30 Days`, or custom due date), and `PLACE OF SUPPLY (POS)` with state code display.
     - **Right Card (`Billed To — Customer Ledger`)**: `GSTIN Validated` status badge, `SEARCH CLIENT / GARAGE / LEDGER (F4)` autocomplete search box with `ID` tag, followed by the signature blue-tinted Customer Ledger summary card showing `GSTIN`, phone, `Regular Taxpayer` badge, formatted address, live `Outstanding Balance` (computed from unpaid bills), and `Credit Limit` status. Includes an inline `Edit Address / Tax Fields` toggle for editing raw address, city, PIN, state, country, and GSTIN fields, plus the `Ship to same as bill-to address` checkbox and `Dispatch & Transporter` collapsible drawer.
  3. **Compact ERP Table Grid (`Bill Line Items`)**:
     - Header bar with `Bill Line Items`, `{items.length} Items Added` count badge, `Scan Barcode` focus action, and `Expand Descriptions` toggle.
     - Structured table header and rows where each `LineItem` renders inline inputs for item name/autocomplete (with brand/rack sub-pill when matched from catalog), OEM/Part No, HSN/SAC (with automatic GST rate suggestion), Qty & Unit, Rate, Discount, live computed `Taxable (₹)`, `GST %` selector, live computed `Tax (CGST+SGST / IGST)`, live `Net Total (₹)`, and row actions (`+ Desc`, `Delete`).
     - Bottom quick-add bar featuring the quick-search input (`+ Add Part by Name / OEM Barcode (Press F2 or Enter)...`), `+ Labour` button, `+ Freight` (`addDeliveryCharge`) button, and `Total Bill Discount` inline controls.
  4. **2-Column Settlement & Tax Calculation Summary**:
     - **Left Column**:
       - `Bank Account for Settlement / QR` card with `UPI Enabled` badge, displaying the active bank account's name, `A/C`, `IFSC`, and `UPI VPA` in a clean slate container with a `CHANGE` selector to switch among saved business bank accounts and toggle `Bank details` / `UPI QR` print options.
       - `Terms & Conditions` card with business-type `Preset` selector right-aligned in the header, numbered terms editor (`RichEditor`), and `INTERNAL REMARKS / PRIVATE NOTES (NOT PRINTED ON BILL)` input.
       - Collapsible drawer for `Notes / Remarks (Printed)` and `Additional Pages / Sections` (`extraSections`).
     - **Right Column (`Tax Calculation Summary`)**:
       - Header with `Tax Calculation Summary` and total items/units count (`{items.length} Items ({totalUnits} Units)`).
       - Breakdown rows for `Gross Value`, `Item Discounts` (highlighted in crimson when non-zero), and bold `Total Taxable Amount`.
       - Light-blue GST breakdown box displaying `CGST (Central GST)`, `SGST (State GST)`, `IGST (Integrated GST)`, any applicable `Cess` / `TCS` / `TDS`, and `Total GST Applicable`.
       - `Round-off Adjustment` row.
       - Royal-blue `NET PAYABLE GRAND TOTAL` banner displaying the formatted grand total in large tabular numerals and the amount in words (`INR ... Only`).
       - `COMPLIANCE PRE-FLIGHT CHECK` 2x2 verification grid (`Valid HSN/SAC`, `Buyer Active / B2B Status`, `POS State Match`, `e-Way / Dispatch Status`).

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Precision enterprise ERP workspace (`Apex AutoERP`) with crisp 1px structural borders (`#e2e8f0`), subtle cool-slate surfaces (`#f8fafc`), and high-contrast tabular typography.
  - *Color Palette & Mood*: Crisp white (`#ffffff`) cards on a cool slate (`#f4f6fb`) canvas; royal blue (`#1d4ed8` / `#2563eb`) primary accents; semantic emerald (`#059669`) for GST validation and compliance checks; amber (`#d97706`) and crimson (`#dc2626`) for discounts and credit warnings. Full support for dark mode via CSS variables.
  - *Typography & Hierarchy*: `Plus Jakarta Sans` / system geometric sans for UI headers and labels, paired with `JetBrains Mono` / `tabular-nums` for all invoice numbers, HSN codes, quantities, rates, tax breakdowns, and grand totals.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Full-Width ERP Default with Off-Screen Live Preview**:
  - *Chosen Approach*: Default `previewCollapsed` to `true` when `localStorage.getItem('fgsb_previewCollapsed')` is unset, while keeping the `<InvoicePreview ref={printRef} />` rendered in the off-screen container (`left: -99999px`) and accessible via the toolbar's `Show Preview` button or `Print Preview` modal.
  - *Why*: Matches the Stitch mockup's full-width 2-column card geometry on 1440px screens while ensuring `html2canvas` PDF downloads and direct printing continue to work instantaneously without layout shift.
- **Decision 2 — Hybrid Inline ERP Grid for `LineItem`**:
  - *Chosen Approach*: Upgrade `LineItem` to render as a 10-column ERP table row showing both editable inputs (`Item`, `HSN/SAC`, `Qty`, `Unit`, `Rate`, `Discount`, `GST %`) and live read-only computed columns (`OEM / Part No`, `Taxable ₹`, `Tax Split`, `Net Total ₹`), while preserving the expandable per-line description textarea and `SizeFields` (for glass/sq.ft billing mode).
  - *Why*: Gives counter operators immediate visibility into per-line tax and net totals exactly like the Stitch design without losing specialized unit/discount-base/size-billing features.
- **Decision 3 — Non-Destructive Customer Ledger Card**:
  - *Chosen Approach*: Display the blue Customer Ledger summary box immediately below the Client Search input, populated dynamically from the selected `client` object and `allBillsForCredit` (calculating real outstanding balance from unpaid invoices), alongside a one-click `Edit Client / Address Details` toggle that reveals the underlying `Address`, `Country`, `City`, `PIN`, `State`, and `GSTIN` inputs.
  - *Why*: Keeps the top row compact and aligned with `Document Specifications` while preserving full manual entry for walk-in or international clients.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         InvoiceGenerator Workspace Shell                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Sticky ERP Toolbar: Back · Breadcrumb · Auto-Save Pill · Action Buttons     │  │
│  │ Fast-Mode Sub-Bar: MRP Mode Toggle · Intra/Inter-State Status · F-Key Hints │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                         │
│         ┌───────────────────────────────┴───────────────────────────────┐         │
│         ▼                                                               ▼         │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │ Document Specifications Card        │ │ Billed To (Customer Ledger) Card    │  │
│  │ • Invoice Type Chips & Mode Switch  │ │ • Client Search / Autocomplete (F4) │  │
│  │ • Invoice No · Date · Payment Terms │ │ • Blue Ledger Summary (GSTIN/Bal)   │  │
│  │ • Place of Supply · LUT / FX Alerts │ │ • Collapsible Address & Ship-To     │  │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘  │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Bill Line Items Card (Compact ERP Table Grid)                               │  │
│  │ • Header: Item Count Badge · Scan Barcode · Print Rates Before GST          │  │
│  │ • Table Columns: # | Item & Desc | OEM | HSN | Qty & Unit | Rate | Disc     │  │
│  │                  | Taxable | GST % | Tax (CGST+SGST / IGST) | Net Total     │  │
│  │ • Quick-Add Footer: + Add Part Search | + Labour | + Freight | Bill Disc    │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                         │
│         ┌───────────────────────────────┴───────────────────────────────┐         │
│         ▼                                                               ▼         │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │ Settlement & Terms Column           │ │ Tax Calculation Summary Card        │  │
│  │ • Bank Account / UPI QR Card        │ │ • Gross Value · Item Discounts      │  │
│  │ • Terms & Conditions + Preset Menu  │ │ • Total Taxable · Blue GST Box      │  │
│  │ • Internal Remarks (Private Note)   │ │ • Royal-Blue Grand Total + Words    │  │
│  │ • Collapsible Notes & Extra Pages   │ │ • Compliance Pre-Flight 2x2 Grid    │  │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘  │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Off-Screen / Toggleable Live InvoicePreview (printRef) & Modals             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Payment Terms Selector (`Document Specifications`)**: Selecting `Net 7 Days`, `Net 15 Days`, `Net 30 Days`, or `Due on Receipt` computes and updates `details.dueDate` relative to `details.invoiceDate` using `parseLocalDate` and `toLocalIsoDate`, while still allowing manual date picking.
- **Customer Ledger Balance & Credit (`Billed To`)**: Computes the selected client's real outstanding balance from `allBillsForCredit` (summing unpaid/partial balances for matching client name/GSTIN) and displays it alongside credit limit status and the existing overpayment credit banner (`creditToApply`).
- **Per-Line Tax & Net Total Computation (`LineItem`)**: Computes each row's gross, discount, taxable value, CGST/SGST or IGST split, and net line total using the same tax-inclusive/exclusive and discount-base rules as `computeInvoiceTotals`, feeding `onFieldChange`, `onSelectProduct`, and `onAddRow`.
- **Quick-Add Footer Bar (`Bill Line Items`)**: Typing or pressing `Enter` in the quick-add part input searches `products` and either populates the first blank row or appends a new matched product row; `+ Labour` appends a service/labour row (SAC `998714`, unit `Job`), and `+ Freight` invokes `addDeliveryCharge`.
- **Tax Calculation Summary & Pre-Flight Check**: Reads directly from the memoized `totals` object (`computeInvoiceTotals`) and `numberToWords(totals.total)`, while dynamically evaluating the 4 compliance checks (valid HSN length, client GSTIN / B2B status, Place of Supply state match, and e-Way bill / dispatch readiness).
