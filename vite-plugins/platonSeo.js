import { GAMES, SITE, AUTHOR } from '../src/shared/games.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Référencement : génère depuis src/shared/games.js (source unique)
 *  - la liste HTML du catalogue (marqueur <!--CATALOGUE-->),
 *  - les données structurées JSON-LD (<!--JSONLD-->),
 *  - la balise canonical / og:url (<!--SEO_HEAD-->) si SITE_URL est défini,
 *  - sitemap.xml et robots.txt au build.
 * SITE_URL = adresse publique finale du site de jeux, ex. SITE_URL=https://jeux.platonformation.com npm run build
 */
export default function platonSeo({ siteUrl = process.env.SITE_URL?.replace(/\/$/, '') } = {}) {
  const open = GAMES.filter((g) => g.status === 'open');
  const soon = GAMES.filter((g) => g.status === 'building');
  const abs = (path) => (siteUrl ? `${siteUrl}${path}` : undefined);

  const catalogue = () => `
<ul class="cards">${open.map((g) => `
  <li class="card sketch-box">
    <h3>${esc(g.name)}</h3>
    <p class="tagline">${esc(g.tagline)}</p>
    <p>${esc(g.description)}</p>
    <p class="audience">${esc(g.audience)}</p>
    <a class="btn" href="${g.url}">Jouer à ${esc(g.name)}</a>
  </li>`).join('')}
</ul>
<h3 class="soon-title">En téraformation</h3>
<ul class="soon">${soon.map((g) => `<li>${esc(g.name)} <span>— bientôt disponible</span></li>`).join('')}</ul>`;

  const jsonLd = () => {
    const org = { '@type': 'EducationalOrganization', name: SITE.name, url: SITE.url };
    const graph = [
      org,
      { '@type': 'WebSite', name: 'Platon Jeux', inLanguage: 'fr', publisher: org, author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url }, ...(abs('/') && { url: abs('/') }) },
      {
        '@type': 'ItemList',
        name: 'Catalogue des jeux éducatifs Platon Jeux',
        itemListElement: open.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'VideoGame', name: g.name, description: g.description, inLanguage: 'fr', isAccessibleForFree: true, audience: { '@type': 'EducationalAudience', audienceType: g.audience }, publisher: org, ...(abs(g.url) && { url: abs(g.url) }) },
        })),
      },
    ];
    return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
  };

  const seoHead = () => (siteUrl ? `<link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n    <meta property="og:image" content="${siteUrl}/images/vaisseau.png" />` : '');

  return {
    name: 'platon-seo',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace('<!--CATALOGUE-->', catalogue()).replace('<!--JSONLD-->', jsonLd()).replace('<!--SEO_HEAD-->', seoHead()),
    },
    generateBundle() {
      const lines = ['User-agent: *', 'Allow: /'];
      if (siteUrl) {
        lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
        const urls = ['/', ...open.map((g) => g.url)];
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
        });
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: lines.join('\n') + '\n' });
    },
  };
}
