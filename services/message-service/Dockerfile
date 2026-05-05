FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS dev
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
COPY src ./src
CMD ["node", "--experimental-strip-types", "src/index.ts"]
