// Side panel — Inbox/Outbox always visible right column
const SidePanel = ({ inbox, outbox, agent, selectedId, onSelect, sideTab, setSideTab }) => {
  const messages = sideTab === "inbox" ? inbox : outbox;
  const selected = messages.find(m => m.id === selectedId) || messages[0];
  const unreadCount = inbox.filter(m => m.unread).length;

  return (
    <aside className="side-panel">
      <div className="side-panel-tabs">
        <button className={`side-tab ${sideTab === "inbox" ? "active" : ""}`} onClick={() => setSideTab("inbox")}>
          <Icon name="inbox" size={13}/> Inbox
          {unreadCount > 0 && <span className="count">{unreadCount}</span>}
        </button>
        <button className={`side-tab ${sideTab === "outbox" ? "active" : ""}`} onClick={() => setSideTab("outbox")}>
          <Icon name="outbox" size={13}/> Outbox
        </button>
        <div className="side-panel-actions">
          <button className="icon-btn" title="Compose"><Icon name="plus" size={14}/></button>
          <button className="icon-btn" title="Filter"><Icon name="filter" size={14}/></button>
        </div>
      </div>

      <div className="side-panel-list">
        {messages.map(m => (
          <div
            key={m.id}
            className={`side-msg ${m.unread ? "unread" : ""} ${selected && m.id === selected.id ? "active" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            <div className="udot"></div>
            <div className="sm-body">
              <div className="row1">
                <span className="from">{m.from}</span>
                <span className="arr">→</span>
                <span className="to">{m.to}</span>
              </div>
              <div className="subj">{m.subject}</div>
              <div className="preview">{m.preview}</div>
              <div className="tag-row">
                <span className={`message-row-tag ${m.type}`}>{m.type}</span>
              </div>
            </div>
            <div className="time">{m.time}</div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="side-panel-detail">
          <div className="det-subject">{selected.subject}</div>
          <div className="det-meta">
            <span className="v">{selected.from}</span> → <span className="v">{selected.to}</span> · {selected.fullTime} · <span className="v">{selected.id}</span>
          </div>
          <JsonBlock data={selected.body} />
          <div className="det-actions">
            <button className="btn primary" style={{ padding: "5px 10px", fontSize: 12 }}>
              <Icon name="send" size={11}/> Reply
            </button>
            <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }}>
              <Icon name="copy" size={11}/> Copy JSON
            </button>
            <button className="btn ghost" style={{ padding: "5px 10px", fontSize: 12, marginLeft: "auto" }}>
              <Icon name="ext" size={11}/> Open in Chat
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

// Infrastructure drawer
const InfraDrawer = ({ onClose, agent, cpuHistory, memHistory, msgHistory }) => {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <div className="drawer-title">Infrastructure status</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>esc to close</span>
            <button className="icon-btn" onClick={onClose} style={{ border: "1px solid var(--line)" }}>
              <Icon name="x" size={13}/>
            </button>
          </div>
        </div>

        <div className="drawer-grid">
          <div className="drawer-cell">
            <div className="label">Claude auth</div>
            <div className="value"><span className="status-dot running"></span> Authenticated</div>
            <div className="meta">expires in 27d · sha256 8a3f…c1</div>
          </div>
          <div className="drawer-cell">
            <div className="label">Docker daemon</div>
            <div className="value"><span className="status-dot running"></span> v25.0.3</div>
            <div className="meta">unix:///var/run/docker.sock · 8 containers</div>
          </div>
          <div className="drawer-cell">
            <div className="label">Agent image</div>
            <div className="value"><span className="status-dot running"></span> claude-agent:1.4.2</div>
            <div className="meta">built 2d ago · 412 MB</div>
          </div>
          <div className="drawer-cell">
            <div className="label">SSE stream</div>
            <div className="value"><span className="status-dot running"></span> Connected</div>
            <div className="meta">8 subscribers · 0 dropped</div>
          </div>

          <div className="drawer-cell">
            <div className="label">Anthropic API</div>
            <div className="value"><span className="status-dot starting"></span> 82% rate</div>
            <div className="meta">resets in 18m · 41k of 50k req/h</div>
          </div>
          <div className="drawer-cell">
            <div className="label">VM</div>
            <div className="value">gcp · europe-west3-a</div>
            <div className="meta">e2-standard-4 · uptime 14d</div>
          </div>
          <div className="drawer-cell">
            <div className="label">Build</div>
            <div className="value">v0.8.2</div>
            <div className="meta">7e3f10a · deployed 2h ago via GH Actions</div>
          </div>
          <div className="drawer-cell">
            <div className="label">PM2</div>
            <div className="value"><span className="status-dot running"></span> 1 process · online</div>
            <div className="meta">orchestrator-api · 4d uptime</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
          <div className="drawer-cell" style={{ borderRight: "1px solid var(--line-2)", borderBottom: 0 }}>
            <div className="label">CPU · {agent.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 500 }}>{agent.cpu}%</span>
              <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>last 60s</span>
            </div>
            <Sparkline data={cpuHistory} color="var(--accent)" height={36} />
          </div>
          <div className="drawer-cell" style={{ borderRight: "1px solid var(--line-2)", borderBottom: 0 }}>
            <div className="label">Memory · {agent.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 500 }}>{agent.mem} MB</span>
              <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>limit 1024</span>
            </div>
            <Sparkline data={memHistory} color="var(--ink-2)" height={36} />
          </div>
          <div className="drawer-cell" style={{ borderBottom: 0 }}>
            <div className="label">Messages / min</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 500 }}>{msgHistory[msgHistory.length - 1]}</span>
              <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>across all agents</span>
            </div>
            <Sparkline data={msgHistory} color="var(--ok)" height={36} />
          </div>
        </div>
      </div>
    </>
  );
};

window.SidePanel = SidePanel;
window.InfraDrawer = InfraDrawer;
