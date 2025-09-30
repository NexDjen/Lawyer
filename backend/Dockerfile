# Dockerfile for backend
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3007
CMD ["npm", "run", "server:prod"]


