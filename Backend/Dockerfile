# ── Stage: production image ──────────────────────────────────────────────────
# Node 22 LTS on Alpine (current Active LTS; no engines field in package.json)
FROM node:22-alpine

# Create app directory and set ownership to non-root node user
WORKDIR /app

# Copy manifests first so npm ci can be cached as a separate layer
COPY package*.json ./

# Install production dependencies only (no devDependencies)
RUN npm ci --omit=dev

# Copy the rest of the source
COPY . .

# Expose the application port
EXPOSE 5000

# Healthcheck using node itself (curl is not installed in Alpine)
# Uses 127.0.0.1 explicitly — localhost may resolve to IPv6 ::1 on some systems
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const port = process.env.PORT || 5000; \
    http.get('http://127.0.0.1:' + port + '/health', res => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }).on('error', () => process.exit(1)); \
  "

# Run as non-root node user (built into the official node image)
USER node

CMD ["node", "server.js"]
