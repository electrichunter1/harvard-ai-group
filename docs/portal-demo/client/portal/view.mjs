import { escape as e } from '../src/html.mjs';
import { siteCopy, copyFieldLabels } from '../src/site-copy.mjs';
import { requestTypes, roleLabels, canEdit, reviewScope, canEditCopy, typeFor } from './request-types.mjs';

const messages = {
  submitted: 'Your request is with the board.', withdrawn: 'Request withdrawn.',
  submittedFellow: 'Your proposal is with the Fellow manager.',
  published: 'Published to the public website.', declined: 'Request declined.',
  archived: 'Entry deleted from the site. It can be restored.', access: 'Access updated.',
  copy: 'Website copy updated.',
  approved: 'Fellowship request approved privately.',
};

export function page(title, content, member, publicSite) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)} · Harvard AI Group</title>
  <link rel="stylesheet" href="/portal/style.css">${member?.role === 'member' ? '<script defer src="/portal/request.js"></script>' : ''}</head>
  <body><header><div class="shell header"><a href="/portal/">Harvard AI Group</a>
  ${member ? '<a href="/cdn-cgi/access/logout">Sign out</a>' : ''}</div></header>
  <main class="shell"><h1>${e(title)}</h1>${content}</main>
  <footer class="shell"><a href="${e(publicSite)}">Public website</a></footer></body></html>`;
}

const hidden = (name, value) => `<input type="hidden" name="${name}" value="${e(value)}">`;
const form = (action, fields) => `<form method="post" action="/portal/${action}">${fields}</form>`;
const button = (title, value) => `<button type="submit"${value ? ` name="decision" value="${value}"` : ''}>${title}</button>`;
const back = '<p><a href="/portal/">Back to workspace</a></p>';

function field([name, label, limit, type = 'text', optional = false], value) {
  const inputAttrs = `name="${name}" maxlength="${limit}" ${optional ? '' : 'required'}`;
  const control = type === 'textarea' ? `<textarea ${inputAttrs} rows="${limit > 500 ? 6 : 2}">${e(value)}</textarea>` :
    `<input ${inputAttrs} type="${type}" value="${e(value)}"${type === 'url' ? ' placeholder="https://"' : ''}>`;
  return `<label>${label}${optional ? ' <small>(optional)</small>' : ''}${control}</label>`;
}

function fields(type, data = {}) {
  return hidden('kind', type) + requestTypes[type].fields.map(spec => field(spec, data[spec[0]])).join('');
}

export function requestPicker(root) {
  const picker = root.querySelector('[data-request-select]');
  if (!picker) return;
  const sections = root.querySelectorAll('[data-request-panel]');
  const update = () => {
    for (const section of sections) section.hidden = section.dataset.requestPanel !== picker.value;
  };
  picker.addEventListener('change', update);
  update();
}

function requestForm() {
  return `<section><h2>Submit a request</h2>
    <p>Choose what you’re requesting to see what to include.</p>
    <label class="request-select">Request type<select data-request-select><option value="">Choose a type</option>
      ${Object.entries(requestTypes).map(([type, { label }]) => `<option value="${type}">${label}</option>`).join('')}
    </select></label>
    ${Object.entries(requestTypes).map(([type, { label }]) => `<div data-request-panel="${type}">
      <h3>${label} details</h3><p>${type === 'fellowship' ? 'A Fellow manager reviews your proposal privately.' : 'The board reviews this before publishing. Include information you’re ready to share publicly.'}</p>
      ${form('submit', fields(type) + button('Send for review'))}</div>`).join('')}
  </section>`;
}

function requestList(requests, board) {
  if (!requests.length) return '<p>No requests yet.</p>';
  return `<ul class="records">${requests.map(request => {
    const entry = JSON.parse(request.payload);
    const title = board && request.status === 'pending' ?
      `<a href="/portal/review?id=${e(request.id)}">${e(entry.title)}</a>` : e(entry.title);
    const withdraw = request.status === 'pending' && !board ?
      form('withdraw', hidden('id', request.id) + button('Withdraw request')) : '';
    return `<li><div><strong>${title}</strong><p>${requestTypes[typeFor(entry)].label} · ${e(request.status)}${board ? ' · ' + e(request.author) : ''}</p></div>${withdraw}</li>`;
  }).join('')}</ul>`;
}

function accessPanel(member, accounts) {
  const roles = Object.entries(roleLabels).filter(([role]) => role !== 'manager' || member.primary);
  return `<section id="access"><h2>Portal access</h2>
    <p>Authorize a verified sign-in address. Share the private portal link with the person directly.</p>
    ${form('access', field(['email', 'Email address', 254, 'email']) +
      `<label>Role<select name="role">${roles.map(([role, label]) => `<option value="${role}">${label}</option>`).join('')}</select></label>` + button('Save access'))}
    <ul class="records">${accounts.map(account => `<li><div><strong>${e(account.email)}</strong><p>${roleLabels[account.role]}</p></div>
      ${account.email !== member.email && (account.role !== 'manager' || member.primary) ?
        form('access', hidden('email', account.email) + hidden('role', 'revoke') + button('Revoke access')) : ''}</li>`).join('')}</ul></section>`;
}

export function dashboard(member, requests, entries, accounts, message) {
  const board = canEdit(member.role);
  const manager = member.role === 'manager';
  const reviewing = Boolean(reviewScope(member.role));
  const copyPages = Object.entries(siteCopy).filter(([area]) => canEditCopy(member.role, area));
  const nav = reviewing ? '<nav aria-label="Workspace"><a href="#requests">Requests</a>' +
    (board ? '<a href="#published">Published entries</a>' : '') +
    (copyPages.length ? '<a href="#website-copy">Website copy</a>' : '') +
    (manager ? '<a href="#access">Access</a>' : '') + '</nav>' : '';
  const websiteCopy = `<section id="website-copy"><h2>Website copy</h2>
    <p>Edit copy for the public pages, including program and application information.</p>
    <nav aria-label="Edit public pages">${copyPages.map(([area, { label }]) => `<a class="button" href="/portal/copy?area=${area}">${label}</a>`).join('')}</nav></section>`;
  const publishTypes = Object.entries(requestTypes).filter(([type]) => type !== 'fellowship');
  const published = `<section id="published"><h2>Published entries</h2>
    <nav aria-label="Create an entry">${publishTypes.map(([type, { label }]) => `<a class="button" href="/portal/edit?kind=${type}">New ${label.toLowerCase()}</a>`).join('')}</nav>
    ${publishTypes.map(([type, { label }]) => `<details><summary>${label}s</summary><ul class="records">
    ${entries.filter(entry => typeFor(entry) === type).map(entry => `<li><a href="/portal/edit?kind=${type}&amp;id=${e(entry.id)}">${e(entry.title)}${entry.archived ? ' (deleted)' : ''}</a></li>`).join('')}</ul></details>`).join('')}
    </section>`;
  return `<p class="identity">Signed in as ${e(member.email)} · ${roleLabels[member.role]}</p>
    ${message && Object.hasOwn(messages, message) ? `<p role="status" class="notice">${messages[message]}</p>` : ''}
    ${nav}${reviewing ? '' : requestForm()}
    <section id="requests"><h2>${member.role === 'fellow' ? 'Fellowship requests' : board ? 'Member requests' : 'My requests'}</h2>${requestList(requests, reviewing)}</section>
    ${board ? published : ''}${copyPages.length ? websiteCopy : ''}${manager ? accessPanel(member, accounts) : ''}`;
}

export function editor(type, entry, submission, {
  canDelete = false, publicationNote = 'Published content appears on the public website.',
} = {}) {
  const label = requestTypes[type].label.toLowerCase();
  const heading = submission ? 'Review ' + label + ' request' : (entry ? 'Edit ' : 'New ') + label;
  const data = submission ? JSON.parse(submission.payload) : entry;
  if (type === 'fellowship') {
    const proposal = requestTypes.fellowship.fields.filter(([key]) => data[key])
      .map(([key, name]) => `<dt>${name}</dt><dd>${e(data[key])}</dd>`).join('');
    const actions = form('review', hidden('id', submission.id) +
      button('Approve fellowship request', 'publish') + button('Decline request', 'decline'));
    return [heading, `${back}<p>Submitted by ${e(submission.author)}. The proposal and decision stay in the portal.</p>
      <dl class="proposal">${proposal}</dl>${actions}`];
  }
  const identifiers = hidden('id', submission?.id ?? entry?.id ?? crypto.randomUUID()) +
    (!submission ? hidden('revision', entry?.revision ?? 0) : '');
  const support = submission ? 'Submitted by ' + submission.author : publicationNote;
  const saveLabel = entry?.archived ? 'Restore and publish' : entry ? 'Save changes' : 'Publish';
  const save = form(submission ? 'review' : 'save',
    identifiers + fields(type, data) + button(saveLabel, 'publish'));
  const remove = !submission && canDelete && entry && !entry.archived ?
    `<p class="delete-action"><a href="/portal/delete?kind=${type}&amp;id=${e(entry.id)}">Delete from site</a></p>` : '';
  const dismiss = submission ? form('review', identifiers + button('Decline request', 'decline')) : '';
  return [heading, `${back}<p>${e(support)}</p>${save}${dismiss}${remove}`];
}

export function deleteConfirmation(type, entry) {
  return `${back}<p>Remove <strong>${e(entry.title)}</strong> from the public site? A Website manager can restore it later.</p>
    ${form('archive', hidden('id', entry.id) + hidden('revision', entry.revision ?? 0) + hidden('kind', type) + button('Confirm deletion'))}
    <p><a href="/portal/edit?kind=${type}&amp;id=${e(entry.id)}">Cancel</a></p>`;
}

export function copyEditor(area, values, revision, demo = false) {
  const { label, fields } = siteCopy[area];
  return ['Edit ' + label + ' copy', `${back}<p>${demo ? 'Changes apply only to this demo.' : 'Saving updates this page on the public website.'}</p>${form('copy',
    hidden('area', area) + hidden('revision', revision) + Object.keys(fields).map(key =>
      field([key, copyFieldLabels[key], 1500, 'textarea'], values[key] ?? fields[key])).join('') +
    button('Save website copy'))}`];
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
.request-select{max-width:24rem;margin-bottom:1.4rem}
.delete-action a{color:#a12528}
.proposal dt{font-weight:700;margin-top:1rem}
.proposal dd{margin:0;white-space:pre-wrap}
button,.button{display:inline-block;justify-self:start;font:inherit;font-weight:700;padding:.45rem .85rem;border:1px solid var(--blue);background:var(--blue);color:white;cursor:pointer;text-decoration:none}
.records{display:grid;gap:.7rem;padding:0;list-style:none}
.records li{display:flex;justify-content:space-between;align-items:center;column-gap:1rem;row-gap:.5rem;flex-wrap:wrap}
.records p,.records form{margin:0}
.identity{color:#4e5871}
.notice{background:#e6edff;padding:.7rem .9rem}
footer{padding-block:1rem 2rem}
`;
