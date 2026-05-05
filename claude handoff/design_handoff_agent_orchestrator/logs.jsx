// Logs view
const LogLine = ({ line }) => {
  if (line.type === "divider") {
    return <div className="log-line divider">{line.msg}</div>;
  }
  return (
    <div className="log-line">
      <span className="log-time">{line.t}</span>
      <span className={`log-level ${line.lvl}`}>{line.lvl}</span>
      <span className="log-msg" dangerouslySetInnerHTML={{ __html: line.msg }} />
    </div>
  );
};

const LogsView = ({ logs, paused, setPaused, level, setLevel }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!paused && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs, paused]);

  return (
    <div className="tab-content">
      <div className="logs-toolbar">
        <div className={`live-indicator ${paused ? "paused" : ""}`}>
          <span className="dot"></span>
          {paused ? "PAUSED" : "LIVE · SSE"}
        </div>
        <div style={{ width: 1, height: 14, background: "var(--line-strong)" }}></div>
        <div className="toggle-group">
          {["all", "claude", "tool", "system", "warn"].map(l => (
            <button key={l} className={level === l ? "active" : ""} onClick={() => setLevel(l)}>
              {l}
            </button>
          ))}
        </div>
        <div className="logs-toolbar-spacer"></div>
        <button className="btn ghost" style={{ padding: "4px 8px" }}>
          <Icon name="search" size={12}/> Find
        </button>
        <button className="btn ghost" style={{ padding: "4px 8px" }} onClick={() => setPaused(!paused)}>
          <Icon name={paused ? "play" : "pause"} size={12}/>
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn ghost" style={{ padding: "4px 8px" }}>
          <Icon name="copy" size={12}/> Copy
        </button>
      </div>
      <div className="logs-viewport" ref={ref}>
        {logs.filter(l => l.type === "divider" || level === "all" || l.lvl === level).map((l, i) => (
          <LogLine key={i} line={l} />
        ))}
      </div>
      <div className="composer">
        <span className="field-label">SEND</span>
        <div className="field">
          <Icon name="arrow-right" size={12} className="muted"/>
          <input placeholder="Send a message to this agent…" />
        </div>
        <button className="btn primary"><Icon name="send" size={12}/> Send</button>
      </div>
    </div>
  );
};

window.LogsView = LogsView;
