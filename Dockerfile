FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY server/ ./server/

EXPOSE 5000

WORKDIR /app/server
CMD ["npm", "start"]
