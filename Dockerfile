FROM node:22-alpine AS client-build
WORKDIR /app/valley/client
COPY valley/client/package*.json ./
RUN npm ci
COPY valley/client/ ./
RUN npm run build

FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ build-base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
WORKDIR /app/valley/server
COPY valley/server/package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY --from=deps /app/valley/server/node_modules ./valley/server/node_modules
COPY valley/server ./valley/server
COPY --from=client-build /app/valley/client/dist ./valley/client/dist
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV PORT=3001
ENV VALLEY_DB_PATH=/app/data/valley.db
VOLUME ["/app/data"]
EXPOSE 3001
CMD ["node", "valley/server/index.js"]
