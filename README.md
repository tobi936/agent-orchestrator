# agent-orchestrator

A local desktop app for orchestrating **Claude Code agents running in Docker containers**, with a console-style UI. Each agent has its own container, an inbox/outbox folder pair, and can delegate work to other agents through the orchestrator's message router.

> Uses your existing **Claude Pro / Max subscription** via the host's `~/.claude` credentials — no API key required.

```
┌──────────────────────────────────────────────────────────────────┐
│ ▌ agent orchestrator       2 agents                              │
├──────────┬───────────────────────────────────────────────────────┤
│ AGENTS   │  researcher · sonnet · running          [▶][■][×]    │
│ + new    │  ────────────────────────────────────────────────────│
│ ●researcher │ [10:23:01] starting watcher (id=…)                │
│ ○coder      │ [10:23:02] claude version 2.x.x                   │
│             │ [10:24:11] processing 2026-05-…-msg.json          │
│             │ [10:24:30] delegated to coder                     │
│             │ [10:24:31] done                                   │
│             │                                                   │
│             │ > write me a draft on …    [send →]               │
└──────────┴───────────────────────────────────────────────────────┘
docker ✓   agent image ✓                          agent-orchestrator
```

## What it does

- **Add / delete agents** (name, model, system prompt) from the UI
- **Start / stop** each agent in its own Docker container
- **Inbox / outbox** per agent, mounted as `/data/inbox` and `/data/outbox` inside the container
- **Delegation:** an agent can hand off to another by ending its reply with
  ```
  DELEGATE-TO: <agent-name>
  SUBJECT: <optional>
  BODY:
  …actual prompt for the next agent…
  ```
  The orchestrator picks this up from the outbox and drops a JSON message into the target's inbox. Replies route back via `inReplyTo`.

## Tech stack

- **Electron + TypeScript** — desktop shell
- **React 19 + Vite + Tailwind** — UI
- **xterm.js** — console log rendering
- **dockerode** — Docker daemon client (with built-in stream demux)
- **chokidar** — outbox file watcher
- **lowdb** — local JSON-file state in `userData/agent-orchestrator/`
- **Custom Docker image** based on `node:22-bookworm-slim` with `@anthropic-ai/claude-code` installed; uses tini as PID 1 and a small `watcher.mjs` that polls `/data/inbox` for new messages and runs `claude -p`

## Prerequisites

1. **Node.js 22+** and **npm**
2. **Docker** running locally (`docker info` should succeed)
3. **Claude Code authenticated on the host:**
   ```bash
   npx @anthropic-ai/claude-code   # opens OAuth login for Pro/Max subscription
   ```
   This creates `~/.claude/` and `~/.claude.json` which the agent containers will mount read-only.

## Setup

```bash
git clone https://github.com/tobi936/agent-orchestrator
cd agent-orchestrator
npm install
npm run build:agent-image          # builds agent-orchestrator/claude-agent:latest
npm run dev                        # launches the Electron app
```

## How it works under the hood

```
┌─────────────────────────────┐
│  Electron Main Process      │
│                             │
│  ┌─────────────────┐        │
│  │ AgentStore      │ lowdb  │
│  │  (db.json)      │        │
│  └─────────────────┘        │
│  ┌─────────────────┐        │
│  │ DockerManager   │ dockerode
│  │  ↳ start/stop   │        │
│  │  ↳ stream logs  │────────┼──→ IPC: agent:log
│  └─────────────────┘        │
│  ┌─────────────────┐        │
│  │ MessageRouter   │ chokidar
│  │  watches each   │        │
│  │  agent outbox/  │        │
│  └─────────────────┘        │
└──────────┬──────────────────┘
           │ Bind mounts
┌──────────┴──────────────────┐
│ Agent container             │
│   /data/inbox    ←─ msgs    │
│   /data/outbox   ─→ replies │
│   /data/workspace           │
│   /home/agent/.claude (RO)  │  ← host OAuth credentials
│                             │
│   watcher.mjs polls inbox,  │
│   runs `claude -p`, writes  │
│   replies to outbox         │
└─────────────────────────────┘
```

State and message folders live in your OS userData directory:

- macOS: `~/Library/Application Support/agent-orchestrator/`
- Linux: `~/.config/agent-orchestrator/`
- Windows: `%APPDATA%\agent-orchestrator\`

with the layout:
```
agent-orchestrator/
  db.json
  agents/
    <agent-id>/
      inbox/      <- new messages dropped here
      outbox/     <- agent writes replies here
      workspace/  <- the agent's working directory
```

## Sending a message

In the UI, select an agent → type your message in the bottom box → `Ctrl+Enter`.

Behind the scenes that writes a JSON file into `agents/<id>/inbox/`. The container's `watcher.mjs` picks it up, runs `claude -p`, and writes the reply to `outbox/`. The router sees the reply and stores it back in the database, where the UI shows it under the source agent's outbox / target agent's inbox.

## Roadmap

- [ ] HTTP/WebSocket bridge so the same UI can be served as a PWA (control agents from a phone while they run on the laptop — see PR description)
- [ ] Streaming output via `claude -p --output-format stream-json` so partial assistant tokens render live
- [ ] MCP server config per agent (so each container can have its own tools)
- [ ] Per-agent resource limits (CPU / memory)
- [ ] Better delegation surface in the UI (a "delegate to…" button without manual `DELEGATE-TO:` markup)

## License

MIT
