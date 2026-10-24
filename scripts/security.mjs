import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, encoded) {
  const [salt, stored] = encoded.split(':');
  const calculated = scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, 'hex');
  return expected.length === calculated.length && timingSafeEqual(expected, calculated);
}
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
