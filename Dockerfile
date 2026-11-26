FROM node:20-alpine AS builder

WORKDIR /app

# Copy client source files FIRST, then install dependencies and build
COPY client/ ./client/
RUN cd client && npm install && npm run build

# Install Server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

FROM node:20-alpine

WORKDIR /app

# Copy server and built client
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

WORKDIR /app/server
CMD ["npm", "start"]
