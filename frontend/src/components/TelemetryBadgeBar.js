import React from 'react';
import { Activity, Clock, ShieldCheck, Database } from 'lucide-react';
import { Badge } from './ui/badge';

export function TelemetryBadge({ source = 'Exchange Real-Time Feed', status = 'Live', size = 'sm', className = '' }) {
  const statusStr = (status || '').toLowerCase();
  const isLive = statusStr === 'live' || statusStr === 'open' || (statusStr.includes('live') && !statusStr.includes('closed'));
  const isClosed = statusStr.includes('closed') || statusStr === 'close' || statusStr.includes('holiday');
  const isDelayed = statusStr.includes('delay');

  let badgeClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-border/60';
  let dotClasses = 'bg-slate-400';

  if (isLive) {
    badgeClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    dotClasses = 'bg-emerald-500 animate-pulse';
  } else if (isClosed) {
    badgeClasses = 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80';
    dotClasses = 'bg-amber-500';
  } else if (isDelayed) {
    badgeClasses = 'bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
    dotClasses = 'bg-blue-500';
  }

  const displayStatus = isClosed ? 'Closed' : (status || 'Live');

  return (
    <div className={'inline-flex items-center gap-1.5 flex-wrap ' + className}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border/50">
        <Database className="h-3 w-3 text-primary shrink-0" />
        <span className="truncate max-w-[130px] sm:max-w-none">{source}</span>
      </span>

      <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ' + badgeClasses}>
        <span className={'h-1.5 w-1.5 rounded-full ' + dotClasses} />
        {displayStatus}
      </span>
    </div>
  );
}

export function TelemetryDetailsBar({
  symbol,
  exchange,
  ltp,
  prev_close,
  change,
  change_percent,
  open,
  high,
  low,
  volume,
  exchange_timestamp,
  received_timestamp,
  data_source = 'Exchange Real-Time Feed',
  status = 'Live',
  currencySymbol = '₹',
}) {
  const isPositive = (change ?? 0) >= 0;

  const formatTs = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/90 border border-border/80 rounded-xl p-3 sm:p-4 text-xs shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            <Activity className="h-4 w-4 text-primary" />
            <span>{symbol}</span>
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
              {exchange || 'NSE'}
            </Badge>
          </div>
          <TelemetryBadge source={data_source} status={status} />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1" title="Exchange Timestamp">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="hidden sm:inline">Exch:</span> {formatTs(exchange_timestamp)}
          </span>
          <span className="flex items-center gap-1" title="Received Timestamp">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span className="hidden sm:inline">Recv:</span> {formatTs(received_timestamp)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Last Traded Price (LTP)</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-50 font-mono">
            {currencySymbol}{Number(ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Absolute Change</span>
          <span className={'text-sm font-bold font-mono ' + (isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {isPositive ? '+' : ''}{Number(change || 0).toFixed(2)}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Percentage Change</span>
          <span className={'text-sm font-bold font-mono ' + (isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {isPositive ? '+' : ''}{Number(change_percent || 0).toFixed(2)}%
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Previous Close</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
            {currencySymbol}{Number(prev_close || ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Open / High / Low</span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono block truncate">
            {currencySymbol}{Number(open || ltp || 0).toFixed(1)} / {currencySymbol}{Number(high || ltp || 0).toFixed(1)} / {currencySymbol}{Number(low || ltp || 0).toFixed(1)}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Volume Traded</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
            {volume || '5.2M'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TelemetryBadge;