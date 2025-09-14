FROM node:18-alpine

WORKDIR /app

# Cache-busting arg to force rebuilds on Railway
ARG APP_BUILD_ID
ENV APP_BUILD_ID=

# Server dependencies
COPY package.json package-lock.json ./
RUN npm install

# Server source
COPY tsconfig.server.json ./
COPY src/ ./src/
COPY server.js ./

# Copy entire client before installing/building client
COPY client/ ./client/

# Client dependencies
WORKDIR /app/client
RUN npm install

# Build full app (server + client)
WORKDIR /app
RUN npm run build

# Expose port used by the server
EXPOSE 8080

# Start server
CMD ["node", "dist/server/index.js"]