import { GAMES, SITE, AUTHOR } from '../src/shared/games.js';

const DEFAULT_SITE_URL = 'https://jeux.platonformation.com';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonScript = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/**
 * Référencement : génère depuis src/shared/games.js (source unique)
 *  - la liste HTML du catalogue (marqueur <!--CATALOGUE-->),
 *  - les données structurées JSON-LD (<!--JSONLD-->),
 *  - la balise canonical / og:url (<!--SEO_HEAD-->) si SITE_URL est défini,
 *  - sitemap.xml et robots.txt au build.
 * SITE_URL = adresse publique finale du site de jeux, ex. SITE_URL=https://jeux.platonformation.com npm run build
 */
export default function platonSeo({ siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL } = {}) {
  const base = siteUrl.replace(/\/+$/, '');
  const open = GAMES.filter((g) => g.status === 'open');
  const soon = GAMES.filter((g) => g.status === 'building');
  const abs = (path) => `${base}${path}`;

  const catalogue = () => `
<ul class="cards">${open.map((g) => `
  <li class="card sketch-box">
    <h3>${esc(g.name)}</h3>
    <p class="tagline">${esc(g.tagline)}</p>
    <p>${esc(g.description)}</p>
    <p class="audience">${esc(g.audience)}</p>
    <a class="btn" href="${esc(g.url)}">Jouer à ${esc(g.name)}</a>
  </li>`).join('')}
</ul>
<h3 class="soon-title">En téraformation</h3>
<ul class="soon">${soon.map((g) => `<li>${esc(g.name)} <span>— bientôt disponible</span></li>`).join('')}</ul>`;

  const organization = {
    '@type': 'EducationalOrganization',
    '@id': `${SITE.url}#organization`,
    name: SITE.name,
    url: SITE.url,
  };
  const videoGame = (g) => ({
    '@type': 'VideoGame',
    name: g.name,
    description: g.seoDescription || g.description,
    url: abs(g.url),
    image: abs(g.image),
    inLanguage: 'fr',
    gamePlatform: 'Navigateur web',
    applicationCategory: 'EducationalGame',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
    audience: { '@type': 'EducationalAudience', audienceType: g.audience },
    publisher: { '@id': organization['@id'] },
  });
  const hubJsonLd = () => jsonScript({
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        name: 'Platon Jeux',
        url: abs('/'),
        inLanguage: 'fr',
        publisher: { '@id': organization['@id'] },
        author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
      },
      {
        '@type': 'ItemList',
        name: 'Catalogue des jeux éducatifs Platon Jeux',
        itemListElement: open.map((g, i) => ({ '@type': 'ListItem', position: i + 1, item: videoGame(g) })),
      },
    ],
  });
  const hubSeoHead = () => {
    const image = abs('/images/vaisseau.png');
    return `<link rel="canonical" href="${abs('/')}" />
    <meta property="og:url" content="${abs('/')}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="Le vaisseau de Platon, au cœur de Platon Jeux" />
    <meta name="twitter:image" content="${image}" />`;
  };
  const gameSeoHead = (g) => {
    const title = g.seoTitle || `${g.name} | Platon Jeux`;
    const description = g.seoDescription || g.description;
    const image = abs(g.image);
    const canonical = abs(g.url);
    return `<link rel="canonical" href="${esc(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Platon Jeux" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:alt" content="${esc(g.name)} — jeu éducatif Platon Jeux" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />`;
  };

  return {
    name: 'platon-seo',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html
        .replace('<!--CATALOGUE-->', catalogue())
        .replace('<!--SEO_HEAD-->', hubSeoHead())
        .replace('<!--JSONLD-->', hubJsonLd())
        .replace(/<!--GAME_SEO:([\w-]+)-->/g, (_, id) => {
          const game = open.find((g) => g.id === id);
          return game ? gameSeoHead(game) : '';
        })
        .replace(/<!--GAME_JSONLD:([\w-]+)-->/g, (_, id) => {
          const game = open.find((g) => g.id === id);
          return game ? jsonScript({ '@context': 'https://schema.org', ...videoGame(game) }) : '';
        }),
    },
    generateBundle() {
      const urls = ['/', ...open.map((g) => g.url)];
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(abs(u))}</loc></url>`).join('\n')}\n</urlset>\n`,
      });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${abs('/sitemap.xml')}\n` });
      const llms = [
        '# Platon Jeux',
        '',
        '> Des jeux éducatifs gratuits en français pour apprendre en pratiquant.',
        '',
        'Platon Jeux est une plateforme de jeux pédagogiques créée par Platon Formation.',
        'Les jeux s’adressent aux enfants, adolescents et adultes selon les activités.',
        '',
        '## Jeux disponibles',
        ...open.flatMap((g) => [`### ${g.name}`, `- URL : ${abs(g.url)}`, `- Public : ${g.audience}`, `- Présentation : ${g.description}`]),
        '',
        '## Site',
        `- Accueil : ${abs('/')}`,
        `- Éditeur : ${SITE.url}`,
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms });
    },
  };
}
