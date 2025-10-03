const config = require('../config/config');
const logger = require('../utils/logger');

const corsOptions = {
  // Allow all origins
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 