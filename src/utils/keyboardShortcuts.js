// One catalogue drives matching, menu hints and the in-app reference.
export const SHORTCUTS = [
  { id: 'palette', keys: ['Mod+k'], label: 'Quick search / command palette', group: 'General' },
  { id: 'help', keys: ['Mod+/', 'F1'], label: 'Keyboard shortcuts', group: 'General' },
  { id: 'search', keys: ['F3'], label: 'Focus search on this page', group: 'General' },
  { id: 'lock', keys: ['Mod+Shift+l'], label: 'Lock app (when a PIN is set)', group: 'General' },
  { id: 'new', keys: ['F8', 'Mod+n'], label: 'New sales invoice', group: 'Navigation', module: 'invoicing' },
  { id: 'purchases', keys: ['F9', 'Shift+b'], label: 'Purchase bills', group: 'Navigation', module: 'purchases' },
  { id: 'receipts', keys: ['F6', 'Shift+r'], label: 'Payment receipts', group: 'Navigation', module: 'receipts' },
  { id: 'dashboard', keys: ['Shift+1'], label: 'Dashboard / sales list', group: 'Navigation' },
  { id: 'inventory', keys: ['Shift+2'], label: 'Parts / products inventory', group: 'Navigation', module: 'inventory' },
  { id: 'clients', keys: ['Shift+4'], label: 'Customers', group: 'Navigation', module: 'clients' },
  { id: 'reports', keys: ['Shift+6'], label: 'Reports', group: 'Navigation', module: 'reports' },
  { id: 'expenses', keys: ['Shift+x'], label: 'Expenses', group: 'Navigation', module: 'expenses' },
  { id: 'cashbook', keys: ['Shift+c'], label: 'Cash book', group: 'Navigation', module: 'cashBook' },
  { id: 'filing', keys: ['Shift+g'], label: 'GST returns', group: 'Navigation', module: 'gstReturns' },
  { id: 'save', keys: ['Mod+s'], label: 'Save invoice', group: 'Invoice' },
  { id: 'pdf', keys: ['Mod+p'], label: 'Download invoice PDF', group: 'Invoice' },
  { id: 'add', keys: ['Mod+Enter'], label: 'Add item row', group: 'Invoice' },
  { id: 'duplicate', keys: ['Mod+Shift+d'], label: 'Duplicate last item row', group: 'Invoice' },
];

export const shortcutLabel = (shortcut) => shortcut.keys.map(k => k.replace('Mod', 'Ctrl')).join(' / ');
export const isEditingField = target => !!target && (
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
  || !!target.closest?.('[role="textbox"], [role="combobox"]')
);

export function matchShortcut(event, group) {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.getModifierState?.('AltGraph')) return null;
  return SHORTCUTS.find(shortcut => (!group || shortcut.group === group) && shortcut.keys.some(binding => {
    const parts = binding.toLowerCase().split('+');
    const key = parts.at(-1);
    if (parts.includes('mod') !== !!(event.ctrlKey || event.metaKey) || parts.includes('shift') !== !!event.shiftKey) return false;
    // Shift+1 produces "!" on US keyboards. Use the physical digit for navigation.
    return /^\d$/.test(key) ? event.code === `Digit${key}` : event.key?.toLowerCase() === key;
  })) || null;
}

export const hasShortcutDialog = () => !!document.querySelector('.app-lock-screen, .modal-overlay, [role="dialog"], [aria-modal="true"]');

export function requestShortcutNavigation(run) {
  const event = new CustomEvent('fgsb:shortcut-navigate', { cancelable: true, detail: { run } });
  if (window.dispatchEvent(event)) run();
}
