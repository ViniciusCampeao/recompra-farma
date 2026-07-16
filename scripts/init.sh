#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Criando .env a partir de .env.example (ajuste as senhas!)"
  cp .env.example .env
fi

echo ">> Subindo containers..."
docker compose up -d --build

echo ">> Aguardando backend..."
sleep 8

echo ">> Rodando seed (admin + templates)..."
docker compose exec backend npm run db:seed:prod || echo "(seed pode ser rodado manualmente depois)"

echo ""
echo "Pronto."
echo "  Frontend:        http://localhost:${FRONTEND_PORT:-8090}"
echo "  API health:      http://localhost:${FRONTEND_PORT:-8090}/api/health"
echo "  Evolution mgr:   http://127.0.0.1:8080/manager"
