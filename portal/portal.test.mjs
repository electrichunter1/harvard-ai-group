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

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./migrations/0001_portal.sql', import.meta.url), 'utf8'));
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
  assert.equal((await worker.fetch(new Request(origin + '/portal/', {
    headers: { 'Cf-Access-Authenticated-User-Email': owner, 'X-Test-Identity': owner },
  }), env)).status, 401);

  for (const [email, role] of [[member, 'member'], [other, 'member'], [board, 'board']]) {
    assert.equal((await post('access', owner, { email, role })).status, 303);
  }
  assert.equal((await post('access', board, { email: board, role: 'board' })).status, 403);

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
  assert.equal((await post('archive', board, { kind: 'project', id: requestId, revision: 2 })).status, 303);
  assert.deepEqual(await feed('project'), [{ kind: 'project', id: requestId, archived: true }]);
  assert.equal((await post('access', owner, { email: member, role: 'revoke' })).status, 303);
  assert.equal((await get('/portal/', member)).status, 403);
});
