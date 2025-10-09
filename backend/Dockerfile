# Dockerfile for backend
FROM node:18-slim AS base
WORKDIR /app
# Install system dependencies for OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-full \
    tesseract-ocr \
    tesseract-ocr-rus \
    poppler-utils \
  && rm -rf /var/lib/apt/lists/*

# Install Python OCR libraries
RUN pip3 install --break-system-packages --no-cache-dir pdf2image pytesseract

# Install Node.js dependencies
COPY package*.json ./
RUN npm install --production
RUN npm install ws --no-save

# Copy application code
COPY . .
EXPOSE 3007
CMD ["npm", "run", "server:prod"]


