const crypto = require('crypto');

const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 3600);
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev-secret';

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signToken(payload, ttlSeconds = TOKEN_TTL_SECONDS) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = JSON.stringify({ ...payload, exp: expiresAt });
  const encodedBody = base64UrlEncode(body);
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedBody)
    .digest('base64url');
  return `${encodedBody}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'missing_token' };
  }
  const [encodedBody, signature] = token.split('.');
  const expectedSignature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedBody)
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { valid: false, error: 'invalid_signature' };
  }
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedBody));
  } catch (error) {
    return { valid: false, error: 'invalid_payload' };
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'expired' };
  }
  return { valid: true, payload };
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.query.token) {
    return String(req.query.token);
  }
  return null;
}

module.exports = {
  signToken,
  verifyToken,
  extractToken,
};
