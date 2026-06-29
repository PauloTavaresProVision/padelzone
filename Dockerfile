# syntax=docker/dockerfile:1
# Imagem de produção do PadelZone (Next.js 16 + Prisma 6 + Postgres).

FROM node:22-slim AS base
WORKDIR /app
# openssl é preciso para o Prisma; ca-certificates para TLS (SMTP/WeSender).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# --- Dependências ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Build (gera o cliente Prisma + compila o Next) ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# --- Imagem final ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
# Aplica migrações pendentes e arranca o servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start -- -p 3000 -H 0.0.0.0"]
