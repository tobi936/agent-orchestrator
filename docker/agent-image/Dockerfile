FROM node:22-bookworm-slim

# Tools the agent might want: git, ripgrep, jq, curl, ca-certs
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git ca-certificates curl jq ripgrep tini \
 && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally (uses host-mounted ~/.claude for OAuth)
RUN npm install -g @anthropic-ai/claude-code@latest \
 && npm cache clean --force

# Rename the pre-existing 'node' user/group (UID/GID 1000) to 'agent'
# Avoids useradd UID conflicts on node base images
RUN usermod -l agent -d /home/agent -m node \
 && groupmod -n agent node

# Watcher script
COPY watcher.mjs /opt/agent/watcher.mjs
RUN chown -R agent:agent /opt/agent && chmod +x /opt/agent/watcher.mjs

USER agent
WORKDIR /data/workspace

ENV NODE_ENV=production
ENV CLAUDE_CONFIG_DIR=/home/agent/.claude

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "/opt/agent/watcher.mjs"]
