import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const envValue = (name, fallback = '') => process.env[name]?.trim() || fallback;
const messageCentralEnvValue = (name, legacyName, fallback = '') =>
  envValue(name) || envValue(legacyName, fallback);
const frontendUrl = envValue('FRONTEND_URL', 'http://localhost:5173').replace(/\/+$/, '');
const requestedPrivateFileMaxBytes = Number(process.env.PRIVATE_FILE_MAX_BYTES || 5 * 1024 * 1024);
const databaseSslCaPath = process.env.DB_SSL_CA_PATH?.trim();
const databaseSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const databaseSslCa = databaseSslCaPath
  ? readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', databaseSslCaPath), 'utf8')
  : undefined;
function databaseConnectionString() {
  const value = process.env.DATABASE_URL;
  if (!value || envValue('DB_FORCE_SESSION_POOLER') === 'true') return value;
  try {
    const url = new URL(value);
    if (url.hostname.endsWith('.pooler.supabase.com') && (!url.port || url.port === '5432')) {
      url.port = '6543';
      return url.toString();
    }
  } catch {
    return value;
  }
  return value;
}
const connectionString = databaseConnectionString();
const databaseHost = process.env.DB_HOST || 'localhost';
const forceSessionPooler = envValue('DB_FORCE_SESSION_POOLER') === 'true';
const useTransactionPooler = !forceSessionPooler
  && databaseHost.endsWith('.pooler.supabase.com')
  && (!process.env.DB_PORT || process.env.DB_PORT.trim() === '5432');
const databasePort = useTransactionPooler ? 6543 : Number(process.env.DB_PORT || 5432);
const emailUser = envValue('EMAIL_USER');
const emailPassword = envValue('EMAIL_PASSWORD');
const emailHost = envValue('EMAIL_HOST', 'smtp.gmail.com');
const emailPort = Number(envValue('EMAIL_PORT', '587'));
const emailFrom = envValue('EMAIL_FROM') || emailUser;
const emailMissing = [
  !emailHost && 'EMAIL_HOST',
  !Number.isInteger(emailPort) || emailPort <= 0 ? 'EMAIL_PORT' : '',
  !emailUser && 'EMAIL_USER',
  !emailPassword && 'EMAIL_PASSWORD',
  !emailFrom && 'EMAIL_FROM',
].filter(Boolean);
const emailConfig = {
  host: emailHost,
  port: emailPort,
  user: emailUser,
  password: emailPassword,
  from: emailFrom,
  missing: emailMissing,
  configured: emailMissing.length === 0,
};

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl,
  database: {
    connectionString,
    host: process.env.DATABASE_URL ? undefined : databaseHost,
    port: process.env.DATABASE_URL ? undefined : databasePort,
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
    sendUrl: messageCentralEnvValue('MESSAGE_CENTRAL_SEND_OTP_URL', 'MESSAGECENTRAL_SEND_OTP_URL', 'https://cpaas.messagecentral.com/verification/v3/send'),
    verifyUrl: messageCentralEnvValue('MESSAGE_CENTRAL_VALIDATE_OTP_URL', 'MESSAGECENTRAL_VALIDATE_OTP_URL', 'https://cpaas.messagecentral.com/verification/v3/validateOtp'),
    customerId: messageCentralEnvValue('MESSAGE_CENTRAL_CUSTOMER_ID', 'MESSAGECENTRAL_CUSTOMER_ID'),
    authToken: envValue('MESSAGE_CENTRAL_AUTH_TOKEN')
      || envValue('MESSAGE_CENTRAL_API_KEY')
      || envValue('MESSAGECENTRAL_AUTH_TOKEN')
      || envValue('MESSAGECENTRAL_API_KEY'),
    countryCode: messageCentralEnvValue('MESSAGE_CENTRAL_COUNTRY_CODE', 'MESSAGECENTRAL_COUNTRY_CODE', '91'),
  },
  bunny: {
    storageZone: envValue('BUNNY_STORAGE_ZONE'),
    apiKey: envValue('BUNNY_STORAGE_API_KEY') || envValue('BUNNY_ACCESS_KEY'),
    cdnUrl: envValue('BUNNY_CDN_URL') || envValue('BUNNY_CDN_HOSTNAME'),
    region: process.env.BUNNY_STORAGE_REGION || '',
  },
  email: emailConfig,
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
