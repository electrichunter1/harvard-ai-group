const motion = matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#primary-nav');
const header = document.querySelector('.masthead');
menu.hidden = false;

function menuOpen(open) {
  menu.setAttribute('aria-expanded', String(open));
  header.classList.toggle('menu-open', open);
}

menu.addEventListener('click', () => menuOpen(menu.getAttribute('aria-expanded') === 'false'));
nav.addEventListener('click', event => {
  if (event.target.closest('a')) menuOpen(false);
});
header.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    menuOpen(false);
    menu.focus();
  }
});

for (const archive of document.querySelectorAll('[data-archive]')) {
  const filters = archive.querySelector('.filters');
  const status = archive.querySelector('[data-filter-status]');
  filters.hidden = false;
  filters.addEventListener('click', event => {
    const selected = event.target.closest('[data-filter]');
    if (!selected) return;
    const filter = selected.dataset.filter;
    const entries = [...archive.querySelectorAll('[data-entry]')];
    for (const option of filters.querySelectorAll('button')) option.setAttribute('aria-pressed', String(option === selected));
    for (const entry of entries) entry.hidden = filter !== 'All' && entry.dataset.entry !== filter;
    const count = entries.filter(entry => !entry.hidden).length;
    status.textContent = `${count} ${count === 1 ? 'result' : 'results'}`;
  });
}

const now = Date.now();
for (const notice of document.querySelectorAll('[data-upcoming]')) {
  notice.hidden = now >= Date.parse(notice.dataset.expiry);
}
for (const item of document.querySelectorAll('[data-event]')) {
  if (now >= Date.parse(item.dataset.expiry)) item.querySelector('[data-event-status]').textContent += ' · Past event';
  item.querySelector('[data-rsvp]').hidden = now >= Date.parse(item.dataset.cutoff);
}

const sculpture = document.querySelector('[data-emblem]');
if (sculpture) {
  import('./sculpture.js').then(({ mountSculpture }) => mountSculpture(sculpture, motion));
}
