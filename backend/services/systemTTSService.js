const { spawn } = require('child_process');
const fs = require('fs');

// System TTS using espeak (outputs WAV) and ffmpeg to convert to MP3
async function synthesizeSpeech(text) {
  return new Promise((resolve, reject) => {
    const wavPath = '/tmp/system_tts.wav';
    const mp3Path = '/tmp/system_tts.mp3';
    // Generate WAV via espeak
    const espeak = spawn('espeak', ['-w', wavPath, text]);
    espeak.on('error', (err) => reject(err));
    espeak.on('close', (code) => {
      if (code !== 0) return reject(new Error('espeak failed'));
      // Convert WAV to MP3
      const ffmpeg = spawn('ffmpeg', ['-y', '-i', wavPath, mp3Path]);
      ffmpeg.on('error', (err) => reject(err));
      ffmpeg.on('close', (fc) => {
        if (fc !== 0) return reject(new Error('ffmpeg conversion failed'));
        fs.readFile(mp3Path, (err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
    });
  });
}

module.exports = { synthesizeSpeech };





