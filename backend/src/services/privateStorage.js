import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const defaultDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../private-files');
const privateDirectory = path.resolve(config.privateFileDirectory || defaultDirectory);
const resumeTypes = new Map([
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

function isValidPrivateUpload(file) {
  if (file.mimetype === 'application/pdf') return file.buffer.toString('ascii', 0, 5) === '%PDF-';
  if (file.mimetype === 'application/msword') return file.buffer.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return file.buffer[0] === 0x50 && file.buffer[1] === 0x4b && file.buffer[2] === 0x03 && file.buffer[3] === 0x04;
  }
  if (file.mimetype === 'image/jpeg') return file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  if (file.mimetype === 'image/png') return file.buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (file.mimetype === 'image/webp') return file.buffer.toString('ascii', 0, 4) === 'RIFF' && file.buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

export async function savePrivateUpload(file) {
  if (!file || !resumeTypes.has(file.mimetype)) {
    throw Object.assign(new Error('Unsupported private upload type.'), { status: 400 });
  }
  if (file.size > config.privateFileMaxBytes) {
    throw Object.assign(new Error('File must be no larger than 5 MB.'), { status: 413 });
  }
  if (!isValidPrivateUpload(file)) {
    throw Object.assign(new Error('The file contents do not match the selected file type.'), { status: 400 });
  }
  await fs.mkdir(privateDirectory, { recursive: true });
  const id = randomUUID();
  const fileName = `${id}${resumeTypes.get(file.mimetype)}`;
  const destination = path.join(privateDirectory, fileName);
  await fs.writeFile(destination, file.buffer, { flag: 'wx', mode: 0o600 });
  return { id, fileName, filePath: destination, originalName: path.basename(file.originalname).slice(0, 200), mimeType: file.mimetype, sizeBytes: file.size };
}

export async function removePrivateFile(filePath) {
  if (!filePath || path.dirname(path.resolve(filePath)) !== privateDirectory) return;
  await fs.rm(filePath, { force: true });
}

export async function readPrivateFile(fileName) {
  if (!/^[0-9a-f-]{36}\.(pdf|doc|docx|jpg|png|webp)$/i.test(fileName)) return null;
  const filePath = path.join(privateDirectory, fileName);
  try {
    const [buffer, stat] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
    return { buffer, size: stat.size, filePath };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
