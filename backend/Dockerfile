# Dockerfile for backend
FROM node:18-slim AS base
WORKDIR /app
# Install system dependencies for OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    tesseract-ocr \
    tesseract-ocr-data-rus \
    poppler-utils \
  && rm -rf /var/lib/apt/lists/*

# Install Python OCR libraries
RUN pip3 install --no-cache-dir pdf2image pytesseract

# Install Node.js dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .
EXPOSE 3007
CMD ["npm", "run", "server:prod"]


