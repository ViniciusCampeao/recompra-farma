#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env

DIR="${1:?Uso: ./scripts/restore.sh backups/AAAAMMDD_HHMMSS}"

echo ">> Restaurando recompra_farma de $DIR..."
gunzip -c "$DIR/recompra_farma.sql.gz" | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo ">> Restaurando evolution de $DIR..."
gunzip -c "$DIR/evolution.sql.gz" | docker compose exec -T postgres psql -U "$POSTGRES_USER" evolution

echo "Restore concluído."
