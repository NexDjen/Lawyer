# Batch Document Analysis - Quick Start Guide

## 🎯 What Is It?

Batch document analysis allows you to upload multiple documents (photos, PDFs, etc.) and process them all together as a single legal case. Instead of analyzing each document individually, the system:

1. **Processes all files with OCR in parallel** - extracts text from all documents at once
2. **Combines all text together** - creates a unified document representation
3. **Analyzes as one case** - sends combined text to AI for comprehensive legal analysis
4. **Saves with case icon** - stores results with a briefcase icon (🧳) for easy identification

## 📋 Key Features

✅ **Parallel Processing**: All files OCR'd simultaneously (3 at a time to avoid rate limits)
✅ **Cross-Document Analysis**: AI understands relationships between documents
✅ **Unified Case Management**: All documents stored under one case ID
✅ **Rich Metadata**: Tracks file names, counts, confidence scores
✅ **Progress Indicators**: See real-time processing status
✅ **Special Case Icon**: Briefcase (🧳) marks batch analyses for easy recognition

## 🚀 How to Use

### Via API

#### Step 1: Prepare Files
Gather multiple documents (JPG, PNG, PDF, DOCX, TXT):
```
- contract.pdf (10 pages)
- notes.jpg (handwritten notes)
- timeline.txt (dates and events)
```

#### Step 2: Upload & Process
```bash
curl -X POST http://localhost:3007/api/documents/batch-ocr-analysis \
  -H "Content-Type: multipart/form-data" \
  -F "documents=@contract.pdf" \
  -F "documents=@notes.jpg" \
  -F "documents=@timeline.txt" \
  -F "userId=1" \
  -F "caseName=Property Dispute Case" \
  -F "caseNumber=2025-001" \
  -F "description=Contract review and timeline analysis"
```

#### Step 3: Get Response
```json
{
  "success": true,
  "caseId": "case_1729518530123_abc123",
  "caseName": "Property Dispute Case",
  "totalFiles": 3,
  "ocrResult": {
    "totalPages": 15,
    "confidence": 0.94,
    "textLength": 45000
  },
  "analysis": {
    "summary": "Three-party property dispute with contract violations detected...",
    "risks": [
      {
        "category": "Contract Violation",
        "severity": "high",
        "description": "Party A violated clause 3.2.1..."
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "action": "File dispute notice within 30 days",
        "timeframe": "2025-11-20"
      }
    ]
  },
  "metadata": {
    "processedAt": "2025-10-21T13:28:50.000Z",
    "processingTime": "45000ms",
    "icon": "briefcase"
  }
}
```

#### Step 4: Retrieve Case Later
```bash
# Get specific case
curl http://localhost:3007/api/documents/batch-cases/case_1729518530123_abc123

# List all user's cases
curl http://localhost:3007/api/documents/batch-cases?userId=1&limit=50
```

## 📊 Processing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   Multiple Documents Upload                      │
│        (contract.pdf, notes.jpg, timeline.txt, etc.)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              PARALLEL OCR PROCESSING                             │
│  File 1: Extract text     File 2: Extract text    File 3: ...   │
│  Confidence: 0.95         Confidence: 0.88       Confidence: ... │
│  Pages: 10                Pages: 2               Pages: 3        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           COMBINE ALL TEXT INTO UNIFIED DOCUMENT                 │
│    === FILE 1: contract.pdf ===                                  │
│    [All text from file 1...]                                     │
│                                                                   │
│    === FILE 2: notes.jpg ===                                     │
│    [All text from file 2...]                                     │
│                                                                   │
│    === FILE 3: timeline.txt ===                                  │
│    [All text from file 3...]                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              UNIFIED LLM ANALYSIS                                │
│  "Analyze these three documents as one legal case"              │
│  Model: GPT-4o                                                   │
│  Response format: JSON with risks, recommendations, summary      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              SAVE AS BATCH CASE (🧳)                            │
│  Case ID: case_1729518530123_abc123                             │
│  Case Name: "Property Dispute Case"                             │
│  Files: 3 (contract.pdf, notes.jpg, timeline.txt)               │
│  Icon: briefcase                                                 │
│  Analysis: [Complete LLM analysis]                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ✅ CASE CREATED & STORED
```

## 🔧 Technical Details

### Processing Times
- **Small documents (1-5 pages)**: 15-20 seconds
- **Medium documents (5-20 pages)**: 25-35 seconds  
- **Large documents (20+ pages)**: 35-50 seconds

### File Size Limits
- **Individual file**: Up to 50GB (practical limit ~500MB)
- **Total batch**: Limited by request timeout (30-60 seconds)
- **Text size**: Up to 6000 tokens for LLM analysis

### API Rate Limits
- **OCR calls**: Batched in groups of 3 (configurable)
- **LLM calls**: 1 unified call per batch
- **Database**: Unlimited (local SQLite)

## 🎨 UI Integration (Frontend)

### Display Batch Cases in DocumentList

```jsx
<DocumentCard
  icon="briefcase"  // 🧳 briefcase icon
  title="Property Dispute Case"
  subtitle="3 files analyzed together"
  caseNumber="2025-001"
  fileCount={3}
  fileNames={["contract.pdf", "notes.jpg", "timeline.txt"]}
  analysis={analysisData}
  createdAt="2025-10-21"
  processingTime="45s"
/>
```

### Progress Stages During Upload

```
1. 📤 "Загружаю файлы..."
   └─ Showing file upload progress (20%)

2. 🔍 "Распознаю текст в документах..."
   └─ OCR processing all files in parallel (50%)

3. 🧠 "Анализирую все документы как единое дело..."
   └─ LLM analysis in progress (85%)

4. ✅ "Анализ завершен! Готово к просмотру."
   └─ Complete and ready (100%)
```

## 📁 File Structure

### Backend Files Created/Modified

```
backend/
├── services/
│   └── batchDocumentAnalysisService.js    [NEW]
│       └─ Main orchestration service
│
├── controllers/
│   └── documentController.js              [MODIFIED]
│       ├─ handleBatchOCRAnalysis()
│       ├─ getBatchCase()
│       └─ listBatchCases()
│
├── routes/
│   └── documentRoutes.js                  [MODIFIED]
│       ├─ POST /batch-ocr-analysis
│       ├─ GET /batch-cases/:caseId
│       └─ GET /batch-cases
│
├── services/
│   └── documentStorageService.js          [MODIFIED]
│       ├─ saveBatchCase()
│       ├─ getBatchCase()
│       ├─ listBatchCases()
│       └─ getBatchCaseCount()
│
└── database/
    └── database.js                        [MODIFIED]
        └─ NEW TABLE: batch_cases
```

### Database Schema

```sql
CREATE TABLE batch_cases (
  id TEXT PRIMARY KEY,              -- Unique case ID
  user_id TEXT NOT NULL,            -- Owner
  case_name TEXT NOT NULL,          -- Display name
  case_number TEXT,                 -- Optional case number
  description TEXT,                 -- Optional description
  file_count INTEGER NOT NULL,      -- Number of files
  file_names TEXT NOT NULL,         -- JSON array of file names
  document_type TEXT DEFAULT 'legal',
  icon TEXT DEFAULT 'briefcase',    -- Visual marker
  ocr_metadata TEXT,                -- JSON: OCR stats
  analysis_result TEXT,             -- JSON: Full analysis
  created_at DATETIME,
  updated_at DATETIME,
  is_deleted BOOLEAN DEFAULT 0
)
```

## 🔐 Security Considerations

✅ **User isolation**: Only users can see their own cases
✅ **Input validation**: File types and sizes verified
✅ **API authentication**: Optional (can be added)
✅ **Data encryption**: Consider for production
✅ **Audit logging**: All operations logged

## 🐛 Troubleshooting

### Error: "No files provided"
- Ensure you're uploading files with field name `documents`
- Check that files are valid (not corrupted)

### Error: "OCR processing failed"
- File might be too large or corrupted
- Try uploading in smaller batches
- Check OpenAI API key configuration

### Error: "LLM analysis failed"
- Combined text might be too long (>6000 tokens)
- Try with fewer files
- Check WindexAI API key configuration

### Processing takes too long
- Large PDFs (20+ pages) take longer
- Consider splitting into smaller batches
- Check network connectivity

## 📞 Support

For issues or questions:
1. Check server logs: `tail -f backend/logs/app.log`
2. Enable debug mode: `DEBUG=*:* npm run server:dev`
3. Review BATCH_ANALYSIS_FLOW.md for technical details

## 🚀 Next Steps

1. **Test with sample files**: Upload 2-3 documents via API
2. **Verify database**: Check `batch_cases` table in `lawyer.db`
3. **Retrieve results**: Query cases via GET endpoint
4. **Integrate UI**: Add case display components to frontend
5. **Monitor performance**: Track processing times and API usage
