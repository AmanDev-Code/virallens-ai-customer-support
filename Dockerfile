FROM node:20-alpine AS builder

WORKDIR /app

# Build Client (install all dependencies including devDependencies for Vite/Tailwind build)
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Install Server dependencies (production only)
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
