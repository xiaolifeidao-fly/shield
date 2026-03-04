FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install pnpm
RUN npm install -g pnpm@8.5.0

# Copy package files
COPY web-server/package.json web-server/pnpm-lock.yaml ./

# Install runtime dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy shared code and server code
COPY common /app/common
COPY web-server /app/web-server

WORKDIR /app/web-server

# Expose port
EXPOSE 3001

# Run the API server
CMD ["node", "server.js"]
