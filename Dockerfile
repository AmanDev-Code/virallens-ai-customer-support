FROM node:20-alpine AS builder

WORKDIR /app

# Copy client source files
COPY client/ ./client/

# Build Client
WORKDIR /app/client
RUN npm install
RUN npm run build

# Build Server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production

FROM node:20-alpine

WORKDIR /app

# Copy server and built client from builder
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

WORKDIR /app/server
CMD ["npm", "start"]
