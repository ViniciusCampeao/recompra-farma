# ---------- frontend build ----------
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY apps/frontend/package*.json ./
RUN npm ci
COPY apps/frontend .
RUN npm run build

# ---------- backend build ----------
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY apps/backend/package*.json ./
RUN npm ci
COPY apps/backend/prisma ./prisma
COPY apps/backend .
RUN npx prisma generate
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/seed --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --resolveJsonModule

# ---------- runtime ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY apps/backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY apps/backend/docker-entrypoint.sh ./
COPY --from=frontend /frontend/dist ./public
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
