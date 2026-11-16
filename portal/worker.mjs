import { accessIdentity } from './access.mjs';
import { copyEditor, css, dashboard, deleteConfirmation, editor, page, requestPicker } from './view.mjs';
import { requestTypes, roleLabels, kindFor, typeFor, canEdit, reviewScope, requestScope, canEditCopy, workspaceTitle } from './request-types.mjs';
import { catalog } from '../src/content.mjs';
import { siteCopy } from '../src/site-copy.mjs';

const kinds = new Set(['event', 'project', 'profile']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const entryId = /^[a-z0-9-]{1,100}$/;
const emailAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultSite = 'https://electrichunter1.github.io/harvard-ai-group/';
const headers = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

class Problem extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const all = async statement => (await statement.all()).results;
const statement = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
const first = (env, sql, ...args) => statement(env, sql, ...args).first();
const run = (env, sql, ...args) => statement(env, sql, ...args).run();
const findStatic = (kind, id) => catalog.find(entry => entry.kind === kind && entry.id === id);
const unpack = row => ({ ...JSON.parse(row.payload), archived: Boolean(row.archived), revision: row.revision });
const getPublication = (env, kind, id) => first(env,
  'SELECT payload, revision, archived FROM publications WHERE kind = ? AND id = ?', kind, id);
const conflict = () => new Problem(409, 'This entry has changed. Return to the workspace and open it again.');
const notFound = () => new Problem(404, 'This page could not be found.');
const forbidden = () => new Problem(403, 'Your account does not have access to this action.');

function text(form, name, limit, required = true) {
  const value = (form.get(name) || '').trim();
  if (value.length > limit || (required && !value)) {
    throw new Problem(400, 'Check the required fields and their length limits.');
  }
  return value;
}

function content(form, type, id) {
  const result = { kind: kindFor(type), id };
  for (const [key, , limit, inputType, optional] of requestTypes[type].fields) {
    const value = text(form, key, limit, !optional);
    if (value && inputType === 'date') {
      const day = new Date(value + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(day) || day.toISOString().slice(0, 10) !== value) {
        throw new Problem(400, 'Enter a valid date.');
      }
    }
    if (value && inputType === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new Problem(400, 'Enter a valid start time.');
    }
    result[key] = value;
  }
  if (result.link) {
    try {
      const link = new URL(result.link);
      if (link.protocol !== 'https:' || link.username || link.password) throw new Error();
      result.link = link.href;
    } catch {
      throw new Problem(400, 'Enter an HTTPS link or leave the link empty.');
    }
  }
  if (result.date) {
    result.dateLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
      .format(new Date(result.date + 'T00:00:00Z'));
  }
  if (type === 'paper') Object.assign(result, { type, category: 'Paper' });
  return result;
}

async function identity(request, env, authenticate) {
  const email = await authenticate(request, env);
  if (!email) throw new Problem(401, 'Sign in through the private portal link.');
  if (email === primaryManager(env)) return { email, role: 'manager', primary: true };
  const account = await first(env, 'SELECT role FROM accounts WHERE email = ?', email);
  if (!account) throw new Problem(403, 'Ask a website manager to authorize your sign-in address.');
  return { email, role: account.role };
}

function requireRole(member, role) {
  if (role === 'board' ? !canEdit(member.role) : member.role !== role) {
    throw forbidden();
  }
}

const primaryManager = env => env.OWNER_EMAIL?.trim().toLowerCase();
const getCopy = (env, area) => first(env, 'SELECT payload, revision FROM site_copy WHERE area = ?', area);

function html(title, content, status, env, member) {
  return new Response(page(title, content, member, env.PUBLIC_SITE || defaultSite), {
    status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function redirect(message) {
  return new Response(null, { status: 303, headers: { ...headers, Location: '/portal/?status=' + message } });
}

async function getPortal(url, env, member) {
  const { pathname, searchParams } = url;
  if (pathname === '/portal/style.css') {
    return new Response(css, { headers: { ...headers, 'Content-Type': 'text/css; charset=utf-8' } });
  }
  if (pathname === '/portal/request.js') {
    return new Response('(' + requestPicker.toString() + ')(document);', {
      headers: { ...headers, 'Content-Type': 'text/javascript; charset=utf-8' },
    });
  }
  if (pathname === '/portal/' || pathname === '/portal') {
    const board = canEdit(member.role);
    const scope = reviewScope(member.role);
    const requests = scope ?
      await all(statement(env, "SELECT * FROM submissions WHERE scope = ? AND status = 'pending' ORDER BY created_at, id", scope)) :
      await all(statement(env, 'SELECT * FROM submissions WHERE author = ? ORDER BY created_at DESC, id DESC LIMIT 100', member.email));
    const entries = new Map(catalog.map(entry => [entry.kind + '/' + entry.id, entry]));
    if (board) {
      for (const row of await all(statement(env, 'SELECT kind, id, payload, archived, revision FROM publications'))) {
        entries.set(row.kind + '/' + row.id, unpack(row));
      }
    }
    const accounts = member.role === 'manager' ?
      await all(statement(env, 'SELECT email, role FROM accounts ORDER BY email')) : [];
    return html(workspaceTitle(member.role),
      dashboard(member, requests, [...entries.values()].filter(entry => member.role === 'manager' || !entry.archived), accounts,
        searchParams.get('status')), 200, env, member);
  }
  if (pathname === '/portal/copy') {
    const area = searchParams.get('area');
    if (!Object.hasOwn(siteCopy, area)) throw notFound();
    if (!canEditCopy(member.role, area)) throw forbidden();
    const row = await getCopy(env, area);
    const [title, body] = copyEditor(area, row ? JSON.parse(row.payload) : {}, row?.revision ?? 0);
    return html(title, body, 200, env, member);
  }
  const id = searchParams.get('id');
  if (pathname === '/portal/review' && uuid.test(id ?? '')) {
    const scope = reviewScope(member.role);
    if (!scope) throw forbidden();
    const submission = await first(env, "SELECT * FROM submissions WHERE id = ? AND scope = ? AND status = 'pending'", id, scope);
    if (!submission) throw notFound();
    const [title, body] = editor(typeFor(JSON.parse(submission.payload)), null, submission);
    return html(title, body, 200, env, member);
  }
  requireRole(member, 'board');
  const type = searchParams.get('kind');
  const kind = kindFor(type);
  const deleting = pathname === '/portal/delete';
  if ((!deleting && pathname !== '/portal/edit') || type === 'fellowship' || !Object.hasOwn(requestTypes, type) ||
      (id && !entryId.test(id))) throw notFound();
  if (deleting) requireRole(member, 'manager');
  const row = id && await getPublication(env, kind, id);
  const entry = row ? unpack(row) : findStatic(kind, id);
  if (id && (!entry || typeFor(entry) !== type)) throw notFound();
  if (entry?.archived) requireRole(member, 'manager');
  if (deleting) {
    if (!entry || entry.archived) throw notFound();
    return html('Delete from site', deleteConfirmation(type, entry), 200, env, member);
  }
  const [title, body] = editor(type, entry, null, { canDelete: member.role === 'manager' });
  return html(title, body, 200, env, member);
}

async function submit(form, env, member) {
  requireRole(member, 'member');
  const type = form.get('kind');
  if (!Object.hasOwn(requestTypes, type)) throw notFound();
  const id = crypto.randomUUID();
  const entry = content(form, type, id);
  const result = await run(env, `INSERT INTO submissions (id, author, payload, scope)
    SELECT ?, ?, ?, ? WHERE (SELECT count(*) FROM submissions WHERE author = ? AND status = 'pending') < 10`,
  id, member.email, JSON.stringify(entry), requestScope(type), member.email);
  if (!result.meta.changes) throw new Problem(409, 'You can have up to 10 requests waiting for review.');
  return redirect(type === 'fellowship' ? 'submittedFellow' : 'submitted');
}

async function review(form, env, member) {
  const scope = reviewScope(member.role);
  if (!scope) throw forbidden();
  const id = form.get('id');
  if (!uuid.test(id ?? '')) throw notFound();
  const pending = await first(env, "SELECT payload FROM submissions WHERE id = ? AND scope = ? AND status = 'pending'", id, scope);
  if (!pending) throw conflict();
  const type = typeFor(JSON.parse(pending.payload));
  const decision = form.get('decision');
  if (!['publish', 'decline'].includes(decision)) throw notFound();
  const status = decision === 'decline' ? 'declined' : scope === 'fellowship' ? 'approved' : 'published';
  const mark = statement(env, `UPDATE submissions SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewer = ?
    WHERE id = ? AND scope = ? AND status = 'pending'`, status, member.email, id, scope);
  if (status !== 'published') {
    if (!(await mark.run()).meta.changes) throw conflict();
  } else {
    const entry = content(form, type, id);
    const publish = statement(env, `INSERT INTO publications (kind, id, payload, updated_by)
      SELECT ?, id, ?, ? FROM submissions WHERE id = ? AND scope = ? AND status = 'pending'`,
    entry.kind, JSON.stringify(entry), member.email, id, scope);
    const results = await env.DB.batch([publish, mark]);
    if (!results[1].meta.changes) throw conflict();
  }
  return redirect(status);
}

async function save(form, env, member, archive) {
  if (archive) requireRole(member, 'manager');
  const type = form.get('kind');
  const kind = kindFor(type);
  const id = form.get('id');
  const suppliedRevision = form.get('revision');
  if (type === 'fellowship' || !Object.hasOwn(requestTypes, type) ||
      !entryId.test(id ?? '') || !/^\d{1,12}$/.test(suppliedRevision ?? '')) throw notFound();
  const revision = Number(suppliedRevision);
  const current = await getPublication(env, kind, id);
  const original = findStatic(kind, id);
  const existing = current ? unpack(current) : original;
  if (existing && typeFor(existing) !== type) throw notFound();
  if (existing?.archived) requireRole(member, 'manager');
  if ((!current && !original && (!uuid.test(id) || archive)) || revision !== (current?.revision || 0)) {
    throw conflict();
  }
  let entry = archive ? { ...existing } : content(form, type, id);
  if (!archive && original) {
    // Keep the existing photo and cross-references when a board member edits old copy.
    entry = { ...original, ...entry };
  }
  delete entry.revision;
  delete entry.archived;
  const payload = JSON.stringify(entry);
  const archived = Number(archive);
  const result = current ?
    await run(env, `UPDATE publications SET payload = ?, archived = ?, revision = revision + 1,
      updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE kind = ? AND id = ? AND revision = ?`,
    payload, archived, member.email, kind, id, revision) :
    await run(env, `INSERT INTO publications (kind, id, payload, archived, updated_by) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(kind, id) DO NOTHING`, kind, id, payload, archived, member.email);
  if (!result.meta.changes) throw conflict();
  return redirect(archive ? 'archived' : 'published');
}

async function saveCopy(form, env, member) {
  const area = form.get('area');
  const revision = form.get('revision');
  if (!Object.hasOwn(siteCopy, area) || !/^\d{1,12}$/.test(revision ?? '')) throw notFound();
  if (!canEditCopy(member.role, area)) throw forbidden();
  const payload = JSON.stringify(Object.fromEntries(
    Object.keys(siteCopy[area].fields).map(key => [key, text(form, key, 1500)]),
  ));
  const result = Number(revision) === 0 ?
    await run(env, `INSERT INTO site_copy (area, payload, updated_by) VALUES (?, ?, ?)
      ON CONFLICT(area) DO NOTHING`, area, payload, member.email) :
    await run(env, `UPDATE site_copy SET payload = ?, revision = revision + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE area = ? AND revision = ?`, payload, member.email, area, Number(revision));
  if (!result.meta.changes) throw conflict();
  return redirect('copy');
}

async function manageAccess(form, env, member) {
  requireRole(member, 'manager');
  const email = text(form, 'email', 254).toLowerCase();
  const role = form.get('role');
  if (!emailAddress.test(email) || email === member.email || email === primaryManager(env) ||
      (role !== 'revoke' && !Object.hasOwn(roleLabels, role))) {
    throw new Problem(400, 'Enter a verified address and a valid role.');
  }
  if (role === 'manager' && !member.primary) throw new Problem(403, 'Only the primary website manager can assign this role.');
  const primary = Number(Boolean(member.primary));
  const result = role === 'revoke' ?
    await run(env, "DELETE FROM accounts WHERE email = ? AND (role <> 'manager' OR ? = 1)", email, primary) :
    await run(env, `INSERT INTO accounts (email, role) VALUES (?, ?)
      ON CONFLICT(email) DO UPDATE SET role = excluded.role WHERE accounts.role <> 'manager' OR ? = 1`, email, role, primary);
  if (!result.meta.changes) throw new Problem(403, 'This account could not be changed.');
  return redirect('access');
}

async function mutate(request, pathname, env, member) {
  // Same-origin form posts are required in addition to the signed Access session.
  if (!env.PORTAL_ORIGIN || request.headers.get('Origin') !== env.PORTAL_ORIGIN) {
    throw new Problem(403, 'Submit this form from the private workspace.');
  }
  const size = Number(request.headers.get('Content-Length'));
  if (!Number.isSafeInteger(size) || size < 1 || size > 65536) throw new Problem(413, 'The form is too large.');
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/x-www-form-urlencoded') {
    throw new Problem(415, 'Submit the workspace form.');
  }
  const form = new URLSearchParams(await request.text());
  if (pathname === '/portal/submit') return submit(form, env, member);
  if (pathname === '/portal/withdraw') {
    const id = form.get('id');
    const result = await run(env, "UPDATE submissions SET status = 'withdrawn' WHERE id = ? AND author = ? AND status = 'pending'", id, member.email);
    if (!result.meta.changes) throw notFound();
    return redirect('withdrawn');
  }
  if (pathname === '/portal/review') return review(form, env, member);
  if (pathname === '/portal/save' || pathname === '/portal/archive') {
    requireRole(member, 'board');
    return save(form, env, member, pathname.endsWith('archive'));
  }
  if (pathname === '/portal/copy') return saveCopy(form, env, member);
  if (pathname === '/portal/access') return manageAccess(form, env, member);
  throw notFound();
}

const publicHeaders = env => ({
  ...headers,
  'Access-Control-Allow-Origin': new URL(env.PUBLIC_SITE || defaultSite).origin,
});

async function publicCopy(url, env) {
  const area = url.searchParams.get('area');
  if (!Object.hasOwn(siteCopy, area)) throw notFound();
  const row = await getCopy(env, area);
  return Response.json({ copy: row ? JSON.parse(row.payload) : {} }, { headers: publicHeaders(env) });
}

async function publicContent(url, env) {
  const kind = url.searchParams.get('kind');
  const id = url.searchParams.get('id');
  if (!kinds.has(kind) || (id !== null && !entryId.test(id))) throw notFound();
  const rows = id ?
    await all(statement(env, 'SELECT kind, id, payload, archived FROM publications WHERE kind = ? AND id = ?', kind, id)) :
    await all(statement(env, 'SELECT kind, id, payload, archived FROM publications WHERE kind = ? ORDER BY updated_at, id', kind));
  const entries = rows.map(row => {
    if (row.archived) return { kind: row.kind, id: row.id, archived: true };
    return { ...JSON.parse(row.payload), archived: false };
  });
  if (id && entries.length === 0) {
    const entry = findStatic(kind, id);
    if (entry) entries.push(entry);
  }
  return Response.json({ entries }, { headers: publicHeaders(env) });
}

export function createHandler(authenticate = accessIdentity) {
  return {
    async fetch(request, env) {
      let member;
      try {
        const url = new URL(request.url);
        if (url.pathname === '/public/content' && request.method === 'GET') return await publicContent(url, env);
        if (url.pathname === '/public/copy' && request.method === 'GET') return await publicCopy(url, env);
        if (url.pathname !== '/portal' && !url.pathname.startsWith('/portal/')) throw notFound();
        if (!env.DB) throw new Problem(503, 'The portal is being set up.');
        member = await identity(request, env, authenticate);
        if (request.method === 'GET') return await getPortal(url, env, member);
        if (request.method === 'POST') return await mutate(request, url.pathname, env, member);
        throw new Problem(405, 'This method is unavailable.');
      } catch (error) {
        if (error instanceof Problem) return html(error.message, '<p><a href="/portal/">Back to workspace</a></p>', error.status, env, member);
        console.error('Portal operation failed.');
        return html('The workspace is temporarily unavailable.', '', 503, env, member);
      }
    },
  };
}

export default createHandler();
