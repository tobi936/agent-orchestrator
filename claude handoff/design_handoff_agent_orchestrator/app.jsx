// Main App — Agent Orchestrator dashboard
const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "comfortable",
  "accent": "indigo"
}/*EDITMODE-END*/;

const ACCENTS = {
  indigo:  { val: "#3D3DF5", soft: "#ECECFE", ink: "#1F1FA8" },
  emerald: { val: "#10b48a", soft: "#E1F5EE", ink: "#0a6b50" },
  violet:  { val: "#7c3aed", soft: "#EDE7FE", ink: "#4c1d95" },
  orange:  { val: "#E8590C", soft: "#FBE8DC", ink: "#A03A04" },
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState(window.AGENTS[0].id);
  const [tab, setTab] = useState("chat");
  const [logs, setLogs] = useState(window.LOG_SEED);
  const [paused, setPaused] = useState(false);
  const [logLevel, setLogLevel] = useState("all");
  const [selectedMsg, setSelectedMsg] = useState(window.INBOX[0].id);
  const [now, setNow] = useState(new Date());
  const [chatEvents, setChatEvents] = useState(window.CHAT_SEED);
  const [rbCollapsed, setRbCollapsed] = useState(false);
  const [sideTab, setSideTab] = useState("inbox");
  const [infraCollapsed, setInfraCollapsed] = useState(false);

  const [cpuHistory, setCpuHistory] = useState(() =>
    Array.from({ length: 40 }, (_, i) => 18 + Math.sin(i * 0.4) * 8 + Math.random() * 6)
  );
  const [memHistory, setMemHistory] = useState(() =>
    Array.from({ length: 40 }, (_, i) => 380 + Math.sin(i * 0.2) * 30 + Math.random() * 20)
  );
  const [msgHistory, setMsgHistory] = useState(() =>
    Array.from({ length: 40 }, () => Math.floor(Math.random() * 6) + 1)
  );

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-density", tweaks.density);
    const a = ACCENTS[tweaks.accent] || ACCENTS.indigo;
    document.documentElement.style.setProperty("--accent", a.val);
    document.documentElement.style.setProperty("--accent-soft", a.soft);
    document.documentElement.style.setProperty("--accent-ink", a.ink);
  }, [tweaks]);

  // Edit-mode listener
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Tick clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Live metrics
  useEffect(() => {
    const id = setInterval(() => {
      setCpuHistory(h => [...h.slice(1), Math.max(2, Math.min(80, h[h.length - 1] + (Math.random() - 0.5) * 12))]);
      setMemHistory(h => [...h.slice(1), Math.max(80, Math.min(900, h[h.length - 1] + (Math.random() - 0.5) * 24))]);
      setMsgHistory(h => [...h.slice(1), Math.floor(Math.random() * 7) + 1]);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Streaming logs
  const STREAM_LINES = useMemo(() => [
    { lvl: "tool", msg: 'Read(<span class="hl-path">tests/fixtures/promo/valid_active.json</span>) <span class="hl-dim">— 28 lines</span>' },
    { lvl: "claude", msg: 'Fixtures from <span class="hl-kw">test-writer</span> arrived. Wiring them into <span class="hl-path">PaymentStep.test.tsx</span>.' },
    { lvl: "tool", msg: 'Edit(<span class="hl-path">PaymentStep.test.tsx</span>) <span class="hl-dim">— +24 −2</span>' },
    { lvl: "tool", msg: 'Bash(<span class="hl-quote">pnpm test PaymentStep</span>) <span class="hl-dim">— 12 passed in 1.8s</span>' },
    { lvl: "info", msg: 'Outbox → <span class="hl-kw">backend-api</span>: <span class="hl-quote">"Client ready for promo_code+tax_region. Confirm staging deploy?"</span>' },
    { lvl: "claude", msg: 'Both schema and a11y tracks green. Awaiting confirmation from <span class="hl-kw">backend-api</span> before opening PR.' },
    { lvl: "system", msg: 'inbox: 1 new message from <span class="hl-kw">backend-api</span> <span class="hl-dim">(msg_g4413)</span>' },
    { lvl: "tool", msg: 'Read(<span class="hl-path">/agent/inbox/msg_g4413.json</span>)' },
  ], []);

  useEffect(() => {
    if (paused) return;
    let i = 0;
    const id = setInterval(() => {
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      const ss = String(t.getSeconds()).padStart(2, "0");
      const line = STREAM_LINES[i % STREAM_LINES.length];
      setLogs(prev => [...prev, { ...line, t: `${hh}:${mm}:${ss}` }].slice(-200));
      i++;
    }, 4000);
    return () => clearInterval(id);
  }, [paused, STREAM_LINES]);

  const agent = window.AGENTS.find(a => a.id === activeId) || window.AGENTS[0];

  // Workspace cluster used in topbar
  const workspace = "checkout-rebuild";

  const tabs = [
    { id: "chat",   label: "Chat",         icon: "logs",    count: null },
    { id: "config", label: "Config",       icon: "config",  count: null },
  ];

  return (
    <div className="app-shell">
      <div className={`layout ${infraCollapsed ? "infra-collapsed" : ""}`}>
        {/* TOPBAR */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <rect x="1" y="1" width="20" height="20" rx="5" fill="var(--ink)"/>
                <circle cx="7" cy="11" r="2" fill="var(--accent)"/>
                <circle cx="15" cy="7" r="2" fill="var(--bg-elev)"/>
                <circle cx="15" cy="15" r="2" fill="var(--bg-elev)"/>
                <path d="M7 11L15 7M7 11L15 15" stroke="var(--bg-elev)" strokeWidth="1" opacity="0.5"/>
              </svg>
            </div>
            <div className="brand-name">orchestrator<span className="muted">/v0.8</span></div>
          </div>

          <div className="workspace-pill">
            <span className="dot"></span>
            <span>{workspace}</span>
            <Icon name="chevron" size={11} />
          </div>

          <div className="topbar-search">
            <Icon name="search" size={12}/>
            <input placeholder="Jump to agent, message, log…" />
            <span className="kbd">⌘K</span>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn" title="Notifications"><Icon name="bell" size={14}/></button>
            <button className="icon-btn" title="Help"><Icon name="help" size={14}/></button>
            <button className="icon-btn" title="Settings"><Icon name="settings" size={14}/></button>
            <div className="avatar">JK</div>
          </div>
        </div>

        {/* SIDEBAR */}
        <Sidebar
          agents={window.AGENTS}
          activeId={activeId}
          onSelect={setActiveId}
          filter={filter}
          setFilter={setFilter}
        />

        {/* MAIN */}
        <main className="main">
          <div className="detail-header">
            <div className="detail-title-row">
              <div className="detail-title-block">
                <div className="detail-breadcrumb">
                  <span>{workspace}</span>
                  <span className="crumb-sep">/</span>
                  <span>agents</span>
                  <span className="crumb-sep">/</span>
                  <span style={{ color: "var(--ink-2)" }}>{agent.name}</span>
                </div>
                <h1 className="detail-title">
                  <StatusDot status={agent.status} />
                  {agent.name}
                </h1>
                <div className="detail-sub">
                  <div className="detail-sub-item">
                    <span className="label">id</span>
                    <span className="value">{agent.id}</span>
                  </div>
                  <div className="detail-sub-divider"></div>
                  <div className="detail-sub-item">
                    <span className="label">model</span>
                    <span className="value">{agent.model}</span>
                  </div>
                  <div className="detail-sub-divider"></div>
                  <div className="detail-sub-item">
                    <span className="label">workspace</span>
                    <span className="value">{agent.workspace}</span>
                  </div>
                  <div className="detail-sub-divider"></div>
                  <div className="detail-sub-item">
                    <span className="label">uptime</span>
                    <span className="value">{formatUptime(agent.uptime)}</span>
                  </div>
                  <div className="detail-sub-divider"></div>
                  <div className="detail-sub-item">
                    <span className="label">image</span>
                    <span className="value">{agent.image}</span>
                  </div>
                </div>
              </div>
              <div className="detail-actions">
                <button className="btn"><Icon name="send" size={12}/> Send message</button>
                <button className="btn"><Icon name="restart" size={12}/> Restart</button>
                <button className="btn danger"><Icon name="stop" size={12}/> Stop</button>
                <button className="icon-btn" style={{ border: "1px solid var(--line-strong)" }}>
                  <Icon name="more" size={14}/>
                </button>
              </div>
            </div>

            <div className="tabs">
              {tabs.map(t => (
                <button
                  key={t.id}
                  className={`tab ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  <Icon name={t.icon} size={13} />
                  {t.label}
                  {t.count != null && <span className="count">{t.count}</span>}
                </button>
              ))}
            </div>
          </div>

          {tab === "chat" && (
            <ChatView
              events={chatEvents}
              agent={agent}
              paused={paused}
              setPaused={setPaused}
            />
          )}
          {tab === "config" && (
            <div className="tab-content" style={{ padding: "24px 28px", overflowY: "auto" }}>
              <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
                <ConfigSection title="System Prompt" subtitle="Sent on every Claude invocation as the initial system message.">
                  <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 6, padding: 14, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6, color: "var(--ink-2)" }}>
                    {agent.systemPrompt}
                  </div>
                </ConfigSection>
                <ConfigSection title="Container" subtitle="Docker container running this agent.">
                  <ConfigRow k="Image" v={agent.image} />
                  <ConfigRow k="Workspace mount" v={agent.workspace} mono />
                  <ConfigRow k="Credentials" v={<><Icon name="lock" size={11}/> ~/.claude (encrypted)</>} mono />
                  <ConfigRow k="Inbox path" v="/agent/inbox/" mono />
                  <ConfigRow k="Outbox path" v="/agent/outbox/" mono />
                </ConfigSection>
                <ConfigSection title="Model" subtitle="Anthropic API model and limits.">
                  <ConfigRow k="Model" v={agent.model} />
                  <ConfigRow k="Max tokens" v="8192" mono />
                  <ConfigRow k="Temperature" v="0.2" mono />
                </ConfigSection>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT — Inbox/Outbox side panel */}
        <SidePanel
          inbox={window.INBOX}
          outbox={window.INBOX.map(m => ({ ...m, from: agent.name, to: m.from, direction: "out", unread: false })).slice(0, 4)}
          agent={agent}
          selectedId={selectedMsg}
          onSelect={setSelectedMsg}
          sideTab={sideTab}
          setSideTab={setSideTab}
        />

        {/* FAR RIGHT — Infrastructure rail (collapsible) */}
        <RightBar
          agent={agent}
          cpuHistory={cpuHistory}
          memHistory={memHistory}
          msgHistory={msgHistory}
          collapsed={infraCollapsed}
          onToggle={() => setInfraCollapsed(!infraCollapsed)}
        />

        {/* STATUS BAR */}
        <div className="statusbar">
          <div className="statusbar-item ok">
            <span className="status-dot running"></span>
            <span className="label">claude</span>
            <span className="value">authenticated</span>
          </div>
          <div className="statusbar-item ok">
            <span className="status-dot running"></span>
            <span className="label">docker</span>
            <span className="value">25.0.3</span>
          </div>
          <div className="statusbar-item ok">
            <span className="label">image</span>
            <span className="value">claude-agent:1.4.2</span>
          </div>
          <div className="statusbar-item">
            <span className="label">agents</span>
            <span className="value">{window.AGENTS.filter(a => a.status === "running").length}/{window.AGENTS.length} running</span>
          </div>
          <div className="statusbar-item warn">
            <span className="label">api rate</span>
            <span className="value">82% · resets in 18m</span>
          </div>
          <div className="statusbar-item right">
            <span className="label">vm</span>
            <span className="value">gcp · europe-west3-a</span>
          </div>
          <div className="statusbar-item">
            <span className="label">build</span>
            <span className="value">v0.8.2 · 7e3f10a</span>
          </div>
          <div className="statusbar-item">
            <span className="value">{now.toLocaleTimeString("en-GB")}</span>
          </div>
        </div>
      </div>

      {/* TWEAKS PANEL */}
      {tweaksOpen && (
        <TweaksPanel onClose={() => { setTweaksOpen(false); window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); }}>
          <TweakSection title="Theme">
            <TweakRadio
              value={tweaks.theme}
              onChange={v => setTweak("theme", v)}
              options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
            />
          </TweakSection>
          <TweakSection title="Density">
            <TweakRadio
              value={tweaks.density}
              onChange={v => setTweak("density", v)}
              options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]}
            />
          </TweakSection>
          <TweakSection title="Accent">
            <TweakRadio
              value={tweaks.accent}
              onChange={v => setTweak("accent", v)}
              options={[
                { value: "indigo", label: "Indigo" },
                { value: "emerald", label: "Emerald" },
                { value: "violet", label: "Violet" },
                { value: "orange", label: "Orange" },
              ]}
            />
          </TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}

const ConfigSection = ({ title, subtitle, children }) => (
  <div>
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 2 }}>{subtitle}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
  </div>
);
const ConfigRow = ({ k, v, mono }) => (
  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", padding: "8px 12px", background: "var(--bg-elev)", border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 12, alignItems: "center" }}>
    <div style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{k}</div>
    <div style={{ color: "var(--ink-2)", fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)", fontSize: mono ? 11.5 : 12, display: "inline-flex", alignItems: "center", gap: 6 }}>{v}</div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
