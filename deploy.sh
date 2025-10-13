#!/bin/bash

# Deployment script for AI Lawyer Platform
# ==========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="sve"
SERVER_HOST="37.37.146.116"  # PLEASE VERIFY THIS IP!
SERVER_PORT="1040"
DEPLOY_DIR="/home/sve/ai-lawyer"
SERVICE_PORT="1041"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AI Lawyer Platform Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if IP address is correct
echo -e "\n${YELLOW}WARNING: Please verify server IP address: ${SERVER_HOST}${NC}"
echo -e "${YELLOW}If incorrect, edit this script and change SERVER_HOST variable${NC}"
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# Step 1: Create deployment archive
echo -e "\n${GREEN}[1/6] Creating deployment archive...${NC}"
tar --exclude='node_modules' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='temp' \
    --exclude='uploads' \
    --exclude='venv' \
    --exclude='.env*' \
    --exclude='*.tar.gz' \
    -czf deploy.tar.gz \
    backend/ \
    src/ \
    public/ \
    docker-compose.yml \
    Dockerfile.frontend \
    package.json \
    package-lock.json \
    env.example

echo -e "${GREEN}Archive created: deploy.tar.gz${NC}"

# Step 2: Upload archive to server
echo -e "\n${GREEN}[2/6] Uploading to server...${NC}"
scp -P ${SERVER_PORT} deploy.tar.gz ${SERVER_USER}@${SERVER_HOST}:~/

# Step 3: Extract and setup on server
echo -e "\n${GREEN}[3/6] Extracting and setting up on server...${NC}"
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    # Create directory
    mkdir -p ~/ai-lawyer
    cd ~/ai-lawyer
    
    # Extract archive
    tar -xzf ~/deploy.tar.gz -C ~/ai-lawyer
    
    # Clean up
    rm ~/deploy.tar.gz
    
    echo "Files extracted successfully"
ENDSSH

# Step 4: Create .env file on server
echo -e "\n${GREEN}[4/6] Creating .env file...${NC}"
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    cd ~/ai-lawyer
    
    # Create .env file
    cat > .env << 'EOF'
# Production Environment Variables
PORT=3007
NODE_ENV=production

# WindexAI API (PLEASE UPDATE WITH REAL KEY)
WINDEXAI_API_KEY=your_windexai_api_key_here
WINDEXAI_MODEL=gpt-4o-mini
WINDEXAI_MAX_TOKENS=2000
WINDEXAI_TEMPERATURE=0.7

# OpenAI API (PLEASE UPDATE WITH REAL KEY)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_VISION_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy

# Security
JWT_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=https://lawyer.windexs.ru,https://lawyer.windexs.ru:1041,http://lawyer.windexs.ru,http://lawyer.windexs.ru:1041

# Admin
ADMIN_EMAIL=admin@lawyer.windexs.ru
ADMIN_PASSWORD=change_this_password_123
EOF
    
    echo ".env file created"
    echo "⚠️  IMPORTANT: Edit .env file and add real API keys!"
ENDSSH

# Step 5: Build and deploy with Docker
echo -e "\n${GREEN}[5/6] Building and deploying with Docker...${NC}"
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    cd ~/ai-lawyer
    
    # Stop existing containers
    docker compose down 2>/dev/null || true
    
    # Build images
    echo "Building Docker images..."
    docker compose build
    
    # Start containers
    echo "Starting containers..."
    docker compose up -d
    
    # Show status
    echo "Container status:"
    docker compose ps
ENDSSH

# Step 6: Verify deployment
echo -e "\n${GREEN}[6/6] Verifying deployment...${NC}"
sleep 5

ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << ENDSSH
    echo "Checking backend instances..."
    curl -s http://localhost:3007/api/chat/status || echo "Backend-1 not ready"
    curl -s http://localhost:3008/api/chat/status || echo "Backend-2 not ready"
    curl -s http://localhost:3009/api/chat/status || echo "Backend-3 not ready"
ENDSSH

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. SSH to server: ssh ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT}"
echo -e "2. Edit .env file: nano ~/ai-lawyer/.env"
echo -e "3. Add real API keys (WINDEXAI_API_KEY, OPENAI_API_KEY)"
echo -e "4. Restart containers: cd ~/ai-lawyer && docker compose restart"
echo -e "\n${YELLOW}Access your application:${NC}"
echo -e "Backend API: http://lawyer.windexs.ru:1041/api"
echo -e "Frontend: http://lawyer.windexs.ru:1041"
echo -e "\n${RED}⚠️  Don't forget to configure Nginx reverse proxy!${NC}"

# Cleanup
rm -f deploy.tar.gz

