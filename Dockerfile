FROM node:22-slim

WORKDIR /app

# Install dependencies needed for prisma and general build
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build frontend
RUN npm run build

EXPOSE 3006

CMD ["npm", "start"]
