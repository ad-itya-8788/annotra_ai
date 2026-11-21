import nodemailer from 'nodemailer';
import { config } from '../config.js';

export function mailConfig() {
  return {
    configured: config.email.configured,
    missing: config.email.missing,
    from: config.email.from,
    host: config.email.host,
    port: config.email.port,
  };
}

export function createTransporter() {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: { user: config.email.user, pass: config.email.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export function sanitizeHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gis, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/<(object|embed|form|svg|math|link|meta|base|frame|frameset)\b[^>]*\/?>/gi, '')
    .replace(/<\/(object|embed|form|svg|math|frame|frameset)>/gi, '')
    .replace(/\s(?:style|href|src)\s*=\s*(['"])[^'"]*(?:javascript:|vbscript:|data:)[^'"]*\1/gi, '')
    .replace(/\b(?:javascript|vbscript|data):/gi, '')
    .trim();
}

export function plainToHtml(value) {
  const escaped = String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#263f75">${escaped.replace(/\r?\n/g, '<br/>')}</div>`;
}

export function htmlToPlain(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function invitationHtml(bodyHtml, message, projectName) {
  const content = sanitizeHtml(bodyHtml) || plainToHtml(message);
  return `<div style="background:#f4f6fb;padding:28px;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(38,63,117,.08)">
      <div style="background:linear-gradient(120deg,#4f46e5,#7c3aed);padding:26px 30px;color:#ffffff">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85">Annotra AI</div>
        <h1 style="margin:8px 0 0;font-size:24px">Project invitation</h1>
      </div>
      <div style="padding:26px 30px;color:#263f75;font-size:14px;line-height:1.65">${content}</div>
      <div style="margin:0 30px 26px;padding:14px 16px;background:#eef2ff;border-left:4px solid #6366f1;border-radius:6px">
        <b>Project:</b> ${String(projectName || '').replace(/[<>&]/g, '')}
      </div>
    </div>
  </div>`;
}
