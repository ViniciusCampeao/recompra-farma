#!/bin/sh
set -e
echo "[entrypoint] aplicando migrations..."
npx prisma migrate deploy
echo "[entrypoint] subindo API..."
exec node dist/main.js
