FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache tini

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
ENV MAX_FILE_SIZE_MB=500

VOLUME ["/data"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "server/index.ts"]
