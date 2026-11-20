import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

try {
  const { rows: employeeColumns } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema=current_schema() AND table_name='employees'`,
  );
  const availableColumns = new Set(employeeColumns.map(({ column_name }) => column_name));
  const requiredColumns = ['id', 'full_name', 'email', 'mobile', 'role_id', 'status'];
  const missingColumns = requiredColumns.filter((column) => !availableColumns.has(column));
  if (missingColumns.length) {
    throw new Error(`Employee signup migration requires an employees table with columns: ${requiredColumns.join(', ')}. Missing: ${missingColumns.join(', ')}.`);
  }

  const { rows: emailDuplicates } = await pool.query(
    `SELECT LOWER(email) AS email FROM employees
     GROUP BY LOWER(email) HAVING COUNT(*) > 1 LIMIT 1`,
  );
  if (emailDuplicates.length) {
    throw new Error('Employee signup migration stopped because duplicate email addresses differ only by case. Resolve the duplicates before retrying.');
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS app_migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
  const migrations = (await fs.readdir(migrationsDirectory)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of migrations) {
    const alreadyApplied = await pool.query('SELECT 1 FROM app_migrations WHERE name=$1', [name]);
    if (alreadyApplied.rowCount) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(await fs.readFile(path.join(migrationsDirectory, name), 'utf8'));
      await client.query('INSERT INTO app_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`Applied migration: ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
