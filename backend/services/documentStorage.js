const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'documents.json');

async function ensureDb() {
  await fsp.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
  if (!fs.existsSync(DB_FILE)) {
    await fsp.writeFile(DB_FILE, JSON.stringify({ items: [] }, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fsp.readFile(DB_FILE, 'utf-8');
  try { return JSON.parse(raw); } catch { return { items: [] }; }
}

async function writeDb(db) {
  await ensureDb();
  await fsp.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

function genId(prefix = 'doc') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function savePDFMetadata(filePath, originalName, sizeBytes) {
  const db = await readDb();
  const id = genId('pdf');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days
  db.items.push({ id, kind: 'pdf', filePath, originalName, sizeBytes, createdAt, expiresAt });
  await writeDb(db);
  logger.info('PDF stored metadata', { id, originalName, sizeBytes });
  return { id, createdAt, expiresAt };
}

async function saveOCRResult({ documentType, extractedData, recognizedText, confidence }) {
  const db = await readDb();
  const id = genId('ocr');
  const createdAt = new Date().toISOString();
  db.items.push({ id, kind: 'ocr', documentType, extractedData, recognizedText, confidence, createdAt, expiresAt: null });
  await writeDb(db);
  logger.info('OCR result stored', { id, documentType });
  return { id, createdAt };
}

async function cleanupExpired() {
  const db = await readDb();
  const now = Date.now();
  const keep = [];
  for (const item of db.items) {
    if (item.expiresAt && Date.parse(item.expiresAt) <= now) {
      // try delete file
      if (item.filePath && fs.existsSync(item.filePath)) {
        try { await fsp.unlink(item.filePath); } catch (_) {}
      }
      logger.info('Deleted expired file', { id: item.id, filePath: item.filePath });
    } else {
      keep.push(item);
    }
  }
  if (keep.length !== db.items.length) {
    db.items = keep;
    await writeDb(db);
  }
}

function scheduleCleanup() {
  // run on start and hourly
  cleanupExpired().catch((e) => logger.warn('Initial cleanup failed', { error: e.message }));
  setInterval(() => {
    cleanupExpired().catch((e) => logger.warn('Cleanup failed', { error: e.message }));
  }, 60 * 60 * 1000);
}

module.exports = {
  savePDFMetadata,
  saveOCRResult,
  readDb,
  cleanupExpired,
  scheduleCleanup,
};

