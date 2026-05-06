# Agent Orchestrator — MVP Scope

## Was die App macht

Eine lokale Web-App zum Erstellen und Betreiben von AI-Agents.
Jeder Agent läuft in seinem eigenen Docker-Container und kommuniziert über eine Inbox/Outbox-Queue.

---

## Features (MVP)

### Agent Management
- Agent erstellen (Name + System-Prompt)
- Agent starten / stoppen
- Agent-Status sehen (stopped / running)

### Messaging
- Nachricht an einen Agent schicken (→ Inbox)
- Antwort des Agents lesen (← Outbox)
- Jeder Agent hat eine eigene Inbox und Outbox

### Live Logs
- Container-Logs eines laufenden Agents in Echtzeit sehen (SSE)

---

## Tech Stack

| Layer | Technologie |
|---|---|
| Frontend + API | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Datenbank | PostgreSQL + Prisma ORM |
| AI Provider | Ollama Cloud (ollama.com) — eigener API Key |
| Container-Mgmt | dockerode (Docker SDK für Node.js) |
| Live Logs | Server-Sent Events (SSE) |
| Lokales Setup | docker-compose (App + Postgres) |

---

## AI / Ollama Cloud

- Provider: [ollama.com](https://ollama.com) — gehostete Modelle
- Kompatibel mit OpenAI-API-Format
- API Key via Env-Var: `OLLAMA_API_KEY`
- Base URL: `https://api.ollama.com`
- Modell konfigurierbar per Env-Var: `OLLAMA_MODEL` (z.B. `llama3.2`)

---

## Datenmodell

```
agents
  id            String  (uuid)
  name          String
  system_prompt String
  status        Enum    (stopped | running)
  container_id  String? (Docker Container ID)
  created_at    DateTime

messages
  id            String  (uuid)
  agent_id      String  (→ agents.id)
  direction     Enum    (inbox | outbox)
  content       String
  processed     Boolean
  created_at    DateTime
```

---

## API Routes

```
GET  /api/agents              → alle Agents listen
POST /api/agents              → Agent erstellen

POST /api/agents/:id/start    → Docker Container starten
POST /api/agents/:id/stop     → Docker Container stoppen

POST /api/agents/:id/inbox    → Nachricht an Agent schicken
GET  /api/agents/:id/inbox    → nächste unverarbeitete Nachricht (worker polling)
POST /api/agents/:id/outbox   → Agent-Antwort schreiben (vom worker)
GET  /api/agents/:id/outbox   → Antworten lesen (UI polling)

GET  /api/agents/:id/logs     → SSE Stream (Container-Logs)
```

---

## Agent Worker (im Docker Container)

Jeder Container läuft ein Node.js-Skript das:
1. Alle X Sekunden `GET /api/agents/:id/inbox` pollt
2. Bei neuer Nachricht: Ollama Cloud API aufrufen (mit System-Prompt)
3. Antwort via `POST /api/agents/:id/outbox` zurückschreiben

Container-Env-Vars:
- `AGENT_ID` — eindeutige ID des Agents
- `API_URL` — URL der Next.js App (z.B. http://host.docker.internal:3000)
- `OLLAMA_API_KEY` — Ollama Cloud API Key
- `OLLAMA_MODEL` — Modell (z.B. llama3.2)

---

## Skalierbarkeit (spätere Schritte)

- PostgreSQL → Neon / Supabase (kein Code-Umbau, nur Connection String)
- Docker lokal → Fly.io Machines / AWS ECS (Agent-Runner abstrahiert)
- SSE → SSE + Redis Pub/Sub (bei mehreren App-Instanzen)
- Ollama Cloud → Anthropic / OpenAI (ein Env-Var tauschen via AI SDK)

---

## Out of Scope (MVP)

- Auth / User-Management
- Agent-zu-Agent-Kommunikation
- Persistenter Container-State über Restarts
- Deployment
