const { execFile, exec } = require('child_process');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');
const { processDocument } = require('./documentService');

function which(cmd) {
  return new Promise((resolve) => {
    exec(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`,(err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim() || null);
    });
  });
}

async function isPdftoppmAvailable() {
  const bin = await which('pdftoppm');
  return !!bin;
}

function runPdftoppm(pdfPath, outPrefix, dpi = 300) {
  return new Promise((resolve, reject) => {
    execFile('pdftoppm', ['-png', '-r', String(dpi), pdfPath, outPrefix], (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve();
    });
  });
}

async function rasterizePdfToImages(pdfPath, dpi = 300) {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pdf_ocr_'));
  const prefix = path.join(tempDir, 'page');
  await runPdftoppm(pdfPath, prefix, dpi);
  const files = (await fsp.readdir(tempDir))
    .filter((f) => f.startsWith('page-') || f.startsWith('page'))
    .filter((f) => f.endsWith('.png'))
    .map((f) => path.join(tempDir, f))
    .sort();
  return { tempDir, images: files };
}

async function ocrPdfByRasterization(pdfPath, documentType = 'unknown') {
  if (!await isPdftoppmAvailable()) {
    throw new Error('pdftoppm is not available. Install poppler (e.g., brew install poppler)');
  }
  const { tempDir, images } = await rasterizePdfToImages(pdfPath, 300);
  const cleanup = async () => {
    try { await fsp.rm(tempDir, { recursive: true, force: true }); } catch (_) {}
  };
  try {
    let combinedText = '';
    const pageResults = [];
    for (const [idx, img] of images.entries()) {
      logger.info('PDF OCR: processing page image', { page: idx + 1, path: img });
      const res = await processDocument(img, documentType);
      pageResults.push(res);
      if (res.recognizedText) {
        combinedText += (combinedText ? '\n\n' : '') + `--- Страница ${idx + 1} ---\n` + res.recognizedText;
      }
    }
    const aggregate = {};
    const preferKeys = ['series','number','firstName','lastName','middleName','birthDate','birthPlace','issueDate','issuedBy'];
    for (const key of preferKeys) {
      for (const r of pageResults) {
        const val = r.extractedData ? r.extractedData[key] : '';
        if (val) { aggregate[key] = val; break; }
      }
    }
    const confidences = pageResults.map(r => Number(r.confidence || 0)).filter(n => !Number.isNaN(n));
    const confidence = confidences.length ? (confidences.reduce((a,b)=>a+b,0) / confidences.length) : undefined;
    return { extractedData: aggregate, recognizedText: combinedText, confidence };
  } finally {
    await cleanup();
  }
}

module.exports = {
  isPdftoppmAvailable,
  ocrPdfByRasterization,
};

