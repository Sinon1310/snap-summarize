const KeyPhrases = ({ phrases }) => {
  if (!phrases || phrases.length === 0) return null

  const colors = [
    'bg-sky-500/20 text-sky-300 border-sky-500/30',
    'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {phrases.map((phrase, index) => (
        <span
          key={index}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${colors[index % colors.length]} transition-transform hover:scale-105`}
        >
          {phrase}
        </span>
      ))}
    </div>
  )
}

export default KeyPhrases
