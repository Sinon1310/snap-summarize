const SentimentBadge = ({ sentiment }) => {
  const config = {
    POSITIVE: {
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/50',
      text: 'text-emerald-400',
      icon: '😊',
      label: 'Positive'
    },
    NEGATIVE: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-red-400',
      icon: '😔',
      label: 'Negative'
    },
    NEUTRAL: {
      bg: 'bg-slate-500/20',
      border: 'border-slate-500/50',
      text: 'text-slate-400',
      icon: '😐',
      label: 'Neutral'
    },
    MIXED: {
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/50',
      text: 'text-amber-400',
      icon: '🤔',
      label: 'Mixed'
    }
  }

  const style = config[sentiment] || config.NEUTRAL

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${style.bg} ${style.border} border`}>
      <span className="text-lg">{style.icon}</span>
      <span className={`font-medium ${style.text}`}>{style.label}</span>
    </div>
  )
}

export default SentimentBadge
