/**
 * Media handling: download from Telegram, compress with sharp, save to disk.
 */

import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MEDIA_PATH = process.env.MEDIA_PATH || '/app/public/media';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '20971520', 10); // 20 MB default

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
]);

/**
 * Download a file from Telegram by fileId.
 *
 * Throws structured errors with a `code` property:
 *   - 'FILE_TOO_LARGE'     — file exceeds sizeLimit
 *   - 'UNSUPPORTED_TYPE'   — MIME type not supported
 *   - 'DOWNLOAD_FAILED'    — network or Telegram API error
 *
 * @param {import('telegraf').Context} ctx
 * @param {string} fileId
 * @param {number} [sizeLimit] — bytes, defaults to MAX_FILE_SIZE
 * @returns {Promise<Buffer>}
 */
export async function downloadTelegramFile(ctx, fileId, sizeLimit = MAX_FILE_SIZE) {
  let file;
  try {
    file = await ctx.telegram.getFile(fileId);
  } catch (err) {
    const error = new Error(`Failed to get file info: ${err.message}`);
    error.code = 'DOWNLOAD_FAILED';
    throw error;
  }

  // Check size if Telegram reported it
  if (file.file_size && file.file_size > sizeLimit) {
    const error = new Error(
      `File size ${file.file_size} exceeds limit ${sizeLimit}`
    );
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }

  // Build download URL
  const botToken = process.env.BOT_TOKEN;
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;

  let res;
  try {
    res = await fetch(fileUrl);
  } catch (err) {
    const error = new Error(`Network error downloading file: ${err.message}`);
    error.code = 'DOWNLOAD_FAILED';
    throw error;
  }

  if (!res.ok) {
    const error = new Error(`Telegram file download failed: ${res.status}`);
    error.code = 'DOWNLOAD_FAILED';
    throw error;
  }

  // Check Content-Type
  const contentType = res.headers.get('content-type') || '';
  const mimeBase = contentType.split(';')[0].trim().toLowerCase();
  if (mimeBase && !SUPPORTED_MIME_TYPES.has(mimeBase)) {
    const error = new Error(`Unsupported MIME type: ${mimeBase}`);
    error.code = 'UNSUPPORTED_TYPE';
    throw error;
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // Double-check actual size
  if (buffer.length > sizeLimit) {
    const error = new Error(
      `Downloaded file size ${buffer.length} exceeds limit ${sizeLimit}`
    );
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }

  return buffer;
}

/**
 * Compress a buffer with sharp and save it to MEDIA_PATH.
 *
 * @param {Buffer} buffer      — raw image bytes
 * @param {'image' | 'avatar'} type
 * @returns {Promise<string>}  — public path like '/media/{uuid}.jpg'
 */
export async function compressAndSave(buffer, type = 'image') {
  await mkdir(MEDIA_PATH, { recursive: true });

  const uuid = randomUUID();
  const filename = `${uuid}.jpg`;
  const outputPath = path.join(MEDIA_PATH, filename);

  let pipeline = sharp(buffer).rotate(); // auto-orient from EXIF

  if (type === 'avatar') {
    pipeline = pipeline.resize(400, 400, { fit: 'cover', position: 'attention' });
  } else {
    pipeline = pipeline.resize(1920, 1920, { fit: 'inside', withoutEnlargement: true });
  }

  const quality = type === 'avatar' ? 80 : 85;
  pipeline = pipeline.jpeg({ quality, mozjpeg: true });

  const output = await pipeline.toBuffer();
  await writeFile(outputPath, output);

  return `/media/${filename}`;
}
