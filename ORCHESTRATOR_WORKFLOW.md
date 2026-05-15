# Orchestrator Workflow — Software Department

## Vision

Ein vollautomatisches Software-Department aus KI-Agenten. Der Mensch gibt ein Ziel rein — alles andere läuft selbstständig: Planung, Implementierung, Tests, Deployment.

---

## Rollen im Department

| Agent | Symbol | Aufgabe | Immer an? |
|---|---|---|---|
| **Orchestrator** | 🧠 | Empfängt Ziele, plant, delegiert, konsolidiert | ✅ Ja |
| **Product Owner** | 📋 | User Stories, Acceptance Criteria, Priorisierung | ❌ On-demand |
| **Engineering Lead** | ⚙️ | Architektur, Ticket-Breakdown, Tech-Entscheidungen | ❌ On-demand |
| **Dev Agent** | 💻 | Code schreiben, committen, PR erstellen | ❌ On-demand |
| **QA Agent** | 🧪 | Tests schreiben, ausführen, Bugs reporten | ❌ On-demand |
| **DevOps Agent** | 🚀 | CI/CD, Deploy, Monitoring | ❌ On-demand |
| **Marketing Lead** | 📣 | Changelog, Release Notes, Doku für User | ❌ On-demand |

---

## Ablauf (Event-Driven, nicht Scrum-Meetings)

```
1. HUMAN gibt Ziel rein
   └─ "Baue ein Login-Feature mit OAuth"

2. ORCHESTRATOR empfängt (immer running)
   ├─ Analysiert Ziel
   ├─ Erstellt internen Plan
   └─ Delegiert parallel:
       ├─ route_task() → Product Owner  "Schreibe User Stories"
       └─ route_task() → Engineering Lead  "Erstelle Architektur-Plan"

3. PLANNING LAYER arbeitet (parallel)
   ├─ Product Owner → route_back() "User Stories fertig: ..."
   └─ Engineering Lead → route_back() "Architektur: 3 Tickets"

4. ORCHESTRATOR konsolidiert Planung
   └─ route_task() × N → Dev Agent(s)  "Implementiere Ticket #1/#2/#3"
   └─ route_task() → QA Agent  "Schreibe Tests für die Stories"

5. EXECUTION LAYER arbeitet (parallel)
   ├─ Dev Agent A → route_back() "PR #42 erstellt"
   ├─ Dev Agent B → route_back() "PR #43 erstellt"
   └─ QA Agent → route_back() "15 Tests, alle grün"

6. ORCHESTRATOR reviewed Ergebnisse
   ├─ Alle Tests grün? → route_task() → DevOps  "Deploy auf Staging"
   └─ Tests rot? → route_task() → Dev Agent  "Fix: Test-Fehler in Auth.ts"

7. DEVOPS deployed
   └─ route_back() "Staging live: https://staging.example.com"

8. ORCHESTRATOR entscheidet
   ├─ Kritische Entscheidung → ask_human() "Deploy auf Prod?"
   └─ Klar grün → route_task() → DevOps "Deploy auf Prod"
       └─ route_task() → Marketing "Schreibe Release Notes"

9. DONE
```

---

## Prinzipien (kein klassisches Scrum)

### Was übernommen wird
- **Backlog** — Tasks im System sind der Product Backlog
- **Sprint Goal** — Orchestrator bekommt ein klares Ziel pro Workflow
- **Definition of Done** — jeder Agent kennt die DoD (`DEFINITION_OF_DONE.md`)
- **Review** — Orchestrator konsolidiert und erstellt Summary

### Was weggelassen wird
- ❌ **Daily Standup** — Agenten arbeiten event-driven, nicht zeitbasiert
- ❌ **Story Points / Velocity** — Agenten haben keine Kapazitätsgrenze
- ❌ **Sprint-Länge** — ein Workflow dauert Minuten bis Stunden, kein 2-Wochen-Rhythmus
- ❌ **Meetings** — Kommunikation läuft über `route_task()` und `route_back()`

### Self-Improvement (statt Retrospektive)
Nach jedem abgeschlossenen Workflow kann der Orchestrator `update_agent()` auf sich selbst aufrufen und seinen System-Prompt basierend auf dem Ergebnis verbessern.

---

## Orchestrator System-Prompt Vorlage

```
Du bist der Orchestrator eines autonomen Software-Departments.

DEINE AUFGABE:
- Du empfängst Ziele vom Menschen
- Du planst den Workflow selbstständig
- Du delegierst via route_task() an die richtigen Agenten
- Du konsolidierst Ergebnisse via route_back()
- Du fragst Menschen nur bei kritischen Entscheidungen (ask_human())

DEIN TEAM:
[wird automatisch aus der Liste aller Agenten befüllt]

ENTSCHEIDUNGSLOGIK:
1. Ziel analysieren — Was ist das gewünschte Ergebnis?
2. Plan erstellen — Welche Agenten brauche ich, in welcher Reihenfolge?
3. Parallel delegieren — Was kann gleichzeitig laufen?
4. Ergebnisse prüfen — Sind alle route_back() eingegangen? Qualität ok?
5. Konsolidieren — Zusammenfassung erstellen
6. Human nur fragen wenn: Deployment in Prod, kritische Architektur-Entscheidung, Budget

SELBST-VERBESSERUNG:
Nach jedem abgeschlossenen Workflow: analysiere was gut/schlecht lief
und rufe update_agent() auf dich selbst auf um deinen Ansatz zu verbessern.

Sei entscheidungsfreudig. Frage nicht unnötig nach.
```

---

## Technische Details

### Orchestrator-Flag
- `isOrchestrator: Boolean` im Datenbank-Schema
- Orchestrator-Agenten werden **nie auto-gestoppt**
- Orchestrator-Agenten werden **immer auto-gestartet** wenn der Runner startet

### Task-Flow
- Alle eingehenden Human-Tasks können direkt an den Orchestrator gesendet werden
- Oder: User wählt selbst welchen Agenten er anspricht
- `fromAgentId` trackt die Routing-Kette für vollständige Nachvollziehbarkeit

### Parallelität
- Mehrere Agenten können gleichzeitig laufen (separate E2B Sandboxes)
- Orchestrator muss nicht auf alle route_back() warten — er kann nach jedem reagieren
- Oder: Orchestrator wartet auf alle und konsolidiert dann (im System-Prompt definierbar)
