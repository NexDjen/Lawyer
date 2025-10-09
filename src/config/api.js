// API configuration
const envApiBase = process.env.REACT_APP_API_URL;
const isProd = process.env.NODE_ENV === 'production';

// Use ngrok URL for global access
const NGROK_URL = 'https://274c3aef1743.ngrok-free.app';

// In production, default to current origin + /api if not provided
export const API_BASE_URL = envApiBase
  ? envApiBase.replace(/\/$/, '')
  : (isProd ? `${window.location.origin}/api` : NGROK_URL);

// Optional explicit WS URL override
// In production, connect to backend server port 3007
export const WS_BASE_URL = process.env.REACT_APP_WS_URL
  ? process.env.REACT_APP_WS_URL.replace(/\/$/, '')
  : (isProd ? `ws://${window.location.hostname}:3007` : NGROK_URL.replace(/^https/, 'wss'));

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
