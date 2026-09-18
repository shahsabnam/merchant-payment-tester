# ── Build stage ────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies only (layer-cached if package.json unchanged)
COPY package*.json ./
RUN npm install --omit=dev

# ── Runtime stage ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what's needed to run
COPY --from=build /app/node_modules ./node_modules
COPY server.js ./
COPY public/ ./public/

# Ensure the app user owns files
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]

