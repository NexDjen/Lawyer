/**
 * Safe download utilities that work only in browser environment
 */

/**
 * Download a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 * @returns {boolean} - true if successful, false if not in browser
 */
export const downloadBlob = (blob, filename) => {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('⚠️ Download not available: Not in browser environment');
    return false;
  }

  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error downloading blob:', error);
    return false;
  }
};

/**
 * Download text as a file
 * @param {string} text - The text to download
 * @param {string} filename - The filename for the download
 * @returns {boolean} - true if successful, false if not in browser
 */
export const downloadText = (text, filename) => {
  const blob = new Blob([text], { type: 'text/plain' });
  return downloadBlob(blob, filename);
};

/**
 * Download JSON as a file
 * @param {Object} data - The data to download
 * @param {string} filename - The filename for the download
 * @returns {boolean} - true if successful, false if not in browser
 */
export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  return downloadBlob(blob, filename);
};

/**
 * Download file from URL
 * @param {string} url - The URL to download from
 * @param {string} filename - The filename for the download
 * @returns {boolean} - true if successful, false if not in browser
 */
export const downloadFromURL = (url, filename) => {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('⚠️ Download not available: Not in browser environment');
    return false;
  }

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Error downloading from URL:', error);
    return false;
  }
};

/**
 * Check if downloads are available (browser environment)
 * @returns {boolean} - true if downloads are available
 */
export const isDownloadAvailable = () => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};




