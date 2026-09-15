#!/usr/bin/env bash
# Deploy manual di VPS: build image lokal (bypass GHCR) & jalankan ulang container.
#
# Dipakai sementara selama pull dari ghcr.io/famrullah37/antareja masih "denied"
# (butuh docker login dengan PAT baru, atau package-nya dibikin Public).
# Begitu itu beres, kembali pakai alur otomatis GitHub Actions (push ke master).
#
# Jalankan di VPS, di direktori /docker/antareja (yang berisi docker-compose.yml + .env):
#   ./deploy.sh

set -euo pipefail

IMAGE_TAG="ghcr.io/famrullah37/antareja:latest"

echo "==> Menarik perubahan terbaru dari git..."
git pull

echo "==> Build image Docker lokal ($IMAGE_TAG)..."
docker build -t "$IMAGE_TAG" .

echo "==> Restart container dengan image baru..."
# Sengaja TIDAK menjalankan "docker compose pull" — image di atas sudah ada
# lokal dengan tag yang sama, jadi compose akan memakainya tanpa perlu
# menghubungi registry (yang saat ini masih "denied").
docker compose up -d

echo "==> Membersihkan image lama..."
docker image prune -f

echo "==> Selesai. Cek status container:"
docker compose ps
