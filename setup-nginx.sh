#!/bin/bash

# Nginx Configuration Script for AI Lawyer Platform
# ==================================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Configuring Nginx for AI Lawyer Platform${NC}"

# Step 1: Create upstream configuration
echo -e "\n${GREEN}[1/3] Creating upstream configuration...${NC}"
sudo tee /etc/nginx/conf.d/lawyer-upstream.conf > /dev/null << 'EOF'
# Load balancer for AI Lawyer backend instances
upstream lawyer_backend {
    least_conn;
    
    server 127.0.0.1:3007 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3008 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3009 max_fails=3 fail_timeout=30s;
    
    keepalive 32;
}
EOF

echo -e "${GREEN}Upstream configuration created${NC}"

# Step 2: Create site configuration for port 1041
echo -e "\n${GREEN}[2/3] Creating site configuration for port 1041...${NC}"
sudo tee /etc/nginx/sites-available/lawyer-1041.conf > /dev/null << 'EOF'
server {
    listen 1041;
    server_name lawyer.windexs.ru;
    
    # Increase timeouts for AI processing
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    # File upload size
    client_max_body_size 50M;
    
    # Logging
    access_log /var/log/nginx/lawyer-access.log;
    error_log /var/log/nginx/lawyer-error.log;
    
    # API requests
    location /api/ {
        proxy_pass http://lawyer_backend/api/;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Keep-alive
        proxy_set_header Connection "";
        
        # Disable buffering for streaming responses
        proxy_buffering off;
    }
    
    # WebSocket endpoint
    location /ws {
        proxy_pass http://lawyer_backend/ws;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts for WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Frontend static files
    location / {
        root /home/sve/ai-lawyer/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

echo -e "${GREEN}Site configuration created${NC}"

# Step 3: Enable site and test configuration
echo -e "\n${GREEN}[3/3] Enabling site and testing...${NC}"

# Create symlink
sudo ln -sf /etc/nginx/sites-available/lawyer-1041.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Nginx configuration is valid${NC}"
    
    # Reload Nginx
    sudo systemctl reload nginx
    echo -e "${GREEN}Nginx reloaded successfully${NC}"
    
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Nginx Configuration Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "\n${YELLOW}Your service is available at:${NC}"
    echo -e "http://lawyer.windexs.ru:1041"
    echo -e "\n${YELLOW}Backend health check:${NC}"
    echo -e "curl http://localhost:1041/health"
    echo -e "\n${YELLOW}To view logs:${NC}"
    echo -e "sudo tail -f /var/log/nginx/lawyer-access.log"
    echo -e "sudo tail -f /var/log/nginx/lawyer-error.log"
else
    echo -e "${RED}Nginx configuration test failed!${NC}"
    echo -e "${YELLOW}Please check the configuration and try again${NC}"
    exit 1
fi

