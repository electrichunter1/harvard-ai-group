import { copyEditor, dashboard, deleteConfirmation, editor, requestPicker } from './view.mjs';
import { canEdit, canEditCopy, kindFor, requestScope, requestTypes, reviewScope, typeFor, workspaceTitle } from './request-types.mjs';
import { siteCopy } from '../src/site-copy.mjs';

const workspace = document.querySelector('#workspace');
const heading = document.querySelector('#workspace-title');
const result = document.querySelector('#result');
const switches = [...document.querySelectorAll('[data-account]')];
const identities = {
  member: 'member@example.test',
  board: 'board@example.test',
  manager: 'manager@example.test',
  fellow: 'fellow@example.test',
};

function startingData() {
  const proposal = {
    id: 'demo-profile', kind: 'profile', title: 'Avery Example', category: 'Fellow',
    summary: 'I work on making AI tutorials easier for beginners to follow.',
    body: 'I’m building a short series of notebooks for people learning machine learning from scratch.',
  };
  const fellowship = {
    id: 'demo-fellowship', kind: 'fellowship', title: 'Community AI Curriculum', byline: 'Avery Example',
    summary: 'Can shorter exercises help students learn AI concepts?',
    body: 'I’d prototype three notebooks and gather voluntary feedback from two study groups.',
  };
  return {
    accounts: new Map([[identities.member, 'member'], [identities.board, 'board'], [identities.fellow, 'fellow']]),
    requests: [proposal, fellowship].map(entry => ({
      id: entry.id, author: identities.member, payload: JSON.stringify(entry), status: 'pending', scope: requestScope(entry.kind),
    })),
    copy: {},
    entries: [
      { id: 'demo-dinner', kind: 'event', title: 'Research Dinner', date: '2027-02-04',
        category: 'Talk', summary: 'An informal dinner about how students choose a research question.' },
      { id: 'demo-notebooks', kind: 'project', title: 'Notebook Library', byline: 'The Example Team',
        category: 'Education', summary: 'An example collection of short machine learning exercises.' },
    ],
  };
}

let data = startingData();
let account = 'member';
const email = () => identities[account];
const role = () => account === 'manager' ? 'manager' : data.accounts.get(email());

function render(focus = false) {
  const active = role();
  const board = canEdit(active);
  const scope = reviewScope(active);
  const [route, query] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const id = params.get('id');
  const type = params.get('kind');
  const area = params.get('area');
  const request = scope && route === 'review' &&
    data.requests.find(item => item.id === id && item.status === 'pending' && item.scope === scope);
  const entry = data.entries.find(item => typeFor(item) === type && item.id === id);

  let title = active ? workspaceTitle(active) : 'Access revoked';
  const requests = scope ? data.requests.filter(item => item.status === 'pending' && item.scope === scope) :
    data.requests.filter(item => item.author === email());
  const accounts = [...data.accounts].map(([email, role]) => ({ email, role }));
  const entries = data.entries.filter(item => active === 'manager' || !item.archived);
  let content = active ? dashboard({ email: email(), role: active, primary: account === 'manager' }, requests, entries, accounts) :
    '<p>Access for this demo account was revoked. Switch to Website manager to restore it.</p>';
  if (request) [title, content] = editor(typeFor(JSON.parse(request.payload)), null, request);
  else if (board && route === 'edit' && type !== 'fellowship' && Object.hasOwn(requestTypes, type) &&
      (!id || (entry && (!entry.archived || active === 'manager')))) {
    [title, content] = editor(type, entry || null, null, {
      canDelete: active === 'manager', publicationNote: 'Saving or publishing updates the demo catalog in this tab.',
    });
  } else if (active === 'manager' && route === 'delete' && entry && !entry.archived) {
    [title, content] = ['Delete from site', deleteConfirmation(type, entry)];
  } else if (route === 'copy' && Object.hasOwn(siteCopy, area) && canEditCopy(active, area)) {
    [title, content] = copyEditor(area, data.copy[area] || {}, 0, true);
  }

  heading.textContent = title;
  const template = document.createElement('template');
  template.innerHTML = content;
  for (const anchor of template.content.querySelectorAll('a[href^="/portal/"]')) {
    anchor.setAttribute('href', '#' + anchor.getAttribute('href').slice('/portal/'.length));
  }
  for (const form of template.content.querySelectorAll('form')) {
    form.dataset.action = form.getAttribute('action').slice('/portal/'.length);
    form.removeAttribute('action');
  }
  workspace.replaceChildren(template.content);
  requestPicker(workspace);
  if (focus) heading.focus();
}

function status(message) {
  result.hidden = !message;
  result.textContent = message;
}

function home(message = '') {
  status(message);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  render(true);
}

for (const button of switches) {
  button.addEventListener('click', () => {
    account = button.dataset.account;
    for (const option of switches) option.setAttribute('aria-pressed', String(option === button));
    home();
  });
}
document.querySelector('#reset').addEventListener('click', () => {
  data = startingData();
  switches[0].click();
  status('The demo was reset.');
});

function saveEntry(entry) {
  data.entries = data.entries.filter(item => item.kind !== entry.kind || item.id !== entry.id);
  data.entries.push(entry);
}

function entryFrom(type, fields) {
  return { ...fields, kind: kindFor(type), ...(type === 'paper' && { type, category: 'Paper' }) };
}

workspace.addEventListener('submit', event => {
  event.preventDefault();
  const active = role();
  const form = Object.fromEntries(new FormData(event.target, event.submitter));
  const { decision, kind: type, role: newRole, email: address, area, ...fields } = form;
  delete fields.revision;
  const action = event.target.dataset.action;
  const request = data.requests.find(item => item.id === fields.id && item.status === 'pending');

  if (active === 'member') {
    if (action === 'submit' && Object.hasOwn(requestTypes, type)) {
      fields.id = crypto.randomUUID();
      const scope = requestScope(type);
      data.requests.push({ id: fields.id, author: email(), payload: JSON.stringify(entryFrom(type, fields)), status: 'pending', scope });
      home(scope === 'fellowship' ? 'Demo proposal sent to the Fellow manager.' : 'Demo request sent to the board.');
    } else if (action === 'withdraw' && request?.author === email()) {
      request.status = 'withdrawn';
      home('Demo request withdrawn.');
    }
    return;
  }
  if (action === 'review' && request && request.scope === reviewScope(active)) {
    const approved = decision === 'publish';
    if (approved && request.scope === 'website') saveEntry(entryFrom(type, fields));
    request.status = !approved ? 'declined' : request.scope === 'fellowship' ? 'approved' : 'published';
    home(!approved ? 'Demo request declined.' : request.scope === 'fellowship' ?
      'Demo fellowship request approved privately.' : 'Request published to the demo catalog.');
  } else if (action === 'save' && canEdit(active) && type !== 'fellowship' && Object.hasOwn(requestTypes, type)) {
    saveEntry(entryFrom(type, fields));
    home('Saved to the demo catalog.');
  } else if (action === 'archive' && active === 'manager') {
    const entry = data.entries.find(item => typeFor(item) === type && item.id === fields.id);
    if (entry) entry.archived = true;
    home('Demo entry deleted. You can restore it from Published entries.');
  } else if (action === 'copy' && Object.hasOwn(siteCopy, area) && canEditCopy(active, area)) {
    data.copy[area] = fields;
    home('Demo website copy updated.');
  } else if (action === 'access' && active === 'manager') {
    const target = address?.toLowerCase().trim();
    if (!target?.endsWith('@example.test') || target === identities.manager) {
      status('Use a fictional @example.test address that differs from the primary manager.');
      result.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (newRole === 'revoke') data.accounts.delete(target);
    if (Object.hasOwn(identities, newRole)) data.accounts.set(target, newRole);
    home('Demo access updated.');
  }
});

window.addEventListener('hashchange', () => {
  // Workspace section links scroll normally. Only editor routes replace the workspace.
  if (['#requests', '#published', '#access', '#website-copy'].includes(location.hash)) return;
  status('');
  render(true);
});
render();
