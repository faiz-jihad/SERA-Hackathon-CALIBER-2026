interface EvidenceCardProps {
  items: string[]
  title?: string
  color?: 'cyan' | 'amber' | 'red' | 'green'
}

const COLOR_MAP = {
  cyan: {
    dot: 'bg-sera-cyan',
    border: 'border-sera-cyan/20',
    bg: 'bg-sera-cyan/5',
    text: 'text-sera-cyan',
  },
  amber: {
    dot: 'bg-amber-400',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/5',
    text: 'text-amber-400',
  },
  red: {
    dot: 'bg-red-400',
    border: 'border-red-400/20',
    bg: 'bg-red-400/5',
    text: 'text-red-400',
  },
  green: {
    dot: 'bg-sera-green',
    border: 'border-sera-green/20',
    bg: 'bg-sera-green/5',
    text: 'text-sera-green',
  },
}

export default function EvidenceCard({ items, title, color = 'cyan' }: EvidenceCardProps) {
  const c = COLOR_MAP[color]

  if (!items || items.length === 0) {
    return (
      <div className={`rounded-lg border ${c.border} ${c.bg} px-4 py-3`}>
        <p className="text-gray-500 text-sm italic">No evidence data available.</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-4 py-3 space-y-2`}>
      {title && (
        <div className={`text-xs font-bold uppercase tracking-widest ${c.text} mb-2`}>
          {title}
        </div>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2.5 text-sm text-gray-300">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}
