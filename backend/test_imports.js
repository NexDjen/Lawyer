console.log('Testing imports...');

try {
  console.log('Testing express...');
  const express = require('express');
  console.log('Express OK');
  
  console.log('Testing config...');
  const config = require('./config/config');
  console.log('Config OK');
  
  console.log('Testing logger...');
  const logger = require('./utils/logger');
  console.log('Logger OK');
  
  console.log('Testing chatRoutes...');
  const chatRoutes = require('./routes/chatRoutes');
  console.log('chatRoutes OK');
  
  console.log('Testing documentRoutes...');
  const documentRoutes = require('./routes/documentRoutes');
  console.log('documentRoutes OK');
  
  console.log('Testing adminRoutes...');
  const adminRoutes = require('./routes/adminRoutes');
  console.log('adminRoutes OK');
  
  console.log('Testing courtRoutes...');
  const courtRoutes = require('./routes/courtRoutes');
  console.log('courtRoutes OK');
  
  console.log('Testing walletRoutes...');
  const walletRoutes = require('./routes/walletRoutes');
  console.log('walletRoutes OK');
  
  console.log('Testing profileRoutes...');
  const profileRoutes = require('./routes/profileRoutes');
  console.log('profileRoutes OK');
  
  console.log('All imports successful!');
  
} catch (error) {
  console.error('Import failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
