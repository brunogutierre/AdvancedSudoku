import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Minimal static server for the production build, mounted under the GitHub Pages base path.
 * Paths with an extension are files (404 when missing); anything else falls back to
 * index.html, like a SPA host. Usage: tsx e2e/server.ts <port>
 */
const BASE = '/AdvancedSudoku/';
const ROOT = join(import.meta.dirname, '../dist/AdvancedSudoku/browser');
const PORT = Number(process.argv[2] ?? 4300);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (!path.startsWith(BASE)) {
    res.writeHead(302, { location: BASE }).end();
    return;
  }
  const relative = normalize(path.slice(BASE.length)).replace(/^(\.\.[/\\])+/, '');
  const file = extname(relative) ? relative : 'index.html';
  try {
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}${BASE}`));
