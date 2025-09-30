const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('../utils/logger');
const sharp = require('sharp');

const PYTHON_BIN = process.env.PYTHON_PATH || 'python3';
const SCRIPT_PATH = path.join(__dirname, 'py_preprocess.py');

function runPythonPreprocess(inputPath) {
  return new Promise((resolve, reject) => {
    try {
      const outPath = path.join(
        path.dirname(inputPath),
        `pre_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
      );
      const args = [SCRIPT_PATH, '--input', inputPath, '--output', outPath];
      const proc = spawn(PYTHON_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outPath)) {
          resolve(outPath);
        } else {
          logger.warn('Python preprocess failed', { code, stderr });
          reject(new Error(stderr || `python exit ${code}`));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function preprocessImageAdvanced(inputPath) {
  try {
    logger.info('Advanced image preprocessing start', { inputPath });
    let processedPath = inputPath;
    // Сначала пытаемся Python предобработку
    try {
      processedPath = await runPythonPreprocess(inputPath);
      logger.info('Python preprocessing done', { processedPath });
    } catch (pyErr) {
      logger.warn('Python preprocessing failed, fallback to sharp', { error: pyErr.message });
      // Sharp fallback: grayscale, normalize, повышаем контраст
      const sharpOut = path.join(
        path.dirname(inputPath),
        `pre_sharp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
      );
      await sharp(inputPath)
        .grayscale()
        .normalize()
        .linear(1.5, -0.5)
        .toFile(sharpOut);
      logger.info('Sharp preprocessing done', { sharpOut });
      processedPath = sharpOut;
    }
    return processedPath;
  } catch (e) {
    logger.warn('Advanced preprocessing failed, fallback to original', { error: e.message });
    return inputPath;
  }
}

module.exports = { preprocessImageAdvanced };

