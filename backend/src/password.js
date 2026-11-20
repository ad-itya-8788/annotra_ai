import { randomBytes, scrypt as callbackScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(callbackScrypt);
const keyLength = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, keyLength, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, cost, blockSize, parallelization, encodedSalt, encodedKey, extra] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || cost !== '16384' || blockSize !== '8' || parallelization !== '1' || !encodedSalt || !encodedKey || extra !== undefined) {
    return false;
  }
  const salt = Buffer.from(encodedSalt, 'base64');
  const expectedKey = Buffer.from(encodedKey, 'base64');
  if (salt.length !== 16 || expectedKey.length !== keyLength) return false;
  const actualKey = await scrypt(password, salt, keyLength, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expectedKey, actualKey);
}
