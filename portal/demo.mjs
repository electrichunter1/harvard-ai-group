import { dashboard, editor } from './view.mjs';

const workspace = document.querySelector('#workspace');
const heading = document.querySelector('#workspace-title');
const result = document.querySelector('#result');
const switches = [...document.querySelectorAll('[data-account]')];
const identities = {
  member: 'member@example.test',
  board: 'board@example.test',
  owner: 'owner@example.test',
};
const kinds = new Set(['event', 'project', 'profile']);

function startingData() {
  const proposal = {
    id: 'demo-profile', kind: 'profile', title: 'Avery Example', category: 'Fellow',
    summary: 'I work on making AI tutorials easier for beginners to follow.',
    body: 'I’m building a short series of notebooks for people learning machine learning from scratch.',
  };
  return {
    accounts: new Map([[identities.member, 'member'], [identities.board, 'board']]),
    requests: [{ id: proposal.id, author: identities.member, payload: JSON.stringify(proposal), status: 'pending' }],
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
const role = () => account === 'owner' ? 'owner' : data.accounts.get(email());

function render(focus = false) {
  const active = role();
  const board = active === 'board' || active === 'owner';
  const [route, query] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const id = params.get('id');
  const kind = params.get('kind');
  const request = board && route === 'review' && data.requests.find(item => item.id === id && item.status === 'pending');
  const entry = kind && data.entries.find(item => item.kind === kind && item.id === id);

  let title = board ? 'Board workspace' : 'Member workspace';
  const requests = board ? data.requests.filter(item => item.status === 'pending') :
    data.requests.filter(item => item.author === email());
  const accounts = [...data.accounts].map(([email, role]) => ({ email, role }));
  let content = active ? dashboard({ email: email(), role: active }, requests, data.entries, accounts) :
    '<p>Access for this demo account was revoked. Switch to Owner to restore it.</p>';
  if (request) [title, content] = editor(JSON.parse(request.payload).kind, null, request);
  else if (board && route === 'edit' && kinds.has(kind) && (!id || entry)) {
    [title, content] = editor(kind, entry || null, null, 'Saving or publishing updates the demo catalog in this tab.');
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

workspace.addEventListener('submit', event => {
  event.preventDefault();
  const active = role();
  const form = Object.fromEntries(new FormData(event.target, event.submitter));
  const { decision, revision, role: newRole, email: address, ...fields } = form;
  const action = event.target.dataset.action;
  const request = data.requests.find(item => item.id === fields.id && item.status === 'pending');

  if (active === 'member') {
    if (action === 'submit' && ['profile', 'project'].includes(fields.kind)) {
      fields.id = crypto.randomUUID();
      data.requests.push({ id: fields.id, author: email(), payload: JSON.stringify(fields), status: 'pending' });
      home('Demo request sent to the board.');
    } else if (action === 'withdraw' && request?.author === email()) {
      request.status = 'withdrawn';
      home('Demo request withdrawn.');
    }
    return;
  }
  if (active !== 'board' && active !== 'owner') return;

  if (action === 'review' && request) {
    if (decision === 'publish') saveEntry(fields);
    request.status = decision === 'publish' ? 'published' : 'declined';
    home(decision === 'publish' ? 'Request published to the demo catalog.' : 'Demo request declined.');
  } else if (action === 'save' && kinds.has(fields.kind)) {
    saveEntry(fields);
    home('Saved to the demo catalog.');
  } else if (action === 'archive') {
    const entry = data.entries.find(item => item.kind === fields.kind && item.id === fields.id);
    if (entry) entry.archived = true;
    home('Demo entry archived.');
  } else if (action === 'access' && active === 'owner') {
    const target = address?.toLowerCase().trim();
    if (!target?.endsWith('@example.test') || target === identities.owner) {
      status('Use a fictional @example.test address that differs from the owner.');
      result.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (newRole === 'revoke') data.accounts.delete(target);
    if (newRole === 'member' || newRole === 'board') data.accounts.set(target, newRole);
    home('Demo access updated.');
  }
});

window.addEventListener('hashchange', () => {
  // Workspace section links scroll normally. Only editor routes replace the workspace.
  if (['#requests', '#published', '#access'].includes(location.hash)) return;
  status('');
  render(true);
});
render();
