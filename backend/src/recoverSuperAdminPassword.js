import { randomUUID } from 'node:crypto';
import { pool, inTransaction } from './db.js';
import { hashPassword } from './password.js';

const ownerMobileDigits = '8788200189';

function readHidden(prompt) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Run this recovery command directly in a trusted interactive terminal.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = input.isRaw;
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();

    const finish = (error) => {
      input.off('data', onData);
      input.setRawMode(wasRaw);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') return finish(new Error('Password recovery cancelled.'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
        } else if (character >= ' ') {
          value += character;
        }
      }
    };

    input.on('data', onData);
  });
}

try {
  if (process.env.NODE_ENV === 'production' && !process.stdin.isTTY) {
    throw new Error('Run this recovery command from a trusted interactive terminal.');
  }

  const password = await readHidden('New Super Admin password: ');
  const confirmation = await readHidden('Confirm new password: ');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must be 12–128 characters and include lowercase, uppercase, and numeric characters.');
  }

  const passwordHash = await hashPassword(password);
  await inTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE employees
       SET password_hash=$1,updated_at=NOW()
       WHERE regexp_replace(mobile,'[^0-9]','','g') IN ($2,'91'||$2)
         AND status='active'
         AND role_id=(SELECT id FROM roles WHERE name='Super Admin')
       RETURNING id`,
      [passwordHash, ownerMobileDigits],
    );
    if (!rows[0]) throw new Error('No active Super Admin exists for the configured owner mobile. Initialize the owner first.');

    await client.query(
      `INSERT INTO audit_logs (actor_employee_id,action,target_employee_id)
       VALUES ($1,'super_admin.password_recovered',$1)`,
      [rows[0].id],
    );
  });
  console.log('Super Admin password updated. Sign in with the password login tab.');
} catch (error) {
  console.error('Super Admin password recovery failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
