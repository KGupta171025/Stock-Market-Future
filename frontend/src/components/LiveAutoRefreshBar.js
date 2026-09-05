import React, { useState, useEffect } from 'react';
import { RefreshCw, Pause, Play, Activity } from 'lucide-react';

export default function LiveAutoRefreshBar({
  interval = 2000,
  onIntervalChange,
  isPaused = false,
  onTogglePause,
  onManualRefresh,
  lastUpdated,
  isRefreshing = false,
  className = '',
}) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const speedOptions = [
    { label: '1s', value: 1000 },
    { label: '2s (Fast)', value: 2000 },
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
  ];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 bg-slate-900 text-slate-100 dark:bg-slate-900/95 dark:border-slate-800 rounded-xl shadow-sm border border-slate-800 text-xs flex-wrap ${className}`}
    >
      {/* Live Pulsing Dot */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2.5 w-2.5">
          {!isPaused && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isPaused ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
          ></span>
        </span>
        <span className="font-bold tracking-tight text-[11px] uppercase text-emerald-400 flex items-center gap-1">
          <Activity className="h-3 w-3 inline" />
          {isPaused ? 'Paused' : 'Auto-Reload'}
        </span>
      </div>

      <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />

      {/* Speed Options */}
      <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg">
        {speedOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (onIntervalChange) onIntervalChange(opt.value);
              if (isPaused && onTogglePause) onTogglePause();
            }}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
              !isPaused && interval === opt.value
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Pause / Play Toggle */}
      {onTogglePause && (
        <button
          type="button"
          onClick={onTogglePause}
          title={isPaused ? 'Resume Auto-Reload' : 'Pause Auto-Reload'}
          className={`p-1 rounded-md transition-colors ${
            isPaused
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Manual Instant Sync */}
      {onManualRefresh && (
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          title="Force instant sync now"
          className="flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground font-semibold rounded text-[11px] hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Sync</span>
        </button>
      )}

      {/* Elapsed seconds info */}
      <div className="text-[10px] text-slate-400 font-mono hidden md:inline ml-auto">
        {isRefreshing ? (
          <span className="text-emerald-400 animate-pulse font-semibold">Updating...</span>
        ) : (
          <span>{secondsAgo === 0 ? 'Live' : `${secondsAgo}s ago`}</span>
        )}
      </div>
    </div>
  );
}
