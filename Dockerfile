FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -S malliq && adduser -S malliq -G malliq

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --chown=malliq:malliq package.json package-lock.json ./
COPY --chown=malliq:malliq server ./server
COPY --from=builder --chown=malliq:malliq /app/dist ./dist

RUN mkdir -p /app/server/data && chown -R malliq:malliq /app/server/data

USER malliq
EXPOSE 4000

CMD ["node", "server/index.js"]
