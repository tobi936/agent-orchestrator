FROM node:22-bookworm-slim

# Tools the agent might want: git, ripgrep, jq, curl, ca-certs
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git ca-certificates curl jq ripgrep tini \
 && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally (uses host-mounted ~/.claude for OAuth)
RUN npm install -g @anthropic-ai/claude-code@latest \
 && npm cache clean --force

# Non-root user so files in mounted volumes stay writable on Linux hosts
ARG AGENT_UID=1000
ARG AGENT_GID=1000
RUN (getent group ${AGENT_GID} || groupadd -g ${AGENT_GID} agent) \
 && (id -u agent >/dev/null 2>&1 || useradd -m -u ${AGENT_UID} -g ${AGENT_GID} -s /bin/bash agent)

# Watcher script
COPY watcher.mjs /opt/agent/watcher.mjs
RUN chown -R agent:agent /opt/agent && chmod +x /opt/agent/watcher.mjs

USER agent
WORKDIR /data/workspace

ENV NODE_ENV=production
ENV CLAUDE_CONFIG_DIR=/home/agent/.claude

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "/opt/agent/watcher.mjs"]
