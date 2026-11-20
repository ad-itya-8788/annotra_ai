import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const envValue = (name, fallback = '') => process.env[name]?.trim() || fallback;
const frontendUrl = envValue('FRONTEND_URL', 'http://localhost:5173').replace(/\/+$/, '');
const requestedPrivateFileMaxBytes = Number(process.env.PRIVATE_FILE_MAX_BYTES || 5 * 1024 * 1024);
const databaseSslCaPath = process.env.DB_SSL_CA_PATH?.trim();
const databaseSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const databaseSslCa = databaseSslCaPath
  ? readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', databaseSslCaPath), 'utf8')
  : undefined;

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl,
  database: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST || 'localhost',
    port: process.env.DATABASE_URL ? undefined : Number(process.env.DB_PORT || 5432),
    database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME || 'projectflow',
    user: process.env.DATABASE_URL ? undefined : process.env.DB_USER || 'postgres',
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: databaseSslRejectUnauthorized,
          ...(databaseSslCa ? { ca: databaseSslCa } : {}),
        }
      : undefined,
  },
  sessionSecret: process.env.SESSION_SECRET,
  messageCentral: {
    sendUrl: envValue('MESSAGE_CENTRAL_SEND_OTP_URL', 'https://cpaas.messagecentral.com/verification/v3/send'),
    verifyUrl: envValue('MESSAGE_CENTRAL_VALIDATE_OTP_URL', 'https://cpaas.messagecentral.com/verification/v3/validateOtp'),
    customerId: envValue('MESSAGE_CENTRAL_CUSTOMER_ID'),
    authToken: envValue('MESSAGE_CENTRAL_AUTH_TOKEN'),
    countryCode: envValue('MESSAGE_CENTRAL_COUNTRY_CODE', '91'),
  },
  bunny: {
    storageZone: envValue('BUNNY_STORAGE_ZONE'),
    apiKey: envValue('BUNNY_STORAGE_API_KEY') || envValue('BUNNY_ACCESS_KEY'),
    cdnUrl: envValue('BUNNY_CDN_URL') || envValue('BUNNY_CDN_HOSTNAME'),
    region: process.env.BUNNY_STORAGE_REGION || '',
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  },
  privateFileDirectory: process.env.PRIVATE_FILE_DIRECTORY || '',
  privateFileMaxBytes: Number.isSafeInteger(requestedPrivateFileMaxBytes) && requestedPrivateFileMaxBytes > 0
    ? Math.min(5 * 1024 * 1024, requestedPrivateFileMaxBytes)
    : 5 * 1024 * 1024,
  devAuthEnabled: process.env.DEV_AUTH_ENABLED === 'true',
};

if (config.nodeEnv === 'production' && (!config.sessionSecret || config.sessionSecret.length < 32)) {
  throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
}
if (config.nodeEnv === 'production' && config.devAuthEnabled) {
  throw new Error('DEV_AUTH_ENABLED cannot be enabled in production.');
}
