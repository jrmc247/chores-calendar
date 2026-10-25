// Serves the built app and remembers which chores were ticked off, in one JSON file.
// No dependencies: run it with `node server/server.mjs`.
//
// Settings (environment variables):
//   PORT        default 8080
//   STATIC_DIR  the built app, default dist/chores-calendar/browser
//   DATA_FILE   where ticks are saved, default server/data/done.json

import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 8080);
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? join(root, 'dist/chores-calendar/browser'));
const DATA_FILE = resolve(process.env.DATA_FILE ?? join(root, 'server/data/done.json'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

// ---- Ticks: { "blue:Lüften@2026-10-25": 1, ... } ----

/** How often each chore was ticked off, keyed like the app's ChoreStore. Zero counts are left out. */
let done = await loadDone();
/** Writes one after the other, so two quick ticks can't interleave. */
let saving = Promise.resolve();

async function loadDone() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Cannot read ${DATA_FILE}: ${error.message}`);
  }
}

/** Writes to a temporary file first, so a power cut never leaves a half-written file. */
function saveDone() {
  saving = saving.then(async () => {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(`${DATA_FILE}.tmp`, JSON.stringify(done, null, 2) + '\n');
    await rename(`${DATA_FILE}.tmp`, DATA_FILE);
  });
  return saving;
}

async function handleApi(request, response) {
  if (request.method === 'GET') return sendJson(response, 200, done);
  if (request.method !== 'PUT') return sendJson(response, 405, { error: 'Use GET or PUT' });

  // PUT { "key": "blue:Lüften@2026-10-25", "count": 1 }
  const body = await readBody(request).catch(() => null);
  const { key, count } = body ?? {};
  const isValid =
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 300 &&
    Number.isInteger(count) &&
    count >= 0 &&
    count <= 100;
  if (!isValid) return sendJson(response, 400, { error: 'Expected { key, count }' });

  if (count === 0) delete done[key];
  else done[key] = count;
  await saveDone();
  sendJson(response, 200, done);
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let text = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      text += chunk;
      if (text.length > 10_000) reject(new Error('Body too large'));
    });
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': MIME_TYPES['.json'],
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

// ---- The built app ----

async function serveFile(request, response, pathname) {
  const path = resolve(
    STATIC_DIR,
    '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname),
  );
  // Never serve anything outside the app folder.
  if (path !== STATIC_DIR && !path.startsWith(STATIC_DIR + sep)) return notFound(response);

  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) return notFound(response);

  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(path)] ?? 'application/octet-stream',
    'Content-Length': info.size,
    // chores.json and index.html change without a rebuild; the other files have hashed names.
    'Cache-Control': /\.(html|json)$/.test(path) ? 'no-cache' : 'public, max-age=31536000',
  });
  if (request.method === 'HEAD') return response.end();
  createReadStream(path).pipe(response);
}

function notFound(response) {
  response.writeHead(404, { 'Content-Type': MIME_TYPES['.txt'] });
  response.end('Not found');
}

const server = createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url, 'http://localhost');
    // The app may live in a subfolder (e.g. /chores/), so match the API by its ending.
    if (pathname.endsWith('/api/done')) return await handleApi(request, response);
    if (request.method !== 'GET' && request.method !== 'HEAD') return notFound(response);
    await serveFile(request, response, decodeURIComponent(pathname));
  } catch (error) {
    console.error(error);
    if (!response.headersSent) sendJson(response, 500, { error: 'Server error' });
    else response.end();
  }
});

server.listen(PORT, () => {
  console.log(`Chores calendar on http://localhost:${PORT}/`);
  console.log(`  app:   ${STATIC_DIR}`);
  console.log(`  ticks: ${DATA_FILE}`);
});
