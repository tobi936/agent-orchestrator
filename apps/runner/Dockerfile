 FROM node:22-slim AS deps
 RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
 WORKDIR /app
 COPY prisma ./prisma
 COPY apps/runner/package*.json ./apps/runner/
 RUN cd apps/runner && npm install --ignore-scripts && ./node_modules/.bin/prisma generate 
--schema=../../prisma/schema.prisma
 
 FROM node:22-slim AS builder
 WORKDIR /app
 COPY --from=deps /app/apps/runner/node_modules ./apps/runner/node_modules
 COPY apps/runner ./apps/runner
 COPY prisma ./prisma
 RUN cd apps/runner && npm run build
 
 FROM node:22-slim AS runner
 WORKDIR /app
 ENV NODE_ENV=production
 RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
 COPY --from=builder /app/apps/runner/dist ./dist
 COPY --from=builder /app/apps/runner/node_modules ./node_modules
 EXPOSE 8080
 CMD ["node", "dist/index.js"]
