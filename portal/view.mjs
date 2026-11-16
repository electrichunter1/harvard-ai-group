import { escape as e } from '../src/entries.mjs';

const labels = { event: 'Event', project: 'Project', profile: 'Profile' };
const messages = {
  submitted: 'Your request is with the board.', withdrawn: 'Request withdrawn.',
  published: 'Published to the public website.', declined: 'Request declined.',
  archived: 'Entry archived.', access: 'Access updated.',
};

export function page(title, content, member, publicSite) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)} · Harvard AI Group</title>
  <link rel="stylesheet" href="/portal/style.css"></head>
  <body><header><div class="shell header"><a href="/portal/">Harvard AI Group</a>
  ${member ? '<a href="/cdn-cgi/access/logout">Sign out</a>' : ''}</div></header>
  <main class="shell"><h1>${e(title)}</h1>${content}</main>
  <footer class="shell"><a href="${e(publicSite)}">Public website</a></footer></body></html>`;
}

const hidden = (name, value) => `<input type="hidden" name="${name}" value="${e(value)}">`;
const form = (action, fields) => `<form method="post" action="/portal/${action}">${fields}</form>`;
const button = (title, value) => `<button type="submit"${value ? ` name="decision" value="${value}"` : ''}>${title}</button>`;

function field(label, name, value, attrs = '') {
  return `<label>${label}<input name="${name}" value="${e(value)}" ${attrs}></label>`;
}

function fields(kind, data = {}) {
  return hidden('kind', kind) +
    field(kind === 'profile' ? 'Display name' : 'Title', 'title', data.title, 'required maxlength="120"') +
    field(kind === 'profile' ? 'Role or affiliation' : 'Category', 'category', data.category, 'required maxlength="48"') +
    (kind === 'event' ? field('Event date', 'date', data.date, 'type="date" required') : '') +
    (kind === 'project' ? field('Author or team', 'byline', data.byline, 'required maxlength="120"') : '') +
    `<label>Summary<textarea name="summary" required maxlength="290" rows="2">${e(data.summary)}</textarea></label>` +
    `<label>Details <small>Optional</small><textarea name="body" maxlength="3000" rows="6">${e(data.body)}</textarea></label>` +
    field('Related link (optional)', 'link', data.link, 'type="url" maxlength="500" placeholder="https://"');
}

function requestList(requests, board) {
  if (!requests.length) return '<p>No requests yet.</p>';
  return `<ul class="records">${requests.map(request => {
    const entry = JSON.parse(request.payload);
    const title = board && request.status === 'pending' ?
      `<a href="/portal/review?id=${e(request.id)}">${e(entry.title)}</a>` : e(entry.title);
    const withdraw = request.status === 'pending' && !board ?
      form('withdraw', hidden('id', request.id) + button('Withdraw request')) : '';
    return `<li><div><strong>${title}</strong><p>${labels[entry.kind]} · ${e(request.status)}${board ? ' · ' + e(request.author) : ''}</p></div>${withdraw}</li>`;
  }).join('')}</ul>`;
}

export function dashboard(member, requests, entries, accounts, message) {
  const board = member.role !== 'member';
  const nav = board ? '<nav aria-label="Workspace"><a href="#requests">Requests</a><a href="#published">Published entries</a>' +
    (member.role === 'owner' ? '<a href="#access">Access</a>' : '') + '</nav>' : '';
  const memberForms = ['profile', 'project'].map(kind => `<details><summary>Submit a ${labels[kind].toLowerCase()}</summary>
    <p>The board reviews your request before it appears on the public site. Include only information you want to share publicly.</p>
    ${form('submit', fields(kind) + button('Send for review'))}</details>`).join('');
  const published = `<section id="published"><h2>Published entries</h2>
    <nav aria-label="Create an entry">${Object.entries(labels).map(([id, label]) => `<a class="button" href="/portal/edit?kind=${id}">New ${label.toLowerCase()}</a>`).join('')}</nav>
    ${Object.entries(labels).map(([kind, label]) => `<details><summary>${label === 'Profile' ? 'Profiles' : label + 's'}</summary><ul class="records">
    ${entries.filter(entry => entry.kind === kind).map(entry => `<li><a href="/portal/edit?kind=${kind}&amp;id=${e(entry.id)}">${e(entry.title || 'Archived entry')}${entry.archived ? ' (archived)' : ''}</a></li>`).join('')}</ul></details>`).join('')}
    </section>`;
  const access = `<section id="access"><h2>Portal access</h2>
    <p>Authorize a member’s verified sign-in address. Share the portal link with them directly.</p>
    ${form('access', field('Email address', 'email', '', 'type="email" required maxlength="254"') +
      '<label>Role<select name="role"><option value="member">Member</option><option value="board">Board</option></select></label>' + button('Save access'))}
    <ul class="records">${accounts.map(account => `<li><div><strong>${e(account.email)}</strong><p>${e(account.role)}</p></div>
      ${form('access', hidden('email', account.email) + hidden('role', 'revoke') + button('Revoke access'))}</li>`).join('')}</ul></section>`;
  return `<p class="identity">Signed in as ${e(member.email)} · ${e(member.role)}</p>
    ${message && Object.hasOwn(messages, message) ? `<p role="status" class="notice">${messages[message]}</p>` : ''}
    ${nav}${board ? '' : `<section><h2>Share your work</h2>${memberForms}</section>`}
    <section id="requests"><h2>${board ? 'Member requests' : 'My requests'}</h2>${requestList(requests, board)}</section>
    ${board ? published : ''}${member.role === 'owner' ? access : ''}`;
}

export function editor(kind, entry, submission) {
  const heading = submission ? 'Review request' : entry ? 'Edit ' + labels[kind].toLowerCase() : 'New ' + labels[kind].toLowerCase();
  const data = submission ? JSON.parse(submission.payload) : entry;
  const identifiers = hidden('id', submission?.id ?? entry?.id ?? crypto.randomUUID()) +
    (!submission ? hidden('revision', entry?.revision ?? 0) : '');
  const support = submission ? 'Submitted by ' + submission.author : 'Published content appears on the public website.';
  const save = form(submission ? 'review' : 'save',
    identifiers + fields(kind, data) + button(entry && !entry.archived ? 'Save changes' : 'Publish', 'publish'));
  const dismiss = submission ? form('review', identifiers + button('Decline request', 'decline')) :
    entry && !entry.archived ? form('archive', identifiers + hidden('kind', kind) + button('Archive entry')) : '';
  return [heading, `<p><a href="/portal/">Back to workspace</a></p><p>${e(support)}</p>${save}${dismiss}`];
}

export const css = `
:root{color-scheme:light;--blue:#183bb8;--ink:#182348;--paper:#faf9f5;font-family:system-ui,sans-serif;color:var(--ink);background:var(--paper)}
*{box-sizing:border-box}
body{margin:0;line-height:1.6;overflow-wrap:anywhere}
.shell{width:min(100% - 2.25rem,48rem);margin-inline:auto}
header{background:var(--blue);color:white;padding:1.1rem 0}
.header{display:flex;justify-content:space-between;gap:1rem;align-items:center}
.header a{color:white}
.header a:first-child{font-weight:750;font-size:1.05rem}
main{padding-block:2rem 3rem;min-height:65vh}
h1{font-size:clamp(2.2rem,7vw,4rem);line-height:1.02;margin:0 0 1rem}
h2{font-size:1.5rem;margin:0 0 .8rem}
a{color:var(--blue);text-underline-offset:.19em}
:focus-visible{outline:3px solid #ad581c;outline-offset:3px}
section{margin-block:2.5rem}
nav{display:flex;gap:.75rem 1.3rem;flex-wrap:wrap;margin:1.2rem 0}
details{margin:.65rem 0;padding:.7rem .85rem;background:white}
summary{cursor:pointer;font-weight:700}
form{display:grid;gap:.9rem;margin:.85rem 0 1.2rem;max-width:38rem}
label{display:grid;font-weight:650;gap:.3rem}
small{font-weight:400}
input,textarea,select{font:inherit;padding:.55rem .65rem;border:1px solid #79829a;color:inherit;background:white;min-width:0}
button,.button{display:inline-block;justify-self:start;font:inherit;font-weight:700;padding:.45rem .85rem;border:1px solid var(--blue);background:var(--blue);color:white;cursor:pointer;text-decoration:none}
.records{display:grid;gap:.7rem;padding:0;list-style:none}
.records li{display:flex;justify-content:space-between;align-items:center;column-gap:1rem;row-gap:.5rem;flex-wrap:wrap}
.records p,.records form{margin:0}
.identity{color:#4e5871}
.notice{background:#e6edff;padding:.7rem .9rem}
footer{padding-block:1rem 2rem}
`;
