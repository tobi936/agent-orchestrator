# Agent Orchestrator — Microservice Architecture

## Overview

```
Browser (React)
      │
      ▼ HTTP / SSE
┌─────────────────────────────────────────────┐
│              API Gateway :3000              │
│  • Auth (JWT + bcrypt, PostgreSQL)          │
│  • SSE broadcast to connected clients       │
│  • Reverse proxy to downstream services     │
│  • Serves built React frontend              │
└────────────────────────────────────────────-┘
           │                    │
    /api/agents          /api/messages
           │                    │
           ▼                    ▼
┌──────────────────┐  ┌──────────────────────┐
│  Agent Manager   │  │   Message Service    │
│      :3001       │  │        :3002         │
│                  │  │                      │
│ • Agent CRUD     │  │ • Send/receive msgs  │
│ • Docker control │  │ • Inbox delivery     │
│ • LLM providers  │  │ • Status updates     │
│ • Logs → DB      │  │                      │
└──────────────────┘  └──────────────────────┘
           │                    │
           └────────┬───────────┘
                    ▼
          ┌─────────────────┐
          │   PostgreSQL    │
          │  (Cloud DB)     │
          │                 │
          │ • users         │
          │ • agents        │
          │ • agent_messages│
          │ • agent_logs    │
          └─────────────────┘

Per-agent Docker containers (spawned by Agent Manager):
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │   Agent A   │  │   Agent B   │  │   Agent C   │
  │  (Claude)   │  │  (Ollama)   │  │  (OAI-compat)│
  └─────────────┘  └─────────────┘  └─────────────┘
```

## LLM Provider Architecture

The system supports **switching providers per agent** without changing orchestration logic:

| Provider         | SDK / Protocol        | Tool Use | Notes                              |
|------------------|-----------------------|----------|------------------------------------|
| `claude`         | Anthropic SDK (native)| Full     | Agentic loop, streaming, tool use  |
| `ollama`         | REST fetch            | Partial  | Depends on model (llama3.1 ✓)     |
| `openai-compatible` | REST fetch (OAI spec) | Partial  | OpenAI, Groq, Together, LM Studio |

**Why not LangChain?**
LangChain adds ~200 abstractions between you and the LLM. The Anthropic SDK already provides:
- Native tool use with typed schemas
- Streaming with `messages.stream()`
- Agentic loops via the `tool_use` stop reason

LangChain is useful when you need pre-built chains for RAG, vector stores, or complex multi-agent graphs. For this orchestrator (simple inbox/outbox messaging), the native SDK is cleaner and faster.

## Event Flow

```
Agent Container → logs to stdout
        ↓
Agent Manager streams Docker logs
        ↓
Inserts row in agent_logs (PostgreSQL)
        ↓
POST /internal/broadcast → API Gateway
        ↓
SSE push → Browser
```

## Local Development

```bash
cp .env.example .env   # fill in JWT_SECRET etc.
docker compose up --build

# Optional: add Ollama
docker compose --profile ollama up
docker compose exec ollama ollama pull llama3.1
```

## Kubernetes Deployment

```bash
# 1. Fill in secrets
cp k8s/secrets.yaml.template k8s/secrets.yaml
# edit k8s/secrets.yaml with real values

# 2. Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/api-gateway/
kubectl apply -f k8s/agent-manager/
kubectl apply -f k8s/message-service/

# 3. Initialize DB schema (run once)
kubectl run db-init --rm -it --image=postgres:16 -- \
  psql $DATABASE_URL -f /schema.sql
```

## Database

Cloud-hosted PostgreSQL recommended:
- **Supabase** — free tier, built-in auth optional
- **Neon** — serverless, branching for preview envs
- **Railway** — simple, $5/month
- **AWS RDS** / **Google Cloud SQL** — production grade

Schema: `services/shared/db-schema.sql`
