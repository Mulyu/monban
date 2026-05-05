FROM node:20.11.0-alpine AS builder
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.11.0-alpine
USER node
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
COPY --from=builder /app/dist /app/dist
CMD ["node", "/app/dist/server.js"]
