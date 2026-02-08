# =============================================================================
# Frontend Production Dockerfile (Multi-stage build)
# =============================================================================

# Build stage
FROM node:18-alpine AS builder

# Version build args
ARG APP_VERSION=0.0.0-unknown
ARG BUILD_SHA=unknown
ARG BUILD_DATE=unknown

ENV APP_VERSION=${APP_VERSION}

# Update npm to latest 10.x
RUN npm install -g npm@10

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build (APP_VERSION is injected via vite.config.ts define)
COPY . .
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

LABEL version="${APP_VERSION}" \
      build.sha="${BUILD_SHA}" \
      build.date="${BUILD_DATE}"

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Configure permissions for non-root nginx user (nginx user already exists in nginx:alpine)
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    chown -R nginx:nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port (unprivileged port for non-root)
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
