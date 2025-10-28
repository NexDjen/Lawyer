# Batch Document Analysis Flow - AI Lawyer

## Overview
New batch document analysis feature that processes multiple documents through a unified OCR and LLM pipeline, creating a "case" entity with a briefcase icon for multiple documents analyzed together.

## Algorithm Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ BATCH DOCUMENT ANALYSIS FLOW                                    │
└─────────────────────────────────────────────────────────────────┘

1. FILE UPLOAD
   └─> Multiple documents uploaded via API
       • Supports: JPG, PNG, PDF, DOCX, TXT
       • Max 50GB per file
       • Multiple files in single request

2. PARALLEL OCR PROCESSING
   └─> All files processed with OpenAI Vision in parallel batches
       • Batch size: 3 concurrent requests (to avoid rate limits)
       • Each file converted to base64
       • Smart preprocessing (deblurring, noise reduction)
       • OCR confidence calculated per file
       • Results combined with page markers
       • Average confidence calculated across all pages

3. TEXT COMBINATION
   └─> All OCR results merged into single unified text
       === ДОКУМЕНТ 1: file1.pdf ===
       [OCR text from file 1]
       
       === ДОКУМЕНТ 2: file2.jpg ===
       [OCR text from file 2]
       
       === ДОКУМЕНТ 3: file3.png ===
       [OCR text from file 3]

4. UNIFIED LLM ANALYSIS
   └─> Complete combined text sent to LLM as single request
       • System role: Legal document analysis specialist
       • Model: GPT-4o or configured windexai model
       • Max tokens: 6000 (for comprehensive case analysis)
       • Response format: JSON
       • Temperature: 0.1 (for accuracy)
       
       Analysis includes:
       • Risks identified across all documents
       • Legal errors and inconsistencies
       • Recommendations for actions
       • Summary of entire case
       • Cross-document references

5. CASE CREATION & STORAGE
   └─> Results saved as unified "batch case"
       • Case ID: case_[timestamp]_[random]
       • Case name: auto-generated from filenames or user-provided
       • Case number: optional user input
       • Icon: 'briefcase' (for visual distinction in UI)
       • Files count: number of documents analyzed
       • OCR metadata: combined statistics
       • Analysis result: full LLM output

6. DATABASE STORAGE
   └─> New table: batch_cases
       Fields:
       - id (TEXT PRIMARY KEY)
       - user_id (TEXT)
       - case_name (TEXT)
       - case_number (TEXT, optional)
       - description (TEXT)
       - file_count (INTEGER)
       - file_names (TEXT, JSON array)
       - document_type (TEXT, default 'legal')
       - icon (TEXT, default 'briefcase')
       - ocr_metadata (TEXT, JSON)
       - analysis_result (TEXT, JSON)
       - created_at, updated_at, is_deleted
```

## API Endpoints

### 1. Process Batch Documents with OCR & Analysis
```
POST /api/documents/batch-ocr-analysis
Content-Type: multipart/form-data

Parameters:
- documents: File[] (multiple files)
- userId: string (optional, defaults to '1')
- caseName: string (optional)
- caseNumber: string (optional)
- description: string (optional)
- documentType: string (optional, default 'legal')

Response:
{
  success: true,
  caseId: "case_1234567890_abc123",
  caseName: "Case: doc1.pdf, doc2.jpg, doc3.png",
  totalFiles: 3,
  ocrResult: {
    totalPages: 5,
    confidence: 0.92,
    textLength: 25000
  },
  analysis: {
    summary: "...",
    risks: [...],
    recommendations: [...],
    legalErrors: [...]
  },
  metadata: {
    processedAt: "2025-10-21T13:28:50.000Z",
    processingTime: "45000ms",
    icon: "briefcase"
  }
}
```

### 2. Get Batch Case Details
```
GET /api/documents/batch-cases/:caseId

Response:
{
  success: true,
  data: {
    caseId: "case_...",
    caseName: "Case: ...",
    caseNumber: "...",
    description: "...",
    fileCount: 3,
    fileNames: ["doc1.pdf", "doc2.jpg"],
    documentType: "legal",
    icon: "briefcase",
    ocrMetadata: {...},
    analysis: {...},
    createdAt: "2025-10-21T13:28:50.000Z"
  }
}
```

### 3. List User's Batch Cases
```
GET /api/documents/batch-cases?userId=1&limit=50&offset=0

Response:
{
  success: true,
  data: [
    { caseId: "case_...", caseName: "Case 1", ... },
    { caseId: "case_...", caseName: "Case 2", ... },
    ...
  ],
  count: 5
}
```

## Backend Implementation

### Service: `batchDocumentAnalysisService.js`
Main orchestration service handling the entire flow:

```javascript
processBatchDocuments(files, userId, options)
  ├─> Extract file paths from multer objects
  ├─> performBatchOCR() - parallel OCR for all files
  ├─> Combine all OCR text
  ├─> performBatchDocumentAnalysis() - LLM analysis
  ├─> saveBatchAnalysisAsCase() - store in database
  └─> Return complete result with metadata

saveBatchAnalysisAsCase(userId, files, ocrResults, llmAnalysis, caseInfo)
  └─> documentStorageService.saveBatchCase()
```

### Service: `enhancedOCRService.js` (existing)
Enhanced with batch support:

```javascript
performBatchOCR(images, documentType)
  ├─> Process images in batches of 3 (concurrent limit)
  ├─> Each batch: await Promise.all(batch.map(performOCR))
  ├─> Combine results with page markers
  ├─> Calculate average confidence
  └─> Return combined text + metadata
```

### Service: `advancedDocumentAnalysisService.js` (enhanced)
Existing `performBatchDocumentAnalysis()` used:

```javascript
performBatchDocumentAnalysis(documents)
  ├─> Combine all document texts
  ├─> Send unified prompt to LLM
  ├─> Parse JSON response
  ├─> Build comprehensive analysis
  └─> Return structured result
```

### Database: `database.js` (new table)
```sql
CREATE TABLE IF NOT EXISTS batch_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  case_name TEXT NOT NULL,
  case_number TEXT,
  description TEXT,
  file_count INTEGER NOT NULL,
  file_names TEXT NOT NULL, -- JSON array
  document_type TEXT DEFAULT 'legal',
  icon TEXT DEFAULT 'briefcase',
  ocr_metadata TEXT, -- JSON
  analysis_result TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT 0
)

-- Indexes
CREATE INDEX idx_batch_cases_user_id ON batch_cases(user_id)
CREATE INDEX idx_batch_cases_created_at ON batch_cases(created_at)
```

### Storage Service: `documentStorageService.js` (enhanced)
New methods:
```javascript
saveBatchCase(userId, caseData)
getBatchCase(caseId)
listBatchCases(userId, options)
getBatchCaseCount(userId)
```

## Controller: `documentController.js` (new methods)

```javascript
handleBatchOCRAnalysis(req, res)
  └─> Validates files
  └─> Calls batchDocumentAnalysisService.processBatchDocuments()
  └─> Returns complete analysis with case icon

getBatchCase(req, res)
  └─> Retrieves case by ID

listBatchCases(req, res)
  └─> Lists user's batch cases
```

## Routes: `documentRoutes.js` (new endpoints)

```javascript
POST /api/documents/batch-ocr-analysis
  └─> upload.array('documents')
  └─> handleBatchOCRAnalysis

GET /api/documents/batch-cases/:caseId
  └─> getBatchCase

GET /api/documents/batch-cases
  └─> listBatchCases
```

## Performance Characteristics

### Processing Times (estimated)
- **OCR Phase**: ~10-15 seconds per document (parallel)
- **LLM Analysis**: ~5-8 seconds for combined text
- **Database Storage**: ~1-2 seconds
- **Total for 3 documents**: ~20-30 seconds

### Resource Usage
- **Memory**: ~50-100MB (for combined text + API calls)
- **API Calls**:
  - OpenAI Vision: N calls (one per file in batch of 3)
  - WindexAI: 1 call (unified analysis)
- **Database**: ~5-10KB per case (analysis + metadata)

### Scalability
- **Batch size**: 3 concurrent OCR requests (configurable)
- **Rate limiting**: 100ms delay between batches
- **Max files**: Limited by timeout (typically 30-60 seconds per request)
- **Max text size**: 6000 tokens (LLM limit for analysis)

## UI Integration

### Visual Indicators
- **Case Icon**: 🧳 (briefcase) for batch cases
- **Progress Stages**:
  1. 📤 "Загружаю файлы..."
  2. 🔍 "Распознаю текст в документах..."
  3. 🧠 "Анализирую все документы как единое дело..."
  4. ✅ "Анализ завершен! Готово к просмотру."

### Case Display
- Show case name with count of files: "Case: doc1.pdf, doc2.jpg (2 files)"
- Display case number if provided
- Show analysis summary with key risks/recommendations
- List all files included in case
- Show creation date and processing time

## Error Handling

### Common Errors
1. **No files provided**: 400 Bad Request
2. **OCR failed**: Fallback or error return
3. **LLM API error**: 500 Server Error with details
4. **Database error**: 500 Server Error with retry

### Retry Logic
- Transient fetch errors: 3 retries with 1s delay
- OCR failures: Continue with other files
- LLM failures: Return error with partial results

## Future Enhancements

1. **Multi-language support**: Auto-detect language per document
2. **Incremental analysis**: Add documents to existing cases
3. **Case versioning**: Track analysis updates
4. **Custom analysis prompts**: User-defined analysis templates
5. **Real-time streaming**: Stream OCR/LLM results as they complete
6. **Background processing**: Queue large batches for async processing
7. **Case comparison**: Compare multiple cases side-by-side
8. **Export options**: Export case as PDF/DOCX with full analysis
