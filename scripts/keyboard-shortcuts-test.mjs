import assert from 'node:assert/strict';
import { SHORTCUTS, matchShortcut, isEditingField } from '../src/utils/keyboardShortcuts.js';

const event = (key, extra = {}) => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...extra });
assert.equal(matchShortcut(event('F8'))?.id, 'new');
assert.equal(matchShortcut(event('F9'))?.id, 'purchases');
assert.equal(matchShortcut(event('F6'))?.id, 'receipts');
assert.equal(matchShortcut(event('@', { code: 'Digit2', shiftKey: true }))?.id, 'inventory');
assert.equal(matchShortcut(event('S', { ctrlKey: true, shiftKey: true })), null, 'Save As must not save an invoice');
assert.equal(matchShortcut(event('s', { metaKey: true }), 'Invoice')?.id, 'save');
assert.equal(matchShortcut(event('s', { ctrlKey: true }), 'General'), null);
for (const flags of [{ repeat: true }, { isComposing: true }, { defaultPrevented: true }, { altKey: true }, { getModifierState: () => true }]) {
  assert.equal(matchShortcut(event('s', { ctrlKey: true, ...flags })), null);
}
for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { isContentEditable: true }, { closest: () => ({}) }]) {
  assert.equal(isEditingField(target), true);
}
assert.equal(isEditingField({ tagName: 'BUTTON' }), false);
const bindings = SHORTCUTS.flatMap(s => s.keys);
assert.equal(new Set(bindings).size, bindings.length, 'No shortcut may own two actions');
console.log('Keyboard shortcut matching, modifier, typing and repeat safeguards passed.');
