// API configuration
const envApiBase = process.env.REACT_APP_API_URL;
const isProd = process.env.NODE_ENV === 'production';

// Use ngrok URL for global access
const NGROK_URL = 'https://274c3aef1743.ngrok-free.app';

// In production, use current origin without port for API
export const API_BASE_URL = envApiBase
  ? envApiBase.replace(/\/$/, '')
  : (isProd ? `${window.location.protocol}//${window.location.hostname}/api` : NGROK_URL);

// Optional explicit WS URL override
// In production, use same origin with ws:// or wss:// protocol
export const WS_BASE_URL = process.env.REACT_APP_WS_URL
  ? process.env.REACT_APP_WS_URL.replace(/\/$/, '')
  : (isProd ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}` : NGROK_URL.replace(/^https/, 'wss'));

// Debug logs
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 WS_BASE_URL:', WS_BASE_URL);

// Utility function to build API URLs
export const buildApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Utility function to build full URLs (for downloads, etc.)
export const buildFullUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};
