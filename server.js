import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { extname, join, normalize, resolve, sep } from 'node:path';

/**
 * Serveur de production (Node.js, aucune dépendance) : sert le dossier dist/.
 * Hébergement type Infomaniak : `npm run build` puis `npm start` (le port vient de process.env.PORT).
 */
const ROOT = resolve(import.meta.dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'",
};

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  let file = resolve(ROOT, clean);
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null;   // pas de sortie de dist/
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let file;
  try { file = resolveFile(req.url); } catch { res.writeHead(400).end(); return; }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }).end('404 — page introuvable');
    return;
  }
  const ext = extname(file);
  const hashed = file.includes(`${sep}assets${sep}`);
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    ...SECURITY_HEADERS,
  };
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  if (gzip) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy());
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}).listen(PORT, () => console.log(`Platon Jeux : http://localhost:${PORT}`));
