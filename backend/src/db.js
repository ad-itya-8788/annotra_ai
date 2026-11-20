import pg from 'pg';
import { config } from './config.js';

const requestedPoolMax = Number(process.env.DB_POOL_MAX);
const poolMax = Number.isSafeInteger(requestedPoolMax) && requestedPoolMax > 0
  ? Math.min(requestedPoolMax, config.nodeEnv === 'production' ? 5 : 10)
  : config.nodeEnv === 'production' ? 2 : 5;

export const pool = new pg.Pool({
  ...config.database,
  max: poolMax,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export async function inTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
