// Inbox view
const InboxView = ({ messages, selectedId, onSelect, agent }) => {
  const selected = messages.find(m => m.id === selectedId) || messages[0];
  return (
    <div className="tab-content">
      <div className="inbox-grid">
        <div className="message-list">
          {messages.map(m => (
            <div
              key={m.id}
              className={`message-row ${m.unread ? "unread" : ""} ${m.id === selected.id ? "active" : ""}`}
              onClick={() => onSelect(m.id)}
            >
              <div className="unread-dot"></div>
              <div className="message-row-main">
                <div className="message-row-line1">
                  <span className="message-row-from">{m.from}</span>
                  <span className="message-row-arrow">→</span>
                  <span className="message-row-to">{m.to}</span>
                  <span className={`message-row-tag ${m.type}`}>{m.type}</span>
                </div>
                <div className="message-row-subject">{m.subject}</div>
                <div className="message-row-preview">{m.preview}</div>
              </div>
              <div className="message-row-time">{m.time}</div>
            </div>
          ))}
        </div>
        {selected && (
          <div className="message-detail">
            <div className="message-detail-header">
              <div className="message-detail-subject">{selected.subject}</div>
              <div className="message-detail-meta">
                <span className="k">from</span><span className="v">{selected.from}</span>
                <span className="k">to</span><span className="v">{selected.to}</span>
                <span className="k">type</span><span className="v">{selected.type}</span>
                <span className="k">time</span><span className="v">{selected.fullTime} · today</span>
                <span className="k">id</span><span className="v">{selected.id}</span>
                <span className="k">file</span><span className="v" style={{ color: "var(--accent-ink)" }}>/agent/inbox/{selected.id}.json</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>
                Payload
              </div>
              <JsonBlock data={selected.body} />
            </div>
            <div className="message-detail-actions">
              <button className="btn primary"><Icon name="send" size={12}/> Reply</button>
              <button className="btn"><Icon name="arrow-right" size={12}/> Forward</button>
              <button className="btn ghost"><Icon name="copy" size={12}/> Copy JSON</button>
              <div style={{ flex: 1 }}></div>
              <button className="btn ghost danger"><Icon name="x" size={12}/> Archive</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.InboxView = InboxView;
