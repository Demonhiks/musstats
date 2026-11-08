/**
 * Снимает скриншоты приложения через headless Edge + CDP.
 *
 * Пример:
 *   node tools/shot.mjs --url="http://[::1]:4173/?demo=1" --out=.shots/overview.png \
 *     --eval="document.querySelectorAll('.tabbar__item')[1].click()" --wait=700
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE = process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9334;

const raw = process.argv.slice(2);
const args = {};
for (const item of raw) {
  const eq = item.indexOf('=');
  args[item.slice(0, eq).replace(/^--/, '')] = item.slice(eq + 1);
}

const url = args.url ?? 'about:blank';
const out = args.out ?? 'shot.png';
const width = Number(args.width ?? 430);
const height = Number(args.height ?? 932);
const wait = Number(args.wait ?? 900);
const expression = args.eval ?? '';

const profile = mkdtempSync(join(tmpdir(), 'edge-ms-'));

const browser = spawn(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function targetSocket() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* браузер ещё поднимается */
    }
    await sleep(150);
  }
  throw new Error('Не дождался DevTools');
}

const socket = new WebSocket(await targetSocket());
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const events = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  const waiter = events.get(message.method);
  if (waiter) {
    events.delete(message.method);
    waiter(message.params);
  }
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function once(method) {
  return new Promise((resolve) => events.set(method, resolve));
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 2,
  mobile: false,
});

const loaded = once('Page.loadEventFired');
await send('Page.navigate', { url });
await Promise.race([loaded, sleep(6000)]);
await sleep(wait);

if (expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  const value = result?.result?.value;
  if (args.evalOut && typeof value === 'string') {
    const base64 = value.startsWith('data:') ? value.slice(value.indexOf(',') + 1) : value;
    writeFileSync(args.evalOut, Buffer.from(base64, 'base64'));
    console.log(`saved eval output ${args.evalOut}`);
  } else if (value !== undefined && value !== null) {
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  }
  await sleep(wait);
}

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(`saved ${out}`);

socket.close();
browser.kill();
process.exit(0);
