import { createRemoteJWKSet, jwtVerify } from 'jose';

const keysets = new Map();

export async function accessIdentity(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  const issuer = env.ACCESS_ISSUER;
  if (!token || !env.ACCESS_AUD || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || '')) {
    return null;
  }
  if (!keysets.has(issuer)) keysets.set(issuer, createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer)));
  try {
    const { payload } = await jwtVerify(token, keysets.get(issuer), {
      issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub'],
    });
    return typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}
