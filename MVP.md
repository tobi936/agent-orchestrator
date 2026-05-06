# Agent Orchestrator — MVP

## Was die App kann

- Agents erstellen (Name + System-Prompt)
- Agent starten / stoppen
- Live-Logs eines laufenden Agents sehen
- Nachricht an einen Agent schicken, Antwort sehen

## Was die App NICHT kann (noch nicht)

- Kein Login / kein Multi-User
- Keine persistente Datenbank (nur im Speicher / JSON-Datei)
- Keine Docker-Isolation (Agent läuft direkt als Prozess)
- Kein Multi-Provider (nur Claude)
- Kein Deployment (nur lokal)

## Stack

- Backend: Node.js + Express
- Frontend: React + Vite
- Agent: Claude CLI als Child-Process

## Definition of Done

Die App läuft mit `npm run dev` lokal und macht die 4 Punkte oben zuverlässig.
Erst danach: Auth, Deployment, Docker, Multi-User.
