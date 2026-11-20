import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { config } from '../config.js';

const allowedTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function contentMatchesMime(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mimeType === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (mimeType === 'application/pdf') return buffer.toString('ascii', 0, 5) === '%PDF-';
  if (mimeType === 'application/msword') return buffer.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }
  return false;
}

export async function uploadFile(file, folder) {
  const { storageZone, apiKey, cdnUrl, region } = config.bunny;
  if (!storageZone || !apiKey || !cdnUrl) {
    throw Object.assign(new Error('Bunny Storage is not configured. Set its storage zone, API key and CDN URL.'),{status:503});
  }
  if (!allowedTypes.has(file.mimetype)) throw Object.assign(new Error('Unsupported file type.'), { status: 400 });
  if (!contentMatchesMime(file.buffer,file.mimetype)) throw Object.assign(new Error('The file contents do not match the selected file type.'), { status: 400 });
  const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const name = `${randomUUID()}${extension}`;
  const host = region ? `${region}.storage.bunnycdn.com` : 'storage.bunnycdn.com';
  const destination = `https://${host}/${encodeURIComponent(storageZone)}/${folder}/${name}`;
  const response = await fetch(destination, {
    method: 'PUT',
    headers: { AccessKey: apiKey, 'Content-Type': file.mimetype },
    body: file.buffer,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Bunny Storage upload failed with HTTP ${response.status}.`);
  const base = cdnUrl.startsWith('http') ? cdnUrl : `https://${cdnUrl}`;
  return { fileName: name, fileUrl: `${base.replace(/\/$/, '')}/${folder}/${name}` };
}

export async function deleteFile(fileUrl) {
  const { storageZone, apiKey, cdnUrl, region } = config.bunny;
  if (!storageZone || !apiKey || !cdnUrl) {
    throw Object.assign(new Error('Bunny Storage is not configured. Set its storage zone, API key and CDN URL.'),{status:503});
  }
  const parsed = new URL(fileUrl);
  const cdnHost = cdnUrl.replace(/^https?:\/\//,'').split('/')[0];
  if (parsed.hostname !== cdnHost || !/^\/(employee-documents|project-attachments|form-responses)\/[a-f0-9-]+\.[a-z0-9]+$/i.test(parsed.pathname)) {
    throw Object.assign(new Error('The stored URL is not a valid ProjectFlow Bunny CDN file.'),{status:400});
  }
  const host = region ? `${region}.storage.bunnycdn.com` : 'storage.bunnycdn.com';
  const storagePath = parsed.pathname.slice(1).split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`https://${host}/${encodeURIComponent(storageZone)}/${storagePath}`, {
    method:'DELETE',
    headers:{AccessKey:apiKey},
    signal:AbortSignal.timeout(30_000),
  });
  if (!response.ok && response.status !== 404) {
    throw Object.assign(new Error(`Bunny Storage deletion failed with HTTP ${response.status}.`),{status:502});
  }
}
