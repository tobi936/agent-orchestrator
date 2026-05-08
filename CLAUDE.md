# Agent Orchestrator — CLAUDE.md

Dieses Dokument beschreibt Tech Stack, Architektur und Deployment für alle Claude-Instanzen die an diesem Projekt arbeiten.

---

## Projektstruktur

```
agent-orchestrator/          ← npm workspace root
├── apps/
│   ├── web/                 ← Next.js App (Frontend + API) → Vercel
│   └── runner/              ← Express.js Runner (Agent-Execution) → Fly.io
├── prisma/
│   └── schema.prisma        ← Datenbankschema (shared)
├── fly.toml                 ← Fly.io Konfiguration für runner
└── .env.example             ← Alle benötigten Env-Vars
```

---

## Tech Stack

| Layer | Technologie | Details |
|---|---|---|
| Frontend + API | Next.js 15 (App Router) | TypeScript, React 19 |
| Styling | Tailwind CSS v3 | |
| Datenbank | PostgreSQL + Prisma ORM v5 | Neon DB in Production |
| Agent-Execution | E2B Sandboxes | `e2b` SDK v2.x |
| Runner-Service | Express.js | Polling-basiert, SSE für Logs |
| AI Provider | Ollama / Anthropic / OpenAI | per Env-Var konfigurierbar |
| Analytics | Vercel Analytics | `@vercel/analytics` |

---

## Deployment

### apps/web → Vercel

- Next.js wird direkt auf Vercel deployt.
- Root-Verzeichnis im Vercel-Projekt: `apps/web`
- Build Command: `npm run build` (läuft in `apps/web`)
- Vercel führt automatisch `prisma generate` via `postinstall` Script aus.
- **Wichtig:** `DATABASE_URL` muss in Vercel als Environment Variable gesetzt sein (Neon DB Connection String).
- Weitere Env-Vars in Vercel: `RUNNER_URL` (URL des Fly.io Runners)

### apps/runner → Fly.io

- Express.js Server wird als Docker Container auf Fly.io deployt.
- Konfiguration: `fly.toml` im Root
- App-Name: `agent-orchestrator-runner`
- Region: `fra` (Frankfurt)
- Dockerfile: `apps/runner/Dockerfile` (multi-stage build, node:22-alpine)
- Deploy-Command: `fly deploy` (vom Repo-Root ausführen, nicht aus `apps/runner`)
- **Wichtig:** Fly.io Secrets setzen:
  ```
  fly secrets set DATABASE_URL="..."
  fly secrets set ANTHROPIC_API_KEY="..."
  fly secrets set E2B_API_KEY="..."
  ```
- `auto_stop_machines = false` und `min_machines_running = 1` → läuft immer
- VM: 256 MB RAM, 1 shared CPU

### Datenbank → Neon DB

- PostgreSQL-kompatibel, serverless
- Neon gibt **zwei** Connection Strings — beide werden benötigt:
  - `DATABASE_URL` → **gepoolter** URL (Pooler-Endpunkt, z.B. `ep-xxx.pooler.neon.tech`) — für Queries in Vercel Serverless Functions
  - `DIRECT_URL` → **direkter** URL (z.B. `ep-xxx.us-east-2.aws.neon.tech`) — für `prisma migrate` / `db push`
- Beide Vars müssen in Vercel gesetzt sein (`DATABASE_URL` + `DIRECT_URL`)
- Prisma Schema nutzt beide via `url` + `directUrl`
- Schema pushen: `npm run db:push` (verwendet `DIRECT_URL` für die direkte Verbindung)
- Neon bietet Branching — für Preview-Deployments eigenen DB-Branch nutzen

### E2B Sandboxes

- E2B ersetzt Docker für die Agent-Execution (kein lokaler Docker nötig in Production)
- SDK: `e2b` npm-Paket, verwendet in `apps/runner`
- API Key: `E2B_API_KEY` Environment Variable
- Sandboxes laufen in der Cloud, werden vom Runner gestartet/gestoppt
- Agents können GitHub-Repos in den Sandbox klonen und dort Code ausführen
- Sandbox-Logs werden via SSE an das Frontend gestreamt

---

## Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Env-Vars kopieren und ausfüllen
cp .env.example .env

# Datenbank-Schema pushen (lokale Postgres via docker-compose)
npm run db:push

# Web-App starten (Port 3000)
npm run dev:web

# Runner starten (Port 3001)
npm run dev:runner
```

Für lokale Entwicklung kann `docker-compose.yml` für Postgres verwendet werden.

---

## Environment Variables

| Variable | Verwendet in | Beschreibung |
|---|---|---|
| `DATABASE_URL` | web + runner | Gepoolter Connection String (Neon Pooler-URL in Prod) |
| `DIRECT_URL` | web (Migrationen) | Direkter Connection String (Neon Direct-URL für `prisma db push`) |
| `RUNNER_URL` | web | URL des Runner-Services (Fly.io URL in Prod) |
| `PORT` | runner | HTTP Port (default 3001 lokal, 8080 auf Fly.io) |
| `PROVIDER` | runner | AI Provider: `ollama` \| `anthropic` \| `openai` \| `gemini` |
| `OLLAMA_API_KEY` | runner | Ollama Cloud API Key |
| `OLLAMA_MODEL` | runner | z.B. `llama3.2` |
| `ANTHROPIC_API_KEY` | runner | Anthropic API Key |
| `ANTHROPIC_MODEL` | runner | z.B. `claude-haiku-4-5-20251001` |
| `OPENAI_API_KEY` | runner | OpenAI API Key |
| `OPENAI_MODEL` | runner | z.B. `gpt-4o-mini` |
| `GEMINI_API_KEY` | runner | Google Gemini API Key |
| `GEMINI_MODEL` | runner | z.B. `gemini-2.0-flash` |
| `E2B_API_KEY` | runner | E2B API Key für Sandbox-Execution |

---

## Datenbankschema (Prisma)

```prisma
model Agent {
  id           String      @id @default(uuid())
  name         String
  systemPrompt String
  command      String?     // Shell-Befehl der im E2B Sandbox läuft
  repoUrl      String?     // GitHub Repo URL für den Sandbox-Clone
  status       AgentStatus @default(STOPPED)
  containerId  String?     // E2B Sandbox ID
  createdAt    DateTime    @default(now())
  messages     Message[]
}

model Message {
  id        String           @id @default(uuid())
  agentId   String
  agent     Agent            @relation(...)
  direction MessageDirection // INBOX | OUTBOX
  content   String
  processed Boolean          @default(false)
  createdAt DateTime         @default(now())
}
```

---

## API Routes (apps/web)

```
GET  /api/agents              → alle Agents
POST /api/agents              → Agent erstellen

GET  /api/agents/:id          → Agent-Details
POST /api/agents/:id/start    → E2B Sandbox starten
POST /api/agents/:id/stop     → E2B Sandbox stoppen

POST /api/agents/:id/inbox    → Nachricht an Agent
GET  /api/agents/:id/outbox   → Antworten lesen
GET  /api/agents/:id/messages → Message-History
GET  /api/agents/:id/logs     → SSE Stream (Sandbox-Logs)
```

---

## npm Scripts (Root)

```bash
npm run dev:web       # Next.js Dev Server
npm run dev:runner    # Runner Dev Server (tsx watch)
npm run db:push       # Prisma Schema → DB pushen
npm run db:generate   # Prisma Client generieren
```
