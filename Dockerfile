# CareBora — production image for self-hosting (Next.js 16 monorepo).
FROM node:20-bookworm-slim

WORKDIR /app

# openssl + ca-certificates are needed by the Prisma query engine.
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the whole monorepo (node_modules/.next excluded via .dockerignore).
COPY . .

# Install all workspace deps (skip lifecycle scripts — Prisma is generated below).
RUN npm install --ignore-scripts

# Generate the Prisma client for this image's platform, then build the app.
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN cd apps/web && npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Bind to all interfaces so the reverse proxy can reach it.
CMD ["sh", "-c", "cd apps/web && npx next start -H 0.0.0.0 -p 3000"]
