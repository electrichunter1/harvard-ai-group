import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { accessIdentity } from './access.mjs';
import worker, { createHandler } from './worker.mjs';

const origin = 'https://portal.example.test';
const owner = 'owner@example.test';
const board = 'board@example.test';
const member = 'member@example.test';
const other = 'other@example.test';
const fellow = 'fellow@example.test';
const manager = 'manager@example.test';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./migrations/0001_portal.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('./migrations/0002_portal_indexes.sql', import.meta.url), 'utf8'));
  sqlite.prepare('INSERT INTO accounts (email, role) VALUES (?, ?)').run(other, 'member');
  sqlite.exec(readFileSync(new URL('./migrations/0003_website_managers.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      const prepared = sqlite.prepare(sql);
      return {
        bind(...parameters) {
          return {
            async first() { return prepared.get(...parameters) ?? null; },
            async all() { return { results: prepared.all(...parameters) }; },
            async run() { return { meta: prepared.run(...parameters) }; },
          };
        },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

test('signed Access identity checks issuer, audience, expiry, and signature', async t => {
  const issuer = 'https://unit-test.cloudflareaccess.com';
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const key = { ...await exportJWK(publicKey), kid: 'test', alg: 'RS256' };
  const make = (aud, expiry) => new SignJWT({ email: owner }).setIssuer(issuer).setAudience(aud)
    .setSubject('test-owner').setIssuedAt().setExpirationTime(expiry).setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(privateKey);
  const request = token => new Request(origin, { headers: { 'Cf-Access-Jwt-Assertion': token } });
  const env = { ACCESS_ISSUER: issuer, ACCESS_AUD: 'portal' };
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(String(url), issuer + '/cdn-cgi/access/certs');
    return Response.json({ keys: [key] });
  });
  const valid = await make('portal', '5m');
  assert.equal(await accessIdentity(request(valid), env), owner);
  assert.equal(await accessIdentity(request(valid), { ...env, ACCESS_ISSUER: 'https://wrong.example.test' }), null);
  assert.equal(await accessIdentity(request(await make('elsewhere', '5m')), env), null);
  assert.equal(await accessIdentity(request(await make('portal', -1)), env), null);
  assert.equal(await accessIdentity(request(valid.slice(0, -6) + 'ABCDEF'), env), null);
});

test('member requests stay private until board publication; access and edits are enforced', async () => {
  const env = { PORTAL_ORIGIN: origin, OWNER_EMAIL: owner, DB: database() };
  const testWorker = createHandler(async request => request.headers.get('X-Test-Identity'));
  const get = (path, email) => testWorker.fetch(new Request(origin + path, {
    headers: email ? { 'X-Test-Identity': email } : {},
  }), env);
  const post = (path, email, values, source = origin) => {
    const body = new URLSearchParams(values).toString();
    return testWorker.fetch(new Request(origin + '/portal/' + path, {
      method: 'POST',
      headers: {
        'X-Test-Identity': email, Origin: source,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': String(Buffer.byteLength(body)),
      },
      body,
    }), env);
  };
  const feed = async kind => (await (await get('/public/content?kind=' + kind)).json()).entries;
  assert.equal((await get('/portal/')).status, 401);
  assert.equal((await get('/portal/', member)).status, 403);
  assert.equal((await get('/portal/', other)).status, 200);
  assert.match(await (await get('/portal/', owner)).text(), /Website manager workspace/);
  assert.equal((await worker.fetch(new Request(origin + '/portal/', {
    headers: { 'Cf-Access-Authenticated-User-Email': owner, 'X-Test-Identity': owner },
  }), env)).status, 401);

  for (const [email, role] of [[member, 'member'], [board, 'board'], [manager, 'manager'], [fellow, 'fellow']]) {
    assert.equal((await post('access', owner, { email, role })).status, 303);
  }
  assert.equal((await post('access', board, { email: board, role: 'board' })).status, 403);
  assert.equal((await post('access', manager, { email: fellow, role: 'manager' })).status, 403);
  assert.equal((await post('access', manager, { email: owner, role: 'revoke' })).status, 400);
  assert.match(await (await get('/portal/', fellow)).text(), /Fellow manager workspace/);

  const project = { kind: 'project', title: '<script>Private work</script>', category: 'Robotics', summary: 'A project in review', byline: 'Test Member' };
  assert.equal((await post('submit', member, project, 'https://other.example.test')).status, 403);
  assert.equal((await post('submit', member, { ...project, link: 'javascript:alert(1)' })).status, 400);
  assert.equal((await post('submit', member, project)).status, 303);
  assert.deepEqual(await feed('project'), []);
  assert.match(await (await get('/portal/', member)).text(), /&lt;script&gt;Private work/);
  assert.doesNotMatch(await (await get('/portal/', other)).text(), /Private work/);
  const boardPage = await (await get('/portal/', board)).text();
  const requestId = boardPage.match(/\/portal\/review\?id=([a-f0-9-]+)/)[1];
  assert.equal((await get('/portal/review?id=' + requestId, member)).status, 403);
  assert.equal((await post('withdraw', other, { id: requestId })).status, 404);
  assert.equal((await post('review', member, { ...project, id: requestId, decision: 'publish' })).status, 403);
  const publish = { ...project, id: requestId, decision: 'publish' };
  assert.equal((await post('review', board, publish)).status, 303);
  assert.equal((await post('review', board, publish)).status, 409);
  assert.doesNotMatch(JSON.stringify(await feed('project')), /example\.test|reviewer|revision/);
  assert.equal((await feed('project'))[0].title, project.title);

  assert.equal((await post('save', board, { ...project, id: requestId, revision: 1, title: 'Approved research' })).status, 303);
  assert.equal((await post('save', board, { ...project, id: requestId, revision: 1 })).status, 409);
  assert.equal((await feed('project'))[0].title, 'Approved research');
  assert.equal((await get('/portal/delete?kind=project&id=' + requestId, board)).status, 403);
  assert.equal((await post('archive', board, { kind: 'project', id: requestId, revision: 2 })).status, 403);
  assert.match(await (await get('/portal/delete?kind=project&id=' + requestId, manager)).text(), /Confirm deletion/);
  assert.equal((await post('archive', manager, { kind: 'project', id: requestId, revision: 2 })).status, 303);
  assert.deepEqual(await feed('project'), [{ kind: 'project', id: requestId, archived: true }]);
  assert.equal((await post('save', board, { ...project, id: requestId, revision: 3 })).status, 403);
  assert.equal((await post('save', manager, { ...project, id: requestId, revision: 3 })).status, 303);

  const event = { kind: 'event', title: 'Workshop', category: 'Talk', summary: 'Project walkthrough', date: '2027-02-01', eventTime: '17:30', venue: 'Science Center' };
  assert.equal((await post('submit', member, { ...event, eventTime: '26:30' })).status, 400);
  assert.equal((await post('submit', member, event)).status, 303);
  const paper = { kind: 'paper', title: 'Demo Paper', byline: 'Example Authors', summary: 'Brief description',
    body: 'Full abstract', venue: 'Example Journal', publicationDate: '2027-02-04' };
  assert.equal((await post('submit', member, { ...paper, body: '' })).status, 400);
  assert.equal((await post('submit', member, paper)).status, 303);
  const pendingPaper = await (await get('/portal/', board)).text();
  const paperId = pendingPaper.match(/review\?id=([a-f0-9-]+)">Demo Paper/)[1];
  assert.equal((await post('review', board, { ...paper, id: paperId, decision: 'publish' })).status, 303);
  assert.deepEqual((await feed('project')).find(entry => entry.id === paperId),
    { ...paper, kind: 'project', category: 'Paper', type: 'paper', id: paperId, link: '', archived: false });

  const proposal = { kind: 'fellowship', title: 'Private proposal', byline: 'Example Applicant', summary: 'An example goal', body: 'A detailed plan' };
  assert.equal((await post('submit', member, proposal)).status, 303);
  assert.doesNotMatch(await (await get('/portal/', board)).text(), /Private proposal/);
  assert.doesNotMatch(await (await get('/portal/', manager)).text(), /Private proposal/);
  const fellowPage = await (await get('/portal/', fellow)).text();
  assert.doesNotMatch(fellowPage, /Published entries|Portal access|Workshop/);
  const proposalId = fellowPage.match(/review\?id=([a-f0-9-]+)">Private proposal/)[1];
  assert.match(await (await get('/portal/review?id=' + proposalId, fellow)).text(), /Approve fellowship request/);
  assert.equal((await get('/portal/review?id=' + proposalId, manager)).status, 404);
  assert.equal((await post('review', board, { id: proposalId, decision: 'publish' })).status, 409);
  assert.equal((await post('review', fellow, { id: proposalId, decision: 'publish' })).status, 303);
  assert.match(await (await get('/portal/', member)).text(), /Fellowship · approved/);
  assert.doesNotMatch(JSON.stringify(await feed('project')), /Private proposal/);

  const copy = { area: 'home', revision: 0, intro: 'Welcome to the group', about: 'A new public description' };
  assert.equal((await post('copy', board, copy)).status, 403);
  assert.equal((await post('copy', fellow, copy)).status, 403);
  assert.equal((await post('copy', manager, copy)).status, 303);
  assert.equal((await post('copy', owner, copy)).status, 409);
  assert.deepEqual(await (await get('/public/copy?area=home')).json(), { copy: { intro: copy.intro, about: copy.about } });
  assert.equal((await post('copy', fellow, { area: 'fellowship', revision: 0, intro: 'Program', details: 'Funding', applying: 'Apply for this cycle' })).status, 303);
  assert.equal((await post('access', owner, { email: member, role: 'revoke' })).status, 303);
  assert.equal((await get('/portal/', member)).status, 403);
});
