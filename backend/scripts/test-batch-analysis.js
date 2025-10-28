#!/usr/bin/env node

/**
 * Test script for batch document analysis
 * Usage: node scripts/test-batch-analysis.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3007';
const USER_ID = process.env.USER_ID || '1';

/**
 * Create sample test files
 */
function createSampleFiles() {
  const samplesDir = path.join(__dirname, '../temp/batch-samples');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  // Create sample text file 1
  const file1 = path.join(samplesDir, 'document1.txt');
  fs.writeFileSync(file1, `
CONTRACT AGREEMENT

Parties:
- Aleksandr Petrov (Buyer)
- Yulia Smirnova (Seller)

Date: October 21, 2025
Amount: 500,000 RUB

Terms and Conditions:
1. Payment shall be made in full within 30 days
2. Delivery date: November 15, 2025
3. Conditions: Good condition, no damages
4. Warranty: 1 year from delivery date
5. Dispute resolution: Moscow Arbitration Court

Signatures:
_____________________     _____________________
Aleksandr Petrov          Yulia Smirnova
Buyer                     Seller
  `);

  // Create sample text file 2
  const file2 = path.join(samplesDir, 'document2.txt');
  fs.writeFileSync(file2, `
PAYMENT CONFIRMATION

Date: October 19, 2025
Transaction ID: TX-2025-001847
Payer: Aleksandr Petrov
Recipient: Yulia Smirnova
Amount: 250,000 RUB (50% advance payment)
Status: COMPLETED

Payment Details:
- Bank: Sberbank
- Method: Wire Transfer
- Confirmation Number: 847294857
- Time: 14:32 Moscow Time

Note: Remaining 250,000 RUB due upon delivery
  `);

  // Create sample text file 3
  const file3 = path.join(samplesDir, 'document3.txt');
  fs.writeFileSync(file3, `
DELIVERY TIMELINE

Item: Electronic Equipment
Batch Number: BATCH-2025-847

Expected Delivery:
- October 28, 2025: Processing
- November 1, 2025: Shipping
- November 7-15, 2025: In Transit
- November 15, 2025: Expected Delivery

Tracking: Available at www.logistics.ru/track/847294857

Risks:
- Delays due to customs clearance (2-5 days possible)
- Weather conditions may affect delivery
- Insurance included for damage up to 500,000 RUB
  `);

  return [file1, file2, file3];
}

/**
 * Test batch analysis
 */
async function testBatchAnalysis() {
  try {
    console.log('🧪 Starting Batch Analysis Test');
    console.log('===============================\n');

    // Create sample files
    console.log('📝 Creating sample test files...');
    const files = createSampleFiles();
    console.log(`✅ Created ${files.length} sample files\n`);

    // Prepare form data
    console.log('📦 Preparing upload...');
    const form = new FormData();
    
    // Add files
    for (const file of files) {
      form.append('documents', fs.createReadStream(file));
      console.log(`  - Adding: ${path.basename(file)}`);
    }
    
    // Add metadata
    form.append('userId', USER_ID);
    form.append('caseName', 'Import Purchase Case 2025');
    form.append('caseNumber', 'CASE-2025-847');
    form.append('description', 'Contract, payment confirmation, and delivery timeline analysis');
    form.append('documentType', 'legal');

    console.log('\n🚀 Sending request to:', `${API_BASE}/api/documents/batch-ocr-analysis\n`);

    // Send request
    const startTime = Date.now();
    const response = await axios.post(
      `${API_BASE}/api/documents/batch-ocr-analysis`,
      form,
      {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const duration = Date.now() - startTime;

    // Display results
    console.log('✅ Success!\n');
    console.log('📊 Response Summary:');
    console.log('===================');
    const result = response.data.data || response.data;
    console.log(`Case ID: ${result.caseId}`);
    console.log(`Case Name: ${result.caseName}`);
    console.log(`Total Files: ${result.totalFiles}`);
    console.log(`Processing Time: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`OCR Confidence: ${(result.ocrResult?.confidence * 100 || 0).toFixed(2)}%`);
    console.log(`Total Pages: ${result.ocrResult?.totalPages || 0}`);
    console.log(`Text Length: ${result.ocrResult?.textLength || 0} characters`);
    
    console.log('\n📋 Analysis Results:');
    console.log('====================');
    if (result.analysis) {
      console.log(`Summary: ${result.analysis.summary?.documentType || 'N/A'}`);
      console.log(`Risks Found: ${result.analysis.risks?.length || 0}`);
      console.log(`Recommendations: ${result.analysis.recommendations?.length || 0}`);
      console.log(`Legal Errors: ${result.analysis.legalErrors?.length || 0}`);
    }

    console.log('\n🏷️  Metadata:');
    console.log('=============');
    console.log(`Icon: ${result.metadata?.icon || 'briefcase'} (briefcase)`);
    console.log(`Processed At: ${result.metadata?.processedAt || 'N/A'}`);

    // Test retrieval
    console.log('\n\n🔍 Testing Case Retrieval...');
    console.log('============================\n');

    const caseId = result.caseId;
    const getResponse = await axios.get(
      `${API_BASE}/api/documents/batch-cases/${caseId}`
    );

    if (getResponse.data.success) {
      console.log('✅ Case retrieved successfully!');
      console.log(`Case: ${getResponse.data.data.case_name}`);
      console.log(`Files: ${getResponse.data.data.file_count}`);
      console.log(`Created: ${getResponse.data.data.created_at}`);
    }

    // Test listing
    console.log('\n\n📚 Testing Cases Listing...');
    console.log('============================\n');

    const listResponse = await axios.get(
      `${API_BASE}/api/documents/batch-cases?userId=${USER_ID}`
    );

    if (listResponse.data.success) {
      console.log(`✅ Found ${listResponse.data.count} case(s) for user ${USER_ID}`);
      listResponse.data.data.forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.case_name} (${c.file_count} files)`);
      });
    }

    console.log('\n\n✨ All tests completed successfully!');
    console.log('====================================\n');

  } catch (error) {
    console.error('❌ Error during test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run test
testBatchAnalysis().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
