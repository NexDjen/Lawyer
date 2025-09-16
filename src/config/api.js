// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || (
  process.env.NODE_ENV === 'production' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : 'ws://localhost:3007'
);

console.log('🔧 API_BASE_URL настроен на:', API_BASE_URL);
console.log('🔧 WS_BASE_URL настроен на:', WS_BASE_URL);

// Utility function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Utility function to build full URLs (for downloads, etc.)
export const buildFullUrl = (endpoint) => {
  if (process.env.NODE_ENV === 'production') {
    return buildApiUrl(endpoint);
  }
  // In development, use full URL for debugging
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};
