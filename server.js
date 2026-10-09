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
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; img-src 'self' data: blob:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'",
};
const PIXEL_SECURITY_HEADERS = {
  ...SECURITY_HEADERS,
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; img-src 'self' data: blob:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'self'",
};

function securityHeadersFor(url) {
  return /^\/games\/pixel(?:\/|$)/.test((url ?? '').split('?')[0]) ? PIXEL_SECURITY_HEADERS : SECURITY_HEADERS;
}

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  let file = resolve(ROOT, clean);
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null;   // pas de sortie de dist/
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

createServer((req, res) => {
  const securityHeaders = securityHeadersFor(req.url);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const [pathname, query = ''] = (req.url ?? '/').split('?');
  const canonicalPath = pathname === '/index.html' ? '/' : pathname.match(/^\/games\/(pixel|pirates|inventeurs)(?:\/index\.html)?$/)?.[0].replace(/(?:\/index\.html)?$/, '/') ?? null;
  if (canonicalPath && canonicalPath !== pathname) {
    res.writeHead(301, { Location: `${canonicalPath}${query ? `?${query}` : ''}`, ...securityHeaders }).end();
    return;
  }
  let file;
  try { file = resolveFile(req.url); } catch { res.writeHead(400).end(); return; }
  if (!file) {
    const page = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page introuvable | Platon Jeux</title><main><h1>Cette page n’existe pas</h1><p>Le lien est peut-être incorrect ou la page a été déplacée.</p><nav aria-label="Jeux Platon"><ul><li><a href="/">Accueil et catalogue</a></li><li><a href="/games/pixel/">PIXEL — apprendre le JavaScript</a></li><li><a href="/games/pirates/">Pirates des Tables — multiplications</a></li><li><a href="/games/inventeurs/">Les Inventeurs — géographie et inventions</a></li></ul></nav></main><style>body{max-width:42rem;margin:3rem auto;padding:0 1rem;font:1.1rem/1.6 system-ui,sans-serif;background:#e9d9ab;color:#3a2813}a{color:#8c3b1f}</style></html>';
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders }).end(page);
    return;
  }
  const ext = extname(file);
  const hashed = file.includes(`${sep}assets${sep}`);
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    ...securityHeaders,
  };
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  if (gzip) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy());
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}).listen(PORT, () => console.log(`Platon Jeux : http://localhost:${PORT}`));
