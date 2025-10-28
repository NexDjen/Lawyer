// API configuration
const envApiBase = process.env.REACT_APP_API_URL;
const isProd = process.env.NODE_ENV === 'production';

// Use localhost for development
const DEV_API_URL = '/api';

// In production use relative paths to let nginx handle SSL and ports
export const API_BASE_URL = isProd
  ? '/api'
  : (envApiBase ? envApiBase.replace(/\/$/, '') : DEV_API_URL);

// Optional explicit WS URL override
// In production, connect to nginx proxy port 1041 with WebSocket support
export const WS_BASE_URL = isProd
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  : (process.env.REACT_APP_WS_URL
      ? process.env.REACT_APP_WS_URL.replace(/\/$/, '')
      : 'ws://localhost:3009');

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
