#!/usr/bin/env bash
# Runs detached in the background after the deploy webhook responds.
set -e
sleep 2  # Give HTTP response time to be sent before restart

cd "$(dirname "$0")/.."

git fetch origin main

DEPS_CHANGED=$(git diff HEAD origin/main -- package.json package-lock.json | grep -c . || true)
FRONTEND_CHANGED=$(git diff HEAD origin/main -- src/renderer/ vite.config.ts tailwind.config.* postcss.config.* | grep -c . || true)

git pull origin main

[ "$DEPS_CHANGED" -gt 0 ] && npm install
[ "$FRONTEND_CHANGED" -gt 0 ] && npm run build

pm2 restart agent-orchestrator
pm2 save
