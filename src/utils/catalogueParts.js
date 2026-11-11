// Optional catalogue fields already written by the inventory screen on origin/main.
export const PART_FIELDS = {
  partNo: ['Part number', 'Part No', 'OEM part number', 'OEM number'],
  altPartNo: ['Alternate part number', 'Alt part no', 'Aftermarket part number'],
  brand: ['Brand'],
  category: ['Category'],
  compatibility: ['Vehicle compatibility', 'Compatibility'],
};

export const partSearchFields = ['name', 'hsn', ...Object.keys(PART_FIELDS)];
export const matchCatalogueProduct = (product, query) => {
  const words = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const values = partSearchFields.map(key => String(product[key] ?? '').toLowerCase());
  return words.every(word => values.some(value => value.includes(word)));
};

export const identifierText = value => String(value ?? '').trim().toLowerCase();
export const cataloguePartKey = product => identifierText(product?.partNo)
  ? JSON.stringify([identifierText(product.brand), identifierText(product.partNo)]) : '';

export const partFieldError = product => {
  const invalid = Object.keys(PART_FIELDS).find(key => product[key] != null && typeof product[key] !== 'string');
  return invalid ? `${PART_FIELDS[invalid][0]} must be text.` : '';
};
