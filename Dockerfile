FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# pdfkit di-bundle webpack, tapi font standarnya (#standard-fonts/Helvetica, dst) dimuat lewat
# createRequire dengan alamat file yang DITANAM saat build: /app/node_modules/pdfkit/js/...
# Folder itu tidak ikut ter-trace ke image production, sehingga tanpa baris ini semua
# pembuatan PDF (kuitansi, berkas registrasi) gagal: "Cannot find module '#standard-fonts/Helvetica'".
# Lokasinya harus sama dengan WORKDIR builder (/app).
COPY --from=builder /app/node_modules/pdfkit ./node_modules/pdfkit
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/db ./db

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Terapkan migrasi SQL yang tertunda (db/sql) dulu; kalau gagal, server tetap start
# dan errornya terlihat di `docker logs`.
CMD ["sh", "-c", "node scripts/migrate-sql.mjs; exec node server.js"]
