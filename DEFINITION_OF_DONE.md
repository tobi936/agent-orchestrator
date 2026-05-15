# Definition of Done — Agent Orchestrator

Dieses Dokument beschreibt den **Zielzustand der App**. Jedes Feature gilt als "done" wenn alle relevanten Kriterien erfüllt sind. Neue Features werden hier ergänzt bevor sie implementiert werden.

---

## Vision

Eine Plattform auf der **autonome KI-Agenten wie ein Unternehmen zusammenarbeiten**. Ein CEO-Agent bekommt ein Ziel, bricht es in Aufgaben auf und delegiert diese an spezialisierte Agenten (Product Owner, Marketing, Engineering, etc.) — vollautomatisch, ohne menschliche Eingriffe, außer wenn explizit gewünscht.

---

## Status-Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Fertig und in Production |
| 🔨 | In Arbeit |
| ⬜ | Noch nicht gestartet |

---

## 1. Agent Management

### 1.1 Agent erstellen & konfigurieren ✅
- [x] Name, System-Prompt, AI-Provider (Anthropic / OpenAI / Ollama), Model
- [x] Optionale GitHub-Repo-URL (wird in Sandbox geklont)
- [x] Optionaler Startup-Command (läuft beim Start des Sandboxes)
- [x] `maxToolIterations` konfigurierbar
- [x] `allowedTools` — Whitelist welche Tools der Agent verwenden darf
- [x] Agent bearbeiten & löschen

### 1.2 Agent starten & stoppen ✅
- [x] Manueller Start/Stop über UI
- [x] Auto-Start wenn neuer Task ankommt (konfigurierbar)
- [x] Auto-Stop wenn keine Tasks mehr pending (konfigurierbar)
- [x] Sandbox-ID wird gespeichert (`containerId`)

### 1.3 Agent-Rollen & Hierarchie ⬜
- [ ] Feld `role` am Agent (z.B. `ceo`, `product_owner`, `marketing`, `engineering`)
- [ ] Feld `description` am Agent (kurze Beschreibung was dieser Agent kann, max 300 Zeichen) — wird anderen Agenten vollständig angezeigt (aktuell nur 100 Zeichen)
- [ ] Org-Chart View in der UI (wer delegiert an wen)
- [ ] Agent kennt seine direkten Reports (konfigurierbare `reportIds`)

---

## 2. Task-System

### 2.1 Task erstellen ✅
- [x] User schickt Task via Inbox (UI oder API)
- [x] Task hat Titel, Content, Status (`PENDING` → `IN_PROGRESS` → `DONE`)
- [x] Task-Thread mit Chat-History (Nachrichten mit `role: user | agent`)
- [x] `forHuman: true` — Task wartet auf menschliche Antwort

### 2.2 Agent-zu-Agent Routing ✅
- [x] `route_task()` Tool — Agent delegiert Task an anderen Agenten
- [x] `fromAgentId` wird gespeichert (Herkunft nachvollziehbar)
- [x] Ziel-Agent wird automatisch gestartet wenn Task ankommt
- [x] Task wird innerhalb von 3 Sekunden aufgenommen (Polling-Intervall)

### 2.3 Callback-Routing ✅
- [x] `route_back()` Tool — Agent B antwortet zurück an Agent A (via `fromAgentId`)
- [x] Agent A wird wieder aufgeweckt mit B's Ergebnis als neue Nachricht
- [x] Unterstützt Feedback-Loops: A → B → zurück an A → weiter an C

### 2.4 Task-Priorisierung ⬜
- [ ] Feld `priority` am Task (`low | normal | high | urgent`)
- [ ] Agenten bearbeiten Tasks nach Priorität (nicht nur nach `createdAt`)
- [ ] CEO-Agent kann Priorität beim Delegieren angeben

### 2.5 Task-Timeout & Retry ⬜
- [ ] Feld `deadline` am Task (optional)
- [ ] Wenn Task nicht bis `deadline` fertig → eskaliert automatisch an `fromAgentId` oder Human
- [ ] `retryCount` — wie oft ein fehlgeschlagener Task nochmal versucht wurde (max. 3x)
- [ ] Fehlgeschlagene Tasks erscheinen in Human Inbox mit Kontext

---

## 3. Virtuelle Firma (Multi-Agent Workflows)

### 3.1 Unternehmens-Setup ✅
- [x] Vorgefertigte Agent-Templates auf der "New Agent" Seite:
  - **CEO** 👔 — Ziele empfangen, in Projekte aufbrechen, an Reports delegieren
  - **Product Owner** 📋 — Features definieren, User Stories schreiben, an Engineering delegieren
  - **Engineering Lead** ⚙️ — Tasks in Tickets aufteilen, Code-Reviews koordinieren
  - **Marketing Lead** 📣 — Kampagnen planen, an Content/SEO delegieren
  - **Dev Agent** 💻 — Code schreiben, testen, committen (mit Sandbox)
- [ ] One-Click "Firma aufsetzen" — erstellt alle Standard-Agenten auf einmal

### 3.2 Vollautomatischer Flow ⬜
- [ ] CEO bekommt 1 Aufgabe → gesamter Workflow läuft ohne menschlichen Eingriff durch
- [ ] Agenten wissen welche anderen Agenten es gibt inkl. vollständiger Beschreibung (aktuell nur 100 Zeichen)
- [ ] Jeder Agent hat in seinem System-Prompt: eigene Rolle, direkte Reports, Verantwortungsbereich
- [ ] Agenten können parallel arbeiten (mehrere laufen gleichzeitig)

### 3.3 Workflow-Visualisierung ⬜
- [ ] Task-Flow Graph in der UI: zeigt welcher Agent Task wohin delegiert hat (A → B → C)
- [ ] Timeline-View: wann welcher Agent was gemacht hat
- [ ] Echtzeit-Update: Graph wächst live während Agenten arbeiten

---

## 4. Echtzeit-Logs & Monitoring

### 4.1 Live-Logs ✅
- [x] SSE-Stream pro Agent (`/api/agents/:id/logs`)
- [x] Tool-Aufrufe werden geloggt (Name, Input, OK/Error)
- [x] Collapsed Activity Bar mit Diff-Summary

### 4.2 Agent-Metriken ✅
- [x] Tasks gesamt, erfolgreich, fehlgeschlagen
- [x] Metriken-Endpoint vorhanden (`/api/agents/:id/metrics`)

### 4.3 System-Übersicht ⬜
- [ ] Dashboard zeigt alle laufenden Agenten + aktive Tasks gleichzeitig
- [ ] Globaler Task-Flow: wie viele Tasks sind gerade wo im System
- [ ] Alert wenn ein Agent seit > X Minuten kein Ergebnis geliefert hat

---

## 5. Human-in-the-Loop

### 5.1 Human Inbox ✅
- [x] Tasks mit `forHuman: true` erscheinen in der Human Inbox
- [x] User kann antworten → Task wird fortgesetzt
- [x] `ask_human()` Tool für Agenten

### 5.2 Human Inbox Verbesserungen ⬜
- [ ] Notifications (Browser-Push oder Badge) wenn Human-Antwort benötigt wird
- [ ] Kontext-Anzeige: von welchem Agenten kommt die Frage, was ist der ursprüngliche Task
- [ ] Human kann Task auch komplett abbrechen (nicht nur antworten)

---

## 6. AI-Provider Support

### 6.1 Aktuelle Provider ✅
- [x] Anthropic (Claude Modelle)
- [x] OpenAI (GPT Modelle)
- [x] Ollama (lokale und Cloud-Modelle)
- [x] Ollama API Key Rotation (mehrere Keys, automatisches Wechseln)

### 6.2 Geplant ⬜
- [ ] Provider pro Agent unabhängig konfigurierbar (ist schon in DB, UI prüfen)
- [ ] Fallback-Provider wenn primärer Provider Fehler wirft

---

## 7. Sicherheit & Auth

### 7.1 Auth ✅
- [x] Login / Logout
- [x] Middleware schützt alle Routes

### 7.2 Geplant ⬜
- [ ] Multi-User Support (mehrere Accounts, eigene Agenten pro User)
- [ ] API-Keys für externen Zugriff auf Inbox (damit externe Systeme Tasks einwerfen können)

---

## 8. Deployment & Infrastruktur

### 8.1 Production-Setup ✅
- [x] Web (Next.js) → Vercel
- [x] Runner (Express.js) → Fly.io (immer an, `min_machines_running = 1`)
- [x] Datenbank → Neon PostgreSQL (mit Connection Pooling)
- [x] E2B Sandboxes für Agent-Execution

### 8.2 Geplant ⬜
- [ ] Runner horizontal skalierbar (mehrere Instanzen, Task-Locking via DB)
- [ ] Sandbox-Kosten-Tracking (wie lange lief welcher Agent, was hat es gekostet)

---

## 9. Developer Experience

### 9.1 Lokale Entwicklung ✅
- [x] `npm run dev:web` + `npm run dev:runner`
- [x] `docker-compose.yml` für lokale Postgres
- [x] `.env.example` mit allen benötigten Variablen

### 9.2 Geplant ⬜
- [ ] Seed-Script: erstellt Beispiel-Agenten (CEO + Team) für sofortigen Start
- [ ] Migrations-Script für neue DB-Felder ohne Datenverlust

---

## Nächste Prioritäten (Backlog-Reihenfolge)

1. ~~**`route_back()` Tool**~~ ✅ Fertig
2. ~~**Volle Agent-Beschreibung** im System-Prompt (statt 100 Zeichen)~~ ✅ Fertig (300 Zeichen)
3. ~~**Agent-Templates** — CEO, PO, Marketing etc. als One-Click Setup~~ ✅ Fertig
4. **Task-Flow Visualisierung** — wer hat was an wen delegiert
5. **Task-Priorität** — Feld + Sortierung im Polling
6. **Notifications** für Human Inbox

---

*Letzte Aktualisierung: 2026-05-15*
