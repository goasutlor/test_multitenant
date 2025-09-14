FROM node:18-alpine

WORKDIR /app

# Cache-busting arg to force Railway to rebuild layers when changed
ARG APP_BUILD_ID
ENV APP_BUILD_ID=

# Copy server package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy server source files explicitly
COPY tsconfig.server.json ./
COPY src/ ./src/
COPY server.js ./

# Copy entire client directory (excluding build/node_modules via .dockerignore)
COPY client/ ./client/

# Prepare and install client dependencies
WORKDIR /app/client
RUN npm install

# Debug: ensure CRA public exists
RUN echo '--- ls /app/client ---' && ls -la /app/client && echo '--- ls /app/client/public ---' && ls -la /app/client/public

# Build full app (server build + CRA build)
WORKDIR /app
RUN npm run build

# Expose port
EXPOSE 8080

# Start server (full API server)
CMD ["node", "dist/server/index.js"]