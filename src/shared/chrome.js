import './chrome.css';
import { SITE, AUTHOR } from './games.js';

/**
 * Barre minimale commune aux jeux : retour à la carte stellaire + lien vers le centre de formation.
 */
export function mountGameChrome({ container = document.body } = {}) {
  const bar = document.createElement('nav');
  bar.className = 'platon-chrome';
  bar.setAttribute('aria-label', 'Navigation Platon');
  bar.innerHTML = `
    <a class="platon-chrome__back" href="/" title="Retourner à la carte stellaire">&larr; Carte stellaire</a>
    <a class="platon-chrome__site" href="${SITE.url}" target="_blank" rel="noopener">${SITE.name}</a>
    <span class="platon-chrome__by">Créé par <a href="${AUTHOR.url}" target="_blank" rel="noopener">${AUTHOR.name}</a></span>`;
  container.appendChild(bar);
  return bar;
}
