# Dockerfile for Cosy Pocket Builder with Self-Repair Loop
# Uses official Playwright base image for Chromium support
# Designed for VPS deployment (Hetzner CPX21/CPX31)

# Use official Playwright base image with Node 22
# Version must match package.json's playwright dependency
FROM mcr.microsoft.com/playwright:v1.62.0-jammy

# Set working directory
WORKDIR /app

# The Playwright base image already provides the non-root pwuser (UID 1000).
# Reusing it avoids a duplicate UID error during the image build.
RUN mkdir -p /home/pwuser /app && \
    chown pwuser:pwuser /home/pwuser /app

# Copy package files
USER root
COPY package.json package-lock.json* ./

# Install dependencies (as non-root). Vite is a dev dependency and is the
# project's available server entrypoint, so production-only install is not
# sufficient for this container.
USER pwuser
RUN npm ci && \
    npm cache clean --force

# Copy application files
USER root
COPY . .

# Run the application without root privileges.
USER pwuser

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check - uses /api/validationHealth endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:8080/api/validationHealth || exit 1

# Build the application. Database migrations run at container startup, when runtime env vars are available.
RUN npm run build:prod

# Start command - migrate the runtime database, then serve the built application
CMD ["npm", "run", "start:prod"]
