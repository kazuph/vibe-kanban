# Build stage
FROM node:24-alpine AS builder

# Optional: inject base GitHub repo URL for linkifying #123 (used by Vite at build time)
ARG VITE_REPO_BASE
ENV VITE_REPO_BASE=${VITE_REPO_BASE}

# Install build dependencies
RUN apk add --no-cache \
    curl \
    build-base \
    perl

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Copy package files for dependency caching
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package*.json ./frontend/
COPY npx-cli/package*.json ./npx-cli/

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Build application
RUN npm run generate-types
RUN cd frontend && npm install && npm run build
RUN cargo build --release --bin server

# Runtime stage
FROM alpine:latest AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tini \
    libgcc \
    wget

# Create app user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /app/target/release/server /usr/local/bin/server

# Create repos directory and set permissions
RUN mkdir -p /repos && \
    chown -R appuser:appgroup /repos

# Switch to non-root user
USER appuser

# Set runtime environment
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Set working directory
WORKDIR /repos

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider "http://${HOST:-localhost}:${PORT:-3000}" || exit 1

# Run the application
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["server"]
