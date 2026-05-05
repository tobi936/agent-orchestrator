// Sidebar — agent list
const StatusDot = ({ status }) => <span className={`status-dot ${status}`} aria-label={status}></span>;

const AgentRow = ({ agent, active, onClick }) => (
  <div className={`agent-row ${active ? "active" : ""}`} onClick={onClick}>
    <StatusDot status={agent.status} />
    <div className="agent-row-main">
      <div className="agent-row-name">{agent.name}</div>
      <div className="agent-row-meta">
        <span>{agent.id.slice(4, 10)}</span>
        <span className="sep">·</span>
        {agent.status === "running" || agent.status === "idle" ? (
          <span>{formatUptimeShort(agent.uptime)}</span>
        ) : (
          <span style={{ color: "var(--ink-5)" }}>{agent.status}</span>
        )}
      </div>
    </div>
    {agent.unread > 0 && <div className="agent-row-badge">{agent.unread}</div>}
  </div>
);

const Sidebar = ({ agents, activeId, onSelect, filter, setFilter }) => {
  const counts = {
    all: agents.length,
    running: agents.filter(a => a.status === "running").length,
    idle: agents.filter(a => a.status === "idle").length,
    other: agents.filter(a => !["running","idle"].includes(a.status)).length,
  };
  const filtered = agents.filter(a => {
    if (filter === "all") return true;
    if (filter === "running") return a.status === "running";
    if (filter === "idle") return a.status === "idle";
    if (filter === "other") return !["running","idle"].includes(a.status);
    return true;
  });
  return (
    <aside className="sidebar">
      <div className="sidebar-section" style={{ paddingBottom: 0 }}>
        <div className="sidebar-header">
          <div className="sidebar-title">Agents <span className="sidebar-count">· {agents.length}</span></div>
          <button className="btn-new" title="New agent"><Icon name="plus" size={12}/> New</button>
        </div>
        <div className="filter-pills">
          {[
            ["all", "All"],
            ["running", "Running"],
            ["idle", "Idle"],
            ["other", "Other"],
          ].map(([k, label]) => (
            <button key={k} className={`filter-pill ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>
              {label}<span className="count">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="agent-list">
        {filtered.map(a => (
          <AgentRow key={a.id} agent={a} active={a.id === activeId} onClick={() => onSelect(a.id)} />
        ))}
      </div>
    </aside>
  );
};

window.Sidebar = Sidebar;
window.StatusDot = StatusDot;
