interface IconProps {
  name: string
  size?: number
  className?: string
}

export function Icon({ name, size = 14, className = '' }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }
  switch (name) {
    case 'play':    return <svg {...props}><path d="M4 3.5l8 4.5-8 4.5z" fill="currentColor" stroke="none"/></svg>
    case 'pause':   return <svg {...props}><rect x="4" y="3.5" width="2.5" height="9" fill="currentColor" stroke="none"/><rect x="9.5" y="3.5" width="2.5" height="9" fill="currentColor" stroke="none"/></svg>
    case 'stop':    return <svg {...props}><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" stroke="none"/></svg>
    case 'restart': return <svg {...props}><path d="M3 8a5 5 0 1 0 1.5-3.5"/><path d="M3 3v2.5h2.5"/></svg>
    case 'send':    return <svg {...props}><path d="M2 8l11-5-3 11-3-5-5-1z"/></svg>
    case 'search':  return <svg {...props}><circle cx="7" cy="7" r="4"/><path d="M10 10l3 3"/></svg>
    case 'plus':    return <svg {...props}><path d="M8 3.5v9M3.5 8h9"/></svg>
    case 'filter':  return <svg {...props}><path d="M2 3h12l-4.5 6V13L6.5 11.5V9z"/></svg>
    case 'settings':return <svg {...props}><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M1 8h2M13 8h2M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4"/></svg>
    case 'logs':    return <svg {...props}><path d="M3 3h10v10H3z"/><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3"/></svg>
    case 'inbox':   return <svg {...props}><path d="M2 8.5l1.5-5h9L14 8.5"/><path d="M2 8.5h3.5l1 1.5h3l1-1.5H14V13H2z"/></svg>
    case 'outbox':  return <svg {...props}><path d="M2 7.5l1.5 5h9L14 7.5"/><path d="M2 7.5h3.5l1-1.5h3l1 1.5H14V3H2z"/></svg>
    case 'config':  return <svg {...props}><path d="M3 4h10M3 8h10M3 12h10"/><circle cx="6" cy="4" r="1.2" fill="currentColor"/><circle cx="10" cy="8" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/></svg>
    case 'bell':    return <svg {...props}><path d="M4 11V8a4 4 0 0 1 8 0v3l1 1.5H3z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>
    case 'help':    return <svg {...props}><circle cx="8" cy="8" r="6"/><path d="M6.5 6.5a1.5 1.5 0 1 1 2 1.4c-.4.2-.5.5-.5 1V9.5"/><circle cx="8" cy="11.5" r="0.4" fill="currentColor"/></svg>
    case 'chevron': return <svg {...props}><path d="M6 4l4 4-4 4"/></svg>
    case 'more':    return <svg {...props}><circle cx="4" cy="8" r="0.9" fill="currentColor"/><circle cx="8" cy="8" r="0.9" fill="currentColor"/><circle cx="12" cy="8" r="0.9" fill="currentColor"/></svg>
    case 'copy':    return <svg {...props}><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M3 11V3h8"/></svg>
    case 'ext':     return <svg {...props}><path d="M9 3h4v4M13 3l-6 6M11 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3"/></svg>
    case 'docker':  return <svg {...props}><path d="M2 8h12M3 8V6h2v2M5.5 8V6h2v2M8 8V6h2v2M5.5 5.5V3.5h2v2M2 8s.5 4 5 4 6.5-2 7-4"/></svg>
    case 'cpu':     return <svg {...props}><rect x="4" y="4" width="8" height="8" rx="0.5"/><rect x="6" y="6" width="4" height="4"/><path d="M6 1.5v2M10 1.5v2M6 12.5v2M10 12.5v2M1.5 6h2M1.5 10h2M12.5 6h2M12.5 10h2"/></svg>
    case 'mem':     return <svg {...props}><rect x="2" y="5" width="12" height="6" rx="0.5"/><path d="M5 5v6M8 5v6M11 5v6"/></svg>
    case 'key':     return <svg {...props}><circle cx="5" cy="11" r="2"/><path d="M6.5 9.5l4-4M9 7l1.5 1.5M11 5l1.5 1.5"/></svg>
    case 'lock':    return <svg {...props}><rect x="3.5" y="7" width="9" height="6" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>
    case 'dot':     return <svg {...props}><circle cx="8" cy="8" r="2.5" fill="currentColor"/></svg>
    case 'arrow-right': return <svg {...props}><path d="M3 8h10M9 4l4 4-4 4"/></svg>
    case 'x':       return <svg {...props}><path d="M4 4l8 8M12 4l-8 8"/></svg>
    default:        return null
  }
}
