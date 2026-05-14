FROM node:22-slim

WORKDIR /app

# Install dependencies needed for prisma and general build
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* ./
# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build frontend
RUN pnpm run build

EXPOSE 3006

CMD ["pnpm", "start"]
