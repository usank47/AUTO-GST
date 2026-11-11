import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const books = await mkdtemp(join(tmpdir(), 'auto-gst-catalogue-test-'));
const server = spawn(process.execPath, [fileURLToPath(new URL('../server.js', import.meta.url))], {
  env: { ...process.env, FGSB_HOME: books, FGSB_ALLOW_UNSAFE_LAN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  const port = await new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error(`Catalogue test server did not start: ${log}`)), 15000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Catalogue test server exited (${code}): ${log}`)); });
    server.stderr.on('data', chunk => { log += chunk; });
    server.stdout.on('data', chunk => {
      log += chunk;
      const match = log.match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  const url = `http://127.0.0.1:${port}/api/products`;
  const save = product => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product),
    signal: AbortSignal.timeout(5000),
  });
  const first = { name: 'Test brake pad', partNo: '0001A', altPartNo: 'ALT-1; ALT-2', brand: 'Test Brand', compatibility: 'Swift petrol 1.2', stock: 5 };
  const created = await save(first);
  assert.equal(created.status, 200);
  const { id } = await created.json();
  assert.ok(id);
  assert.equal((await save({ ...first, id, compatibility: 'Baleno petrol 1.2' })).status, 200);
  const conflict = await save({ name: 'Duplicate part', partNo: '0001a', brand: 'test brand' });
  assert.equal(conflict.status, 409);
  assert.match((await conflict.json()).error, /already belongs to Test brake pad/);
  assert.equal((await save({ name: 'Malformed', partNo: ['123'] })).status, 400);
  assert.equal((await save({ name: 'Other brand', partNo: '0001A', brand: 'Other' })).status, 200);
  assert.equal((await save({ name: 'Legacy part', stock: 2 })).status, 200);
  const saved = await (await fetch(url, { signal: AbortSignal.timeout(5000) })).json();
  assert.equal(saved.length, 3);
  assert.deepEqual(saved.find(product => product.id === id), { ...first, id, compatibility: 'Baleno petrol 1.2' });
  assert.equal(saved.find(product => product.name === 'Legacy part').stock, 2);
  console.log('Product API creates and updates catalogue data, rejects conflicts, and accepts legacy products.');
} finally {
  if (server.exitCode === null && server.signalCode === null && server.pid) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
  await rm(books, { recursive: true, force: true });
}
