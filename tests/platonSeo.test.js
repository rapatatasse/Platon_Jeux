import { test } from 'node:test';
import assert from 'node:assert/strict';
import platonSeo from '../vite-plugins/platonSeo.js';

const parseJsonLd = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);

test('le hub reçoit une canonique absolue et un catalogue VideoGame complet', () => {
  const plugin = platonSeo({ siteUrl: 'https://jeux.example' });
  const html = plugin.transformIndexHtml.handler('<head><!--SEO_HEAD--><!--JSONLD--></head>');
  const data = parseJsonLd(html);
  const list = data['@graph'].find((entry) => entry['@type'] === 'ItemList');

  assert.match(html, /<link rel="canonical" href="https:\/\/jeux\.example\/"/);
  assert.match(html, /name="twitter:image"/);
  assert.equal(list.itemListElement.length, 3);
  assert.equal(list.itemListElement[0].item.url, 'https://jeux.example/games/pixel/');
  assert.equal(list.itemListElement[0].item.offers.price, 0);
  assert.ok(list.itemListElement[0].item.image);
});

test('chaque page de jeu reçoit ses métadonnées sociales et ses données VideoGame', () => {
  const plugin = platonSeo({ siteUrl: 'https://jeux.example' });
  const html = plugin.transformIndexHtml.handler('<head><!--GAME_SEO:pixel--><!--GAME_JSONLD:pixel--></head>');
  const data = parseJsonLd(html);

  assert.match(html, /<link rel="canonical" href="https:\/\/jeux\.example\/games\/pixel\/"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.equal(data['@type'], 'VideoGame');
  assert.equal(data.gamePlatform, 'Navigateur web');
  assert.equal(data.applicationCategory, 'EducationalGame');
});

test('le build émet un sitemap, un robots.txt et un résumé llms.txt cohérents', () => {
  const plugin = platonSeo({ siteUrl: 'https://jeux.example' });
  const assets = [];
  plugin.generateBundle.call({ emitFile: (asset) => assets.push(asset) });
  const asset = (name) => assets.find((entry) => entry.fileName === name).source;

  assert.match(asset('robots.txt'), /Sitemap: https:\/\/jeux\.example\/sitemap\.xml/);
  assert.match(asset('sitemap.xml'), /https:\/\/jeux\.example\/games\/inventeurs\//);
  assert.match(asset('llms.txt'), /### PIXEL[\s\S]*Public : Ados et adultes/);
});
