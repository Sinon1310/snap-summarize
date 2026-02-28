const LoadingSpinner = ({ message = 'Processing...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Animated spinner */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-slate-700"></div>
        <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-transparent border-t-sky-500 animate-spin"></div>
        <div className="absolute top-2 left-2 w-16 h-16 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      
      {/* Pulsing dots */}
      <div className="flex gap-2 mt-6">
        <div className="w-3 h-3 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      
      <p className="mt-4 text-slate-400 text-lg">{message}</p>
      <p className="mt-2 text-slate-500 text-sm">This usually takes 10-30 seconds</p>
    </div>
  )
}

export default LoadingSpinner
