FROM node:18-alpine

WORKDIR /app

# Copy server package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy server source files explicitly
COPY tsconfig.server.json ./
COPY src/ ./src/
COPY server.js ./

# Prepare and install client dependencies
COPY client/package.json client/package-lock.json ./client/
WORKDIR /app/client
RUN npm install

# Copy entire client directory (excluding build/node_modules via .dockerignore)
COPY client/ ./

# Build full app (server build + CRA build)
WORKDIR /app
RUN npm run build

# Expose port
EXPOSE 8080

# Start server (full API server)
CMD ["node", "dist/server/index.js"]