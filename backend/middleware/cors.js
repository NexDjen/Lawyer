const config = require('../config/config');
const logger = require('../utils/logger');

const corsOptions = {
  // Allow only specific origins and support credentials
  origin: function (origin, callback) {
    // Non-browser or no origin (e.g., curl, mobile apps without origin)
    if (!origin) {
      return callback(null, true);
    }
    // Allow if origin is in the whitelist and reflect that origin
    if (config.cors.origins.includes(origin)) {
      return callback(null, origin);
    }
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 