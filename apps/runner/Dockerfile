FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY ../../prisma ./prisma
RUN npm ci && npx prisma generate --schema=./prisma/schema.prisma

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
