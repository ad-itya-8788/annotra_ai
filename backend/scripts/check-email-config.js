import nodemailer from 'nodemailer';
import { config } from '../src/config.js';

if (!config.email.configured) {
  console.error(`Email is not configured. Missing: ${config.email.missing.join(', ')}`);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: { user: config.email.user, pass: config.email.password },
});

try {
  await transporter.verify();
  console.log(`Email configuration is valid. SMTP login succeeded for ${config.email.from}.`);
} catch (error) {
  console.error(`SMTP login failed: ${error.code || error.message}`);
  process.exit(1);
}
