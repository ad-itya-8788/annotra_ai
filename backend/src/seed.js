import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database');
try {
  const { rows: existingColumns } = await pool.query(
    `SELECT table_name,column_name FROM information_schema.columns
     WHERE table_schema=current_schema()
       AND table_name=ANY($1::text[])`,
    [['employees','vendors','projects','project_applications','announcements','notifications']],
  );
  const columnsByTable = new Map();
  for (const { table_name, column_name } of existingColumns) {
    if (!columnsByTable.has(table_name)) columnsByTable.set(table_name, new Set());
    columnsByTable.get(table_name).add(column_name);
  }
  const requiredColumns = {
    employees: ['id','full_name','email','mobile','role_id','status'],
    vendors: ['id','company_name','contact_person','email','mobile'],
    projects: ['id','name','code','vendor_id','required_skills','status'],
    project_applications: ['id','project_id','employee_id','status','applied_at'],
    announcements: ['id','title','body','priority','is_published'],
    notifications: ['id','employee_id','title','body','kind','read_at'],
  };
  for (const [table, required] of Object.entries(requiredColumns)) {
    const present = columnsByTable.get(table);
    const missing = present && required.filter((column) => !present.has(column));
    if (missing?.length) {
      throw new Error(
        `Database "${(await pool.query('SELECT current_database() AS name')).rows[0].name}" has an incompatible "${table}" table (missing ${missing.join(', ')}). Point backend/.env to a clean ProjectFlow database.`,
      );
    }
  }
  await pool.query(await fs.readFile(path.join(root, 'schema.sql'), 'utf8'));
  if (!process.argv.includes('--schema-only')) {
    await pool.query(await fs.readFile(path.join(root, 'seeds', 'seed.sql'), 'utf8'));
    console.log('ProjectFlow schema and repeatable demo seed applied.');
  } else {
    console.log('ProjectFlow schema applied.');
  }
} catch (error) {
  console.error('Database setup failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
