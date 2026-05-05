// Chat view — agent activity as bubbles + tool cards
const { useEffect: useEffectChat, useRef: useRefChat, useState: useStateChat } = React;

// Convert log lines into chat events grouped by turn
const CHAT_SEED = [
  { kind: "divider", label: "Session resumed · 11:42:14" },
  { kind: "event", from: "backend-api", to: "frontend-refactor", subject: "Schema change: /api/checkout/session", time: "11:42:08" },
  { kind: "claude", time: "11:42:16", text: 'I see the schema update from <span class="hl-kw">backend-api</span>. The <span class="hl-kw">total</span> field is moving from integer→decimal — that\'s breaking. Let me find the call sites and migrate the parsers.' },
  { kind: "tool", time: "11:42:18", tool: "Read", arg: "src/checkout/api.ts", result: "248 lines" },
  { kind: "tool", time: "11:42:21", tool: "Grep", arg: '"checkout/session" in src/**', result: "14 matches" },
  { kind: "claude", time: "11:42:23", text: 'Three call sites are inside <span class="hl-path">PaymentStep.tsx</span>. I\'ll update <span class="hl-path">api.ts</span> and <span class="hl-path">types.ts</span> first, then run typecheck.' },
  { kind: "tool", time: "11:42:26", tool: "Edit", arg: "src/checkout/api.ts", result: "+12 −4", ok: true },
  { kind: "tool", time: "11:42:28", tool: "Edit", arg: "src/checkout/types.ts", result: "+6 −2", ok: true },
  { kind: "tool", time: "11:42:31", tool: "Bash", arg: "pnpm typecheck", result: "exit 0 · 2.4s", ok: true },
  { kind: "tool", time: "11:42:34", tool: "Bash", arg: "pnpm test --filter checkout", result: "47 passed · 8.1s", ok: true },
  { kind: "claude", time: "11:42:35", text: 'Schema migration applied client-side. Tests green. Sending a coordination message to <span class="hl-kw">test-writer</span> — they need to add fixtures for the promo flow.', sentMsg: { to: "test-writer", subject: "Need fixtures: promo_code valid_active, valid_expired, invalid_format" } },
  { kind: "user", time: "11:42:48", text: "Bevor du den PR aufmachst, schau dir bitte noch die a11y-Findings von ui-reviewer an." },
  { kind: "claude", time: "11:42:50", text: 'Verstanden. Ich öffne den Inbox-Eintrag von <span class="hl-kw">ui-reviewer</span> und arbeite die Punkte ab.' },
  { kind: "tool", time: "11:42:51", tool: "Read", arg: "/agent/inbox/msg_b91c4.json", result: "3 violations" },
  { kind: "tool", time: "11:42:53", tool: "Read", arg: "src/checkout/PaymentStep.tsx", result: "312 lines" },
  { kind: "tool", time: "11:42:56", tool: "Edit", arg: "src/checkout/PaymentStep.tsx", result: "+18 −6 · 3 a11y fixes", ok: true },
  { kind: "claude", time: "11:42:58", text: 'A11y-Fixes gepusht auf <span class="hl-path">fix/payment-step-a11y</span>: Label-Association für die Card-Inputs, Kontrast auf 4.5 erhöht (war 3.8), <span class="hl-kw">aria-required</span> auf das CVC-Feld. <span class="hl-kw">ui-reviewer</span> wurde benachrichtigt.', sentMsg: { to: "ui-reviewer", subject: "PaymentStep a11y fixes pushed to fix/payment-step-a11y" } },
];

const ChatStream = ({ events, agent }) => {
  const ref = useRefChat(null);
  useEffectChat(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events]);

  return (
    <div className="chat-viewport" ref={ref}>
      <div className="chat-stream">
        {events.map((e, i) => <ChatEvent key={i} ev={e} agent={agent} />)}
      </div>
    </div>
  );
};

const ChatEvent = ({ ev, agent }) => {
  if (ev.kind === "divider") {
    return <div className="chat-divider">{ev.label}</div>;
  }
  if (ev.kind === "event") {
    return (
      <div className="bubble">
        <div className="bubble-avatar agent-msg" title="agent message">↘</div>
        <div className="bubble-body">
          <div className="bubble-head">
            <span className="bubble-name">Inbox</span>
            <span className="bubble-tag">agent message</span>
            <span className="bubble-time">{ev.time}</span>
          </div>
          <div className="event-card">
            <div className="event-card-head">
              <span className="event-card-from">{ev.from}</span>
              <span className="event-card-arrow">→</span>
              <span>{ev.to}</span>
            </div>
            <div className="event-card-subject">{ev.subject}</div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
              click to open in Inbox →
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (ev.kind === "tool") {
    return (
      <div className="bubble">
        <div className="bubble-avatar tool" title="tool call">⚙</div>
        <div className="bubble-body">
          <div className="tool-card">
            <div className="tool-card-head">
              <span className="tool-card-name">{ev.tool}</span>
              <span className="tool-card-arg">({ev.arg})</span>
              <span className={`tool-card-result ${ev.ok ? "ok" : ""}`}>
                {ev.ok ? "✓ " : ""}{ev.result}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (ev.kind === "claude") {
    return (
      <div className="bubble">
        <div className="bubble-avatar claude">C</div>
        <div className="bubble-body">
          <div className="bubble-head">
            <span className="bubble-name">{agent.name}</span>
            <span className="bubble-tag">{agent.model}</span>
            <span className="bubble-time">{ev.time}</span>
          </div>
          <div className="bubble-content" dangerouslySetInnerHTML={{ __html: ev.text }} />
          {ev.sentMsg && (
            <div style={{ marginTop: 8, padding: "8px 10px", border: "1px solid var(--line)", borderLeft: "2px solid var(--ok)", background: "var(--bg-elev)", borderRadius: "var(--radius)", fontSize: 11.5, fontFamily: "var(--font-mono)" }}>
              <div style={{ color: "var(--ink-4)", marginBottom: 3 }}>OUTBOX → {ev.sentMsg.to}</div>
              <div style={{ color: "var(--ink-2)" }}>"{ev.sentMsg.subject}"</div>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (ev.kind === "user") {
    return (
      <div className="bubble">
        <div className="bubble-avatar you">JK</div>
        <div className="bubble-body">
          <div className="bubble-head">
            <span className="bubble-name">You</span>
            <span className="bubble-time">{ev.time}</span>
          </div>
          <div className="bubble-content">{ev.text}</div>
        </div>
      </div>
    );
  }
  return null;
};

const ChatView = ({ events, agent, paused, setPaused }) => {
  return (
    <div className="tab-content">
      <div className="chat-toolbar">
        <div className={`live-indicator ${paused ? "paused" : ""}`}>
          <span className="dot"></span>
          {paused ? "PAUSED" : "LIVE · streaming"}
        </div>
        <div style={{ width: 1, height: 14, background: "var(--line-strong)" }}></div>
        <div style={{ fontSize: 11.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
          {events.filter(e => e.kind === "tool").length} tool calls · {events.filter(e => e.kind === "claude").length} responses
        </div>
        <div style={{ flex: 1 }}></div>
        <button className="btn ghost" style={{ padding: "4px 8px" }}>
          <Icon name="search" size={12}/> Find
        </button>
        <button className="btn ghost" style={{ padding: "4px 8px" }} onClick={() => setPaused(!paused)}>
          <Icon name={paused ? "play" : "pause"} size={12}/>
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn ghost" style={{ padding: "4px 8px" }}>
          <Icon name="logs" size={12}/> Raw logs
        </button>
      </div>

      <ChatStream events={events} agent={agent} />

      <div className="chat-composer">
        <div className="chat-composer-inner">
          <textarea
            placeholder={`Send a message to ${agent.name}…`}
            rows={1}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
          />
          <div className="chat-composer-actions">
            <button className="icon-btn" title="Attach"><Icon name="plus" size={14}/></button>
            <button className="btn primary"><Icon name="send" size={12}/> Send</button>
          </div>
        </div>
        <div className="chat-composer-hint">
          <span>⌘↵ to send</span>
          <span>JSON message → /agent/inbox/</span>
        </div>
      </div>
    </div>
  );
};

window.ChatView = ChatView;
window.CHAT_SEED = CHAT_SEED;
