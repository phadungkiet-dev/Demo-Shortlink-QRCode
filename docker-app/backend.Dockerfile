# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /app

# COPY ใช้ path ปกติได้เลย เพราะเราจะ set context เป็น ../backend
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate
COPY . .

# --- Stage 2: Runner ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p storage/logos logs
EXPOSE 3001

CMD npx prisma migrate deploy && npm start