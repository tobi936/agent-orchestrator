#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_NAME="agent-orchestrator/claude-agent:latest"
CONTEXT_DIR="$ROOT_DIR/docker/agent-image"

echo "Building $IMAGE_NAME from $CONTEXT_DIR"

UID_VAL="$(id -u)"
GID_VAL="$(id -g)"

docker build \
  --build-arg "AGENT_UID=$UID_VAL" \
  --build-arg "AGENT_GID=$GID_VAL" \
  -t "$IMAGE_NAME" \
  "$CONTEXT_DIR"

echo
echo "Done. Image: $IMAGE_NAME"
echo "Make sure you have authenticated Claude Code on the host (~/.claude exists)."
