const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

const PYTHON_BIN = '/Users/artembutko/Documents/layer_3/venv/bin/python3';
const SCRIPT_PATH = path.join(__dirname, 'py_pdf_ocr.py');

function runPythonPdfOcr(pdfPath, lang = 'rus+eng') {
  return new Promise((resolve, reject) => {
  const args = [SCRIPT_PATH, '--input', pdfPath, '--lang', lang];
  const proc = spawn(PYTHON_BIN, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}` }
  });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (e) {
          logger.warn('py_pdf_ocr JSON parse failed', { error: e.message, stdout: stdout.slice(0, 200) });
          reject(new Error('Invalid JSON from py_pdf_ocr'));
        }
      } else {
        logger.warn('py_pdf_ocr failed', { code, stderr: stderr.slice(0, 500) });
        reject(new Error(stderr || `python exit ${code}`));
      }
    });
  });
}

module.exports = { runPythonPdfOcr };

