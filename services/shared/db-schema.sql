-- Agent Orchestrator – PostgreSQL Schema
-- Run once to initialize the cloud database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  claude_credentials TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model         TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  -- provider: which backend runs this agent
  provider      TEXT NOT NULL DEFAULT 'claude',   -- 'claude' | 'ollama' | 'openai'
  provider_url  TEXT,                             -- for ollama: http://localhost:11434
  container_id  TEXT,
  status        TEXT NOT NULL DEFAULT 'created',
  last_error    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_agent  TEXT NOT NULL,
  to_agent    TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id        BIGSERIAL PRIMARY KEY,
  user_id   TEXT NOT NULL,
  agent_id  TEXT NOT NULL,
  stream    TEXT NOT NULL,  -- 'stdout' | 'stderr' | 'system'
  text      TEXT NOT NULL,
  ts        TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_user_id    ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id  ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from     ON agent_messages(from_agent);
CREATE INDEX IF NOT EXISTS idx_messages_to       ON agent_messages(to_agent);
CREATE INDEX IF NOT EXISTS idx_logs_agent        ON agent_logs(user_id, agent_id);
