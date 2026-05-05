// Right rail — collapsible
const { useState: useStateRB } = React;

const RightBar = ({ agent, cpuHistory, memHistory, msgHistory, collapsed, onToggle }) => {
  const [openInfra, setOpenInfra] = useStateRB(true);
  const [openMetrics, setOpenMetrics] = useStateRB(true);
  const [openActivity, setOpenActivity] = useStateRB(true);

  if (collapsed) {
    return (
      <aside className="rightbar collapsed">
        <button className="rb-toggle" onClick={onToggle} title="Expand infrastructure">
          <Icon name="chevron" size={12} />
        </button>
        <div className="rightbar-collapsed-inner">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 36 }}>
            <span className="status-dot running" title="Claude auth"></span>
            <span className="status-dot running" title="Docker"></span>
            <span className="status-dot running" title="Image"></span>
            <span className="status-dot starting" title="API rate 82%"></span>
          </div>
          <div className="rb-label">Infrastructure</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rightbar">
      <button
        className="rb-toggle"
        onClick={onToggle}
        title="Collapse"
        style={{ transform: "rotate(180deg)" }}
      >
        <Icon name="chevron" size={12} />
      </button>

      <div className={`rightbar-section ${!openInfra ? "collapsed" : ""}`}>
        <div className={`rb-section-head ${!openInfra ? "collapsed" : ""}`} onClick={() => setOpenInfra(!openInfra)}>
          <div className="rightbar-title" style={{ margin: 0 }}>Infrastructure</div>
          <span className="chev"><Icon name="chevron" size={11} /></span>
        </div>
        {openInfra && (
          <div className="health-list">
            <div className="health-row ok">
              <span className="status-dot running"></span>
              <span className="label">Claude auth</span>
              <span className="value">valid · 27d</span>
            </div>
            <div className="health-row ok">
              <span className="status-dot running"></span>
              <span className="label">Docker daemon</span>
              <span className="value">v25.0.3</span>
            </div>
            <div className="health-row ok">
              <span className="status-dot running"></span>
              <span className="label">Agent image</span>
              <span className="value">1.4.2 · ready</span>
            </div>
            <div className="health-row ok">
              <span className="status-dot running"></span>
              <span className="label">SSE stream</span>
              <span className="value">connected</span>
            </div>
            <div className="health-row warn">
              <span className="status-dot starting"></span>
              <span className="label">API rate</span>
              <span className="value">82% · 18m</span>
            </div>
          </div>
        )}
      </div>

      <div className={`rightbar-section ${!openMetrics ? "collapsed" : ""}`}>
        <div className={`rb-section-head ${!openMetrics ? "collapsed" : ""}`} onClick={() => setOpenMetrics(!openMetrics)}>
          <div className="rightbar-title" style={{ margin: 0 }}>Live metrics · {agent.name}</div>
          <span className="chev"><Icon name="chevron" size={11} /></span>
        </div>
        {openMetrics && (
          <div>
            <div className="metric-block">
              <div className="metric-head">
                <span className="metric-label">CPU</span>
                <span className="metric-value">{agent.cpu}%</span>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill accent" style={{ width: `${Math.min(agent.cpu, 100)}%` }}></div>
              </div>
              <Sparkline data={cpuHistory} color="var(--accent)" />
            </div>
            <div className="metric-block">
              <div className="metric-head">
                <span className="metric-label">Memory</span>
                <span className="metric-value">{agent.mem} MB</span>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill" style={{ width: `${Math.min(agent.mem / 10, 100)}%` }}></div>
              </div>
              <Sparkline data={memHistory} color="var(--ink-2)" />
            </div>
            <div className="metric-block">
              <div className="metric-head">
                <span className="metric-label">Messages / min</span>
                <span className="metric-value">{msgHistory[msgHistory.length - 1]}</span>
              </div>
              <Sparkline data={msgHistory} color="var(--ok)" />
            </div>
          </div>
        )}
      </div>

      <div className={`rightbar-section ${!openActivity ? "collapsed" : ""}`} style={{ flex: openActivity ? 1 : "none" }}>
        <div className={`rb-section-head ${!openActivity ? "collapsed" : ""}`} onClick={() => setOpenActivity(!openActivity)}>
          <div className="rightbar-title" style={{ margin: 0 }}>Activity</div>
          <span className="chev"><Icon name="chevron" size={11} /></span>
        </div>
        {openActivity && (
          <div className="activity">
            {window.ACTIVITY.map((a, i) => (
              <div key={i} className={`activity-item ${a.kind}`}>
                <div className="dot"></div>
                <div>
                  <div className="body">{a.body}</div>
                  <span className="time">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

window.RightBar = RightBar;
