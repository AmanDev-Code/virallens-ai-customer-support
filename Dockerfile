FROM node:20-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server code and pre-built client dist from local machine
COPY server/ ./
COPY client/dist ../client/dist

EXPOSE 5000

CMD ["npm", "start"]
