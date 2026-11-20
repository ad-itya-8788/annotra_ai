import { pool, inTransaction } from './db.js';

const ownerMobile = '+918788200189';
const args = process.argv.slice(2);
const getArgument = (name) => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? '' : String(args[index + 1] || '').trim();
};

try {
  const fullName = getArgument('name');
  const email = getArgument('email').toLowerCase();
  if (!fullName || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide --name "Owner full name" and --email owner@example.com. The owner mobile number is fixed to the configured system owner.');
  }
  const migration = await pool.query(
    `SELECT 1 FROM app_migrations WHERE name='20261027_employee_signup.sql'`,
  );
  if (!migration.rowCount) throw new Error('Run npm run db:migrate --prefix backend before initializing the Super Admin.');

  const outcome = await inTransaction(async (client) => {
    const { rows: roleRows } = await client.query(`SELECT id FROM roles WHERE name='Super Admin'`);
    if (!roleRows[0]) throw new Error('The Super Admin system role is missing. Run the compatible database setup before initializing the owner.');
    const { rows: emailRows } = await client.query(
      `SELECT id FROM employees WHERE LOWER(email)=LOWER($1) AND regexp_replace(mobile,'[^0-9]','','g') NOT IN ('8788200189','918788200189')`,
      [email],
    );
    if (emailRows[0]) throw new Error('That email address already belongs to a different employee.');
    const { rows: ownerRows } = await client.query(
      `SELECT id FROM employees
       WHERE regexp_replace(mobile,'[^0-9]','','g') IN ('8788200189','918788200189')
       FOR UPDATE`,
    );

    let owner;
    if (ownerRows[0]) {
      const { rows } = await client.query(
        `UPDATE employees SET full_name=$2,email=$3,role_id=$4,status='active',password_hash=NULL,updated_at=NOW()
         WHERE id=$1 RETURNING id`,
        [ownerRows[0].id, fullName, email, roleRows[0].id],
      );
      owner = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO employees (full_name,email,mobile,employee_type,role_id,status)
         VALUES ($1,$2,$3,'Employee',$4,'active') RETURNING id`,
        [fullName, email, ownerMobile, roleRows[0].id],
      );
      owner = rows[0];
    }
    await client.query(
      `INSERT INTO audit_logs (actor_employee_id,action,target_employee_id)
       VALUES ($1,'super_admin.initialized',$1)`,
      [owner.id],
    );
    return owner;
  });
  console.log(`Super Admin initialized for the configured owner number. Employee ID: ${outcome.id}. Sign in using verified mobile OTP.`);
} catch (error) {
  console.error('Super Admin initialization failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
