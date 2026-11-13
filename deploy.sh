#!/usr/bin/env bash
# Deploy manual di VPS: tarik kode terbaru, build image dari source, jalankan
# ulang container. Migrasi db/sql/*.sql berjalan otomatis saat container start.
#
# Jalankan di VPS, di direktori /docker/antareja (yang berisi docker-compose.yml + .env):
#   ./deploy.sh
#
# Pakai skrip ini, jangan `docker build` polos: skrip ini mengirim kode commit &
# jumlah commit sebagai build-arg, sehingga label versi di sidebar admin ikut
# berubah tiap deploy (mis. "v1.0.227 · 78a2844"). Tanpa itu label tetap
# "v1.0.0 · dev" dan tidak bisa dipakai untuk memastikan versi yang tayang.

set -euo pipefail

IMAGE_TAG="ghcr.io/famrullah37/antareja:latest"

if [ -z "${DEPLOY_SETELAH_PULL:-}" ]; then
  echo "==> Menarik perubahan terbaru dari git..."
  git pull
  # git pull bisa mengubah skrip ini sendiri, padahal bash masih menjalankan
  # versi lama yang sudah dimuat. Jalankan ulang supaya selalu pakai versi terbaru.
  DEPLOY_SETELAH_PULL=1 exec "$0" "$@"
fi

# Clone dangkal (--depth) membuat jumlah commit salah; ambil riwayat lengkap.
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --unshallow
fi

GIT_SHA="$(git rev-parse --short HEAD)"
GIT_COUNT="$(git rev-list --count HEAD)"
echo "==> Build image Docker lokal ($IMAGE_TAG) — commit $GIT_SHA, versi ke-$GIT_COUNT..."
docker build \
  --build-arg GIT_SHA="$GIT_SHA" \
  --build-arg GIT_COUNT="$GIT_COUNT" \
  -t "$IMAGE_TAG" .

echo "==> Restart container dengan image baru..."
# Tidak menjalankan "docker compose pull" — image di atas sudah ada lokal
# dengan tag yang sama, jadi compose memakainya langsung.
docker compose up -d

echo "==> Membersihkan image lama..."
docker image prune -f

echo "==> Selesai. Cek status container:"
docker compose ps
echo "==> Label versi di sidebar admin seharusnya: commit $GIT_SHA"
