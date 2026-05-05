import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icons'
import { Sparkline } from './helpers'

interface Props {
  docker: { reachable: boolean; imageReady: boolean } | null
  collapsed: boolean
  onToggle: () => void
  agentCount: number
  runningCount: number
}

const ACTIVITY_SEED = [
  { kind: 'ok',     body: 'SSE stream connected',        time: '11:42:01' },
  { kind: 'accent', body: 'Agent frontend-refactor started', time: '11:42:03' },
  { kind: 'ok',     body: 'Docker image verified',       time: '11:41:58' },
  { kind: 'warn',   body: 'API rate at 82%',             time: '11:41:50' },
  { kind: '',       body: 'Auth token refreshed',        time: '11:41:40' },
]

export function RightBar({ docker, collapsed, onToggle, agentCount, runningCount }: Props) {
  const [openInfra, setOpenInfra] = useState(true)
  const [openMetrics, setOpenMetrics] = useState(true)
  const [openActivity, setOpenActivity] = useState(true)

  const [cpuHistory, setCpuHistory] = useState<number[]>(() =>
    Array.from({ length: 40 }, (_, i) => 18 + Math.sin(i * 0.4) * 8 + Math.random() * 6)
  )
  const [memHistory, setMemHistory] = useState<number[]>(() =>
    Array.from({ length: 40 }, (_, i) => 380 + Math.sin(i * 0.2) * 30 + Math.random() * 20)
  )
  const [msgHistory, setMsgHistory] = useState<number[]>(() =>
    Array.from({ length: 40 }, () => Math.floor(Math.random() * 6) + 1)
  )

  useEffect(() => {
    const id = setInterval(() => {
      setCpuHistory((h) => [...h.slice(1), Math.max(2, Math.min(80, h[h.length - 1] + (Math.random() - 0.5) * 12))])
      setMemHistory((h) => [...h.slice(1), Math.max(80, Math.min(900, h[h.length - 1] + (Math.random() - 0.5) * 24))])
      setMsgHistory((h) => [...h.slice(1), Math.floor(Math.random() * 7) + 1])
    }, 1500)
    return () => clearInterval(id)
  }, [])

  const cpu = Math.round(cpuHistory[cpuHistory.length - 1])
  const mem = Math.round(memHistory[memHistory.length - 1])
  const msgs = msgHistory[msgHistory.length - 1]

  const dockerOk = docker?.reachable ?? false
  const imageOk = docker?.imageReady ?? false

  if (collapsed) {
    return (
      <aside className="rightbar collapsed">
        <button className="rb-toggle" onClick={onToggle} title="Expand infrastructure">
          <Icon name="chevron" size={12} />
        </button>
        <div className="rightbar-collapsed-inner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginTop: 36 }}>
            <span className="status-dot running" title="Claude auth" />
            <span className={`status-dot ${dockerOk ? 'running' : 'error'}`} title="Docker" />
            <span className={`status-dot ${imageOk ? 'running' : 'error'}`} title="Image" />
            <span className="status-dot starting" title="API rate 82%" />
          </div>
          <div className="rb-label">Infrastructure</div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="rightbar">
      <button
        className="rb-toggle"
        onClick={onToggle}
        title="Collapse"
        style={{ transform: 'rotate(180deg)' }}
      >
        <Icon name="chevron" size={12} />
      </button>

      {/* Infrastructure section */}
      <div className={`rightbar-section${!openInfra ? ' collapsed' : ''}`}>
        <div
          className={`rb-section-head${!openInfra ? ' collapsed' : ''}`}
          onClick={() => setOpenInfra((v) => !v)}
        >
          <div className="rightbar-title">Infrastructure</div>
          <span className="chev"><Icon name="chevron" size={11} /></span>
        </div>
        {openInfra && (
          <div className="health-list">
            <div className="health-row ok">
              <span className="status-dot running" />
              <span className="label">Claude auth</span>
              <span className="value">valid</span>
            </div>
            <div className={`health-row ${dockerOk ? 'ok' : 'err'}`}>
              <span className={`status-dot ${dockerOk ? 'running' : 'error'}`} />
              <span className="label">Docker daemon</span>
              <span className="value">{dockerOk ? 'online' : 'offline'}</span>
            </div>
            <div className={`health-row ${imageOk ? 'ok' : 'err'}`}>
              <span className={`status-dot ${imageOk ? 'running' : 'error'}`} />
              <span className="label">Agent image</span>
              <span className="value">{imageOk ? 'ready' : 'missing'}</span>
            </div>
            <div className="health-row ok">
              <span className="status-dot running" />
              <span className="label">SSE stream</span>
              <span className="value">connected</span>
            </div>
            <div className="health-row ok">
              <span className="label" style={{ gridColumn: '2' }}>Agents</span>
              <span className="value">{runningCount}/{agentCount} running</span>
            </div>
          </div>
        )}
      </div>

      {/* Live metrics section */}
      <div className={`rightbar-section${!openMetrics ? ' collapsed' : ''}`}>
        <div
          className={`rb-section-head${!openMetrics ? ' collapsed' : ''}`}
          onClick={() => setOpenMetrics((v) => !v)}
        >
          <div className="rightbar-title">Live metrics</div>
          <span className="chev"><Icon name="chevron" size={11} /></span>
        </div>
        {openMetrics && (
          <div>
            <div className="metric-block">
              <div className="metric-head">
                <span className="metric-label">CPU</span>
                <span className="metric-value">{cpu}%</span>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill accent" style={{ width: `${Math.min(cpu, 100)}%` }} />
              </div>
              <Sparkline data={cpuHistory} color="var(--accent)" />
            </div>
            <div className="metric-block">
              <div className="metric-head">
                <span className="metric-label">Memory</span>
                <span className="metric-value">{mem} MB</span>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill" style={{ width: `${Math.min(mem / 10, 100)}%` }} />
              </div>
              <Sparkline data={memHistory} color="var(--ink-2)" />
            </div>
            <div className="metric-block">
              <div className="metric-head">
                <span className="metric-label">Messages / min</span>
                <span className="metric-value">{msgs}</span>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill ok" style={{ width: `${Math.min(msgs * 14, 100)}%` }} />
              </div>
              <Sparkline data={msgHistory} color="var(--ok)" />
            </div>
          </div>
        )}
      </div>

      {/* Activity section */}
      <div
        className={`rightbar-section${!openActivity ? ' collapsed' : ''}`}
        style={{ flex: openActivity ? 1 : 'none', borderBottom: 0 }}
      >
        <div
          className={`rb-section-head${!openActivity ? ' collapsed' : ''}`}
          onClick={() => setOpenActivity((v) => !v)}
        >
          <div className="rightbar-title">Activity</div>
          <span className="chev"><Icon name="chevron" size={11} /></span>
        </div>
        {openActivity && (
          <div className="activity">
            {ACTIVITY_SEED.map((item, i) => (
              <div key={i} className={`activity-item ${item.kind}`}>
                <div className="dot" />
                <div>
                  <div className="body">{item.body}</div>
                  <span className="time">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
