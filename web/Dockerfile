FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.5.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy code
COPY . .

# Build the application
RUN pnpm build

# Expose port
EXPOSE 8080

# Run the application
CMD ["pnpm", "start", "-p", "8080"]
