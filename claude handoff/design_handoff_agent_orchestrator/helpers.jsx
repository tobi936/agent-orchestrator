// Sparkline component — small SVG line chart
const Sparkline = ({ data, color = "currentColor", height = 28 }) => {
  const w = 240;
  const h = height;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(" ");
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill={color} fillOpacity="0.08" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
};

// JSON pretty-printer with syntax-highlighting
const JsonBlock = ({ data }) => {
  const render = (v, indent = 0, isLast = true) => {
    const pad = "  ".repeat(indent);
    if (v === null) return <span className="b">null</span>;
    if (typeof v === "boolean") return <span className="b">{String(v)}</span>;
    if (typeof v === "number") return <span className="n">{v}</span>;
    if (typeof v === "string") return <span className="s">"{v}"</span>;
    if (Array.isArray(v)) {
      if (v.length === 0) return <span className="p">[]</span>;
      return (
        <>
          <span className="p">[</span>{"\n"}
          {v.map((item, i) => (
            <React.Fragment key={i}>
              {"  ".repeat(indent + 1)}{render(item, indent + 1, i === v.length - 1)}{i < v.length - 1 ? <span className="p">,</span> : null}{"\n"}
            </React.Fragment>
          ))}
          {pad}<span className="p">]</span>
        </>
      );
    }
    if (typeof v === "object") {
      const keys = Object.keys(v);
      if (keys.length === 0) return <span className="p">{"{}"}</span>;
      return (
        <>
          <span className="p">{"{"}</span>{"\n"}
          {keys.map((k, i) => (
            <React.Fragment key={k}>
              {"  ".repeat(indent + 1)}<span className="k">"{k}"</span><span className="p">:</span> {render(v[k], indent + 1, i === keys.length - 1)}{i < keys.length - 1 ? <span className="p">,</span> : null}{"\n"}
            </React.Fragment>
          ))}
          {pad}<span className="p">{"}"}</span>
        </>
      );
    }
    return String(v);
  };
  return <pre className="json-block">{render(data)}</pre>;
};

// Format uptime
const formatUptime = (s) => {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
};

// Format compact uptime
const formatUptimeShort = (s) => {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

window.Sparkline = Sparkline;
window.JsonBlock = JsonBlock;
window.formatUptime = formatUptime;
window.formatUptimeShort = formatUptimeShort;
