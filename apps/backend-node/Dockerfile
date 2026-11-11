
# Stage 1: Install dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev


# Stage 2: Production image
FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Create and use a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY src/ ./src/

# Copy package metadata
COPY package*.json ./

# Set permissions
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

CMD ["node", "src/server.js"]
