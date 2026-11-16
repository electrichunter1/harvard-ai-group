import { portalOrigin } from './catalog-config.js';

const list = document.querySelector('[data-catalog]');
const detail = document.querySelector('[data-detail]');
const siteRoot = new URL('../', import.meta.url);
const id = detail?.dataset.id || new URLSearchParams(location.search).get('id');
const validId = value => typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value);

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function link(href, label) {
  const anchor = node('a', label);
  anchor.href = href;
  return anchor;
}

function external(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

function entryLink(entry) {
  const section = { event: 'events', project: 'projects', profile: 'team' }[entry.kind];
  const url = new URL(section + '/view/', siteRoot);
  url.searchParams.set('id', entry.id);
  return link(url, entry.title);
}

function listRow(entry) {
  const isProfile = entry.kind === 'profile';
  const row = node(isProfile ? 'li' : 'article', '', isProfile ? '' : 'archive-row');
  const title = node('h3');
  title.append(entryLink(entry));
  row.dataset.id = entry.id;
  if (entry.date) row.dataset.date = entry.date;
  if (isProfile) {
    row.append(title, node('p', entry.category === 'Board' ? entry.summary : entry.category));
    return row;
  }
  const meta = node('div', '', 'archive-meta');
  const date = node('time', entry.dateLabel || entry.date);
  date.dateTime = entry.date || '';
  meta.append(entry.date ? date : node('span', entry.category), node('span', entry.date ? entry.category : entry.byline));
  const content = node('div');
  content.append(title, node('p', entry.summary));
  row.dataset.entry = entry.category;
  row.append(meta, content);
  return row;
}

function updateList(entries) {
  const items = list.matches('[data-items]') ? list : list.querySelector('[data-items]');
  const rows = new Map([...items.children].map(row => [row.dataset.id, row]));
  for (const entry of entries) {
    const old = rows.get(entry.id);
    if (entry.archived) {
      old?.remove();
    } else if (old) {
      old.replaceWith(listRow(entry));
    } else {
      items.prepend(listRow(entry));
    }
  }
  if (list.dataset.catalog === 'event') {
    const date = row => row.dataset.date || row.querySelector('time')?.dateTime || '';
    items.append(...[...items.children].sort((a, b) => date(b).localeCompare(date(a))));
  }
  const filters = list.querySelector('.filters');
  if (!filters) return;
  const categories = new Set([...items.children].map(row => row.dataset.entry).filter(Boolean));
  const shown = new Set([...filters.querySelectorAll('[data-filter]')].map(button => button.dataset.filter));
  for (const category of categories) {
    if (shown.has(category)) continue;
    const button = node('button', category);
    button.type = 'button';
    button.dataset.filter = category;
    button.setAttribute('aria-pressed', 'false');
    filters.append(button);
  }
  filters.querySelector('[aria-pressed="true"]')?.click();
}

function updateDetail(entry) {
  const body = detail.querySelector('[data-entry-body]');
  if (entry.archived) {
    body.replaceChildren(node('p', 'This entry is currently unavailable.'));
    return;
  }
  detail.querySelector('[data-entry-title]').textContent = entry.title;
  detail.querySelector('[data-entry-label]').textContent = entry.dateLabel || entry.date || entry.category;
  document.title = entry.title + ' · Harvard AI Group · Draft for review';
  const items = [node('p', entry.summary, 'intro')];
  if (entry.byline) items.push(node('p', entry.byline, 'meta'));
  if (entry.body) items.push(node('p', entry.body));
  const href = external(entry.link);
  if (href) items.push(link(href, entry.kind === 'event' ? 'Event link' : 'Related link'));
  const oldImage = body.querySelector('img');
  if (oldImage) items.splice(1, 0, oldImage);
  body.replaceChildren(...items);
}

if (portalOrigin && (list || (detail && validId(id)))) {
  const kind = list?.dataset.catalog || detail.dataset.detail;
  const endpoint = new URL('/public/content', portalOrigin);
  endpoint.searchParams.set('kind', kind);
  if (detail) endpoint.searchParams.set('id', id);
  try {
    const response = await fetch(endpoint, { credentials: 'omit', signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const { entries } = await response.json();
      const matching = entries.filter(entry => entry.kind === kind && validId(entry.id));
      if (list) updateList(matching);
      else if (matching.length) updateDetail(matching[0]);
    }
  } catch {
    // The static archive remains available when the content service is unreachable.
  }
}
