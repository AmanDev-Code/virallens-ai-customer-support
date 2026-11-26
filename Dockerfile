FROM node:20-alpine AS builder

WORKDIR /app

# Copy entire project
COPY . .

# Build Client
RUN cd client && npm install && npm run build

# Install Server dependencies (production)
RUN cd server && npm install --production

FROM node:20-alpine

WORKDIR /app

# Copy server and built client from builder
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

WORKDIR /app/server
CMD ["npm", "start"]
