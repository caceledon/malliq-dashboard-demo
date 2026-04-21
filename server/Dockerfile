FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup -S malliq && adduser -S malliq -G malliq

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=malliq:malliq package.json package-lock.json ./
COPY --chown=malliq:malliq server ./server

USER malliq
EXPOSE 3001

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3001/health || exit 1

CMD ["node", "server/index.js"]
