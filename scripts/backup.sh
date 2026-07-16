#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env

STAMP=$(date +%Y%m%d_%H%M%S)
DEST="backups/$STAMP"
mkdir -p "$DEST"

echo ">> Dump recompra_farma..."
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DEST/recompra_farma.sql.gz"

echo ">> Dump evolution..."
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" evolution | gzip > "$DEST/evolution.sql.gz"

echo ">> Backup das instâncias do WhatsApp (volume)..."
docker run --rm \
  -v recompra-farma_evolution_instances:/data:ro \
  -v "$(pwd)/$DEST":/backup \
  alpine tar czf /backup/evolution_instances.tar.gz -C /data .

echo ">> Limpando backups com mais de 14 dias..."
find backups -maxdepth 1 -type d -mtime +14 -exec rm -rf {} + 2>/dev/null || true

echo "Backup salvo em $DEST"
