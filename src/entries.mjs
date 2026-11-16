import { catalog } from './content.mjs';

export const sections = { event: 'events', project: 'projects', profile: 'team' };
export const sectionNames = { event: 'Events', project: 'Projects', profile: 'People' };
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export const entryPath = ({ kind, id }) => '/' + sections[kind] + '/' + id + '/';

function detailPage(kind, entry) {
  const heading = entry?.title ?? sectionNames[kind];
  const related = catalog.find(item => item.kind === (entry?.profile ? 'profile' : 'project') &&
    item.id === (entry?.profile || entry?.project));
  const content = entry ? `<p class="intro">${escape(entry.summary)}</p>
    ${entry.image ? `<img class="detail-image" src="/assets/${escape(entry.image)}" alt="${escape(entry.alt)}">` : ''}
    ${related ? `<p data-entry-related>${entry.profile ? 'Fellow' : 'Fellowship project'} · <a href="${entryPath(related)}">${escape(related.title)}</a></p>` : ''}
    ${entry.link ? `<p><a class="text-link" href="${escape(entry.link)}">${kind === 'event' ? 'Original event announcement' : 'Read the original work'}</a></p>` : ''}` :
    '<p role="status">This entry is currently unavailable.</p>';
  return `<article data-detail="${kind}" data-id="${entry?.id ?? ''}">
    <header class="hero detail-banner"><div class="shell"><p class="meta" data-entry-label>${escape(entry?.dateLabel || entry?.category || '')}</p><h1 data-entry-title>${escape(heading)}</h1></div></header>
    <div class="shell detail-content"><p><a class="text-link" href="/${sections[kind]}/">Back to ${sectionNames[kind].toLowerCase()}</a></p>
      <div class="entry-body" data-entry-body>${content.replace(/^ +$/gm, '')}</div>
    </div>
  </article>`;
}

export function publicEntryRoutes(layout) {
  const entries = catalog.map(entry => [entryPath(entry), entry.kind, entry]);
  for (const [kind, section] of Object.entries(sections)) entries.push(['/' + section + '/view/', kind, null]);
  return Object.fromEntries(entries.map(([route, kind, entry]) => [
    route, layout(route, escape(entry?.title || sectionNames[kind]) + ' · Harvard AI Group',
      escape(entry?.summary || 'Harvard AI Group'), detailPage(kind, entry)),
  ]));
}
