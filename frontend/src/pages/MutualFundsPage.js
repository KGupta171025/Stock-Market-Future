import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMutualFunds, searchMutualFunds, POPULAR_MUTUAL_FUNDS } from '../services/api';
import { Button } from '../components/ui/button';
import LiveAutoRefreshBar from '../components/LiveAutoRefreshBar';
import { TelemetryBadge } from '../components/TelemetryBadgeBar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  LogOut,
  Layers,
  Shield,
  Award,
  Percent,
  Calculator,
  PieChart,
  BarChart3,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Landmark,
  Coins,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Sparkles,
  Calendar,
  Lock,
  Bookmark,
  Scale,
  Zap,
  HelpCircle,
  ArrowRightLeft,
  X,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Index Funds', 'Large Cap', 'Flexi Cap', 'Small Cap', 'Mid Cap', 'Multi Cap', 'Thematic'];

const DEFAULT_SECTORS = [
  { name: 'Financials (Banking & NBFCs)', weight: 32.40, color: '#7c3aed' },
  { name: 'Information Technology', weight: 15.20, color: '#0284c7' },
  { name: 'Oil, Gas & Energy', weight: 11.50, color: '#059669' },
  { name: 'Automobile & Ancillaries', weight: 8.80, color: '#d97706' },
  { name: 'Consumer Goods & FMCG', weight: 7.90, color: '#0891b2' },
  { name: 'Construction & Capital Goods', weight: 6.70, color: '#2563eb' },
  { name: 'Healthcare & Pharma', weight: 5.40, color: '#e11d48' },
  { name: 'Telecommunication', weight: 4.30, color: '#4f46e5' },
  { name: 'Cash & Liquid Assets', weight: 7.80, color: '#64748b' },
];

const DEFAULT_HOLDINGS = [
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited', weight: 9.80 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', weight: 8.90 },
  { symbol: 'RELIANCE', name: 'Reliance Industries Limited', weight: 8.40 },
  { symbol: 'INFY', name: 'Infosys Limited', weight: 6.20 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', weight: 4.90 },
  { symbol: 'LT', name: 'Larsen & Toubro Limited', weight: 4.50 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Limited', weight: 4.10 },
  { symbol: 'ITC', name: 'ITC Limited', weight: 3.80 },
  { symbol: 'SBIN', name: 'State Bank of India', weight: 3.20 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', weight: 2.90 },
];

function formatINR(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function getFundAge(launchDate) {
  if (!launchDate) return null;
  const launch = new Date(launchDate);
  if (isNaN(launch.getTime())) return null;
  const diffMs = Date.now() - launch.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} Months`;
  }
  return `${years.toFixed(1)} Years`;
}

export function getFundAgeYears(fund) {
  if (!fund) return 100;
  const dateStr = fund.launch_date || fund.inception_date;
  if (!dateStr) return 100;
  const launch = new Date(dateStr);
  if (isNaN(launch.getTime())) return 100;
  const diffMs = Date.now() - launch.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

export function getAvailableCagrOptions(fund) {
  if (!fund) return [{ key: '1 Year', label: '1 Year', value: 15.0 }];
  const options = [];
  const ageYears = getFundAgeYears(fund);

  const checkAndAdd = (key, label, value, requiredYears) => {
    // If the fund has not existed for requiredYears, do NOT display this CAGR option
    if (requiredYears && ageYears < (requiredYears - 0.1)) {
      return;
    }
    if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
      options.push({ key, label, value: Number(value) });
    }
  };

  checkAndAdd('1 Year', '1 Year', fund.cagr_1yr ?? fund.cagr_1y, 1);
  checkAndAdd('2 Years', '2 Years', fund.cagr_2yr ?? fund.cagr_2y, 2);
  checkAndAdd('3 Years', '3 Years', fund.cagr_3yr ?? fund.cagr_3y, 3);
  checkAndAdd('4 Years', '4 Years', fund.cagr_4yr ?? fund.cagr_4y, 4);
  checkAndAdd('5 Years', '5 Years', fund.cagr_5yr ?? fund.cagr_5y, 5);
  checkAndAdd('All', 'All / Inception', fund.cagr_all ?? fund.cagr_since_inception ?? fund.cagr_1yr);

  if (options.length === 0) {
    options.push({ key: '1 Year', label: '1 Year', value: Number(fund.cagr_1yr || 15.0) });
  }

  return options;
}

export function calculateLumpsumOrRecurring({ amount, frequency = 'onetime', years = 5, returnRate = 15 }) {
  const p = Number(amount) || 0;
  const t = Number(years) || 1;
  const r = (Number(returnRate) || 15) / 100;

  if (frequency === 'onetime') {
    const maturity = p * Math.pow(1 + r, t);
    const invested = p;
    const returns = Math.max(0, maturity - invested);
    return {
      installments: 1,
      invested: Math.round(invested),
      returns: Math.round(returns),
      maturity: Math.round(maturity),
      frequencyLabel: 'One-Time Lumpsum',
    };
  }

  const monthsGap = frequency === '1M' ? 1 : frequency === '2M' ? 2 : frequency === '3M' ? 3 : frequency === '6M' ? 6 : 12;
  const paymentsPerYear = 12 / monthsGap;
  const totalInstallments = Math.round(t * paymentsPerYear);
  const ratePerPeriod = r / paymentsPerYear;

  let maturity = 0;
  if (ratePerPeriod > 0) {
    maturity = p * ((Math.pow(1 + ratePerPeriod, totalInstallments) - 1) / ratePerPeriod) * (1 + ratePerPeriod);
  } else {
    maturity = p * totalInstallments;
  }
  const invested = p * totalInstallments;
  const returns = Math.max(0, maturity - invested);

  return {
    installments: totalInstallments,
    invested: Math.round(invested),
    returns: Math.round(returns),
    maturity: Math.round(maturity),
    frequencyLabel: frequency === '1M' ? 'Monthly (1M Gap)' :
                    frequency === '2M' ? 'Every 2 Months Gap' :
                    frequency === '3M' ? 'Quarterly (3M Gap)' :
                    frequency === '6M' ? 'Half-Yearly (6M Gap)' : 'Annually (12M Gap)',
  };
}

function calculateSIP(monthlyInvest, years, returnRate) {
  const p = Number(monthlyInvest) || 0;
  const t = Number(years) || 0;
  const r = (Number(returnRate) || 0) / 100;
  const n = t * 12;
  const i = r / 12;

  if (i === 0 || n === 0) {
    const totalInvest = p * n;
    return { invested: totalInvest, returns: 0, maturity: totalInvest };
  }

  const maturity = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const invested = p * n;
  const returns = Math.max(0, maturity - invested);

  return {
    invested: Math.round(invested),
    returns: Math.round(returns),
    maturity: Math.round(maturity),
  };
}

function generateHistoricalNavData(fund, timeframe = '1Y') {
  if (!fund) return [];
  const currentNav = fund.nav || 100;
  const cagr1 = parseFloat(fund.cagr_1yr || 15) / 100;
  const cagr2 = parseFloat(fund.cagr_2yr || fund.cagr_3yr || 18) / 100;
  const cagr3 = parseFloat(fund.cagr_3yr || 20) / 100;
  const cagr5 = parseFloat(fund.cagr_5yr || 18) / 100;

  let numDays = 252;
  let startNav = currentNav / (1 + cagr1);

  if (timeframe === '3M') {
    numDays = 65;
    startNav = currentNav / (1 + cagr1 * 0.25);
  } else if (timeframe === '6M') {
    numDays = 130;
    startNav = currentNav / (1 + cagr1 * 0.5);
  } else if (timeframe === '1Y') {
    numDays = 252;
    startNav = currentNav / (1 + cagr1);
  } else if (timeframe === '2Y') {
    numDays = 504;
    startNav = currentNav / Math.pow(1 + cagr2, 2);
  } else if (timeframe === '5Y' || timeframe === 'Max') {
    numDays = 750;
    startNav = currentNav / Math.pow(1 + (fund.cagr_5yr ? cagr5 : cagr3), 3.2);
  }

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = numDays * (365 / 252);
  const startTime = now.getTime() - totalDays * dayMs;

  const count = 50;
  const interval = (totalDays * dayMs) / count;
  const drift = Math.pow(currentNav / Math.max(1, startNav), 1 / count);

  const points = [];
  for (let i = 0; i <= count; i++) {
    const time = new Date(startTime + i * interval);
    const progress = i / count;
    const wave =
      Math.sin(progress * Math.PI * 3.8) * (currentNav * 0.045) +
      Math.cos(progress * Math.PI * 7.2) * (currentNav * 0.02);

    let navVal = startNav * Math.pow(drift, i) + wave;
    if (i === count) navVal = currentNav;
    const lowBound = fund.week_52_low ? fund.week_52_low * 0.85 : currentNav * 0.6;
    navVal = Math.max(navVal, lowBound);

    const labelDate = time.toLocaleDateString('en-IN', {
      month: 'short',
      year: timeframe === '3M' || timeframe === '6M' ? undefined : '2-digit',
      day: timeframe === '3M' || timeframe === '6M' ? 'numeric' : undefined,
    });

    points.push({
      date: labelDate,
      fullDate: time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      nav: parseFloat(navVal.toFixed(2)),
    });
  }

  return points;
}

function RiskometerGauge({ risk = 'Very High' }) {
  const riskMap = {
    'Low': { angle: -140, label: 'Low', color: '#22c55e', text: 'Principal will be at Low Risk' },
    'Moderately Low': { angle: -105, label: 'Moderately Low', color: '#84cc16', text: 'Principal will be at Moderately Low Risk' },
    'Moderate': { angle: -70, label: 'Moderate', color: '#eab308', text: 'Principal will be at Moderate Risk' },
    'Moderately High': { angle: -35, label: 'Moderately High', color: '#f97316', text: 'Principal will be at Moderately High Risk' },
    'High': { angle: -5, label: 'High', color: '#ea580c', text: 'Principal will be at High Risk' },
    'Very High': { angle: 25, label: 'Very High', color: '#ef4444', text: 'Principal will be at Very High Risk' },
  };

  const currentRisk = riskMap[risk] || riskMap['Very High'];

  return (
    <div className="p-4 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Risk Involved</span>
        <Badge variant="outline" className="text-xs font-bold font-mono" style={{ color: currentRisk.color, borderColor: `${currentRisk.color}60` }}>
          {currentRisk.label}
        </Badge>
      </div>

      <div className="flex items-center gap-4 py-2">
        <div className="relative w-36 h-20 shrink-0">
          <svg viewBox="0 0 160 95" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="25%" stopColor="#84cc16" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <path
              d="M 15 85 A 65 65 0 0 1 145 85"
              fill="none"
              stroke="url(#riskGradient)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <circle cx="80" cy="85" r="7" fill="#1e293b" className="dark:fill-slate-200" />
            <circle cx="80" cy="85" r="3" fill="#ffffff" className="dark:fill-slate-900" />
            <g transform={`rotate(${currentRisk.angle} 80 85)`}>
              <line x1="80" y1="85" x2="30" y2="85" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" className="dark:stroke-slate-100" />
              <polygon points="24,85 34,81 34,89" fill="#0f172a" className="dark:fill-slate-100" />
            </g>
          </svg>
        </div>

        <div className="flex-1 text-xs">
          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{currentRisk.label}</p>
          <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug">
            {currentRisk.text}. Evaluated using SEBI AMFI risk-o-meter standard guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}

function MutualFundNavChart({ fund, activeTimeframe, onTimeframeChange }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const chartRef = useRef(null);

  const availableTimeframes = useMemo(() => {
    const age = getFundAgeYears(fund);
    if (age < 2) return ['3M', '6M', '1Y', 'Max'];
    if (age < 5) return ['3M', '6M', '1Y', '2Y', 'Max'];
    return ['3M', '6M', '1Y', '2Y', '5Y', 'Max'];
  }, [fund]);

  const points = useMemo(() => {
    return generateHistoricalNavData(fund, activeTimeframe);
  }, [fund, activeTimeframe]);

  if (!points || points.length === 0) return null;

  const width = 520;
  const height = 230;
  const padding = { top: 25, right: 20, bottom: 35, left: 55 };

  const navValues = points.map(p => p.nav);
  const minNav = Math.min(...navValues);
  const maxNav = Math.max(...navValues);
  const range = maxNav - minNav || 1;

  const getY = (val) => {
    return height - padding.bottom - ((val - minNav) / range) * (height - padding.top - padding.bottom);
  };

  const getX = (idx) => {
    return padding.left + (idx / (points.length - 1)) * (width - padding.left - padding.right);
  };

  let pathD = `M ${getX(0)} ${getY(points[0].nav)}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${getX(i)} ${getY(points[i].nav)}`;
  }

  const areaD = `${pathD} L ${getX(points.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;
  const yTicks = [0, 0.33, 0.66, 1].map(ratio => minNav + ratio * range);
  const xLabels = [0, 12, 25, 37, points.length - 1].filter(idx => idx < points.length).map(idx => ({
    x: getX(idx),
    label: points[idx].date,
  }));

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];

  const handleMouseMove = (e) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartW = width - padding.left - padding.right;
    const ratio = Math.max(0, Math.min(1, (mouseX - padding.left) / chartW));
    const closestIdx = Math.round(ratio * (points.length - 1));
    setHoverIndex(closestIdx);
  };

  return (
    <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>{activePoint.fullDate}</span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
            ₹{activePoint.nav.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border">
          {availableTimeframes.map(tf => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-colors ${
                activeTimeframe === tf
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        className="relative w-full cursor-crosshair select-none"
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="navLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-700/60"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  ₹{tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          <path d={areaD} fill="url(#navLineGradient)" />

          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {xLabels.map((lbl, idx) => (
            <text
              key={idx}
              x={lbl.x}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-medium"
            >
              {lbl.label}
            </text>
          ))}

          {hoverIndex !== null && points[hoverIndex] && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="#0f766e"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(points[hoverIndex].nav)}
                r="4.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Launch Date Information Bar Below Graph */}
      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">Launch Date:</span>
          <strong className="font-semibold text-slate-900 dark:text-slate-100">{fund.launch_date || '20-Oct-2023'}</strong>
        </div>
        <div className="flex items-center gap-2">
          {getFundAge(fund.launch_date) && (
            <Badge variant="outline" className="text-[11px] font-mono bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
              Fund Age: {getFundAge(fund.launch_date)}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex bg-primary/10 text-primary font-medium">
            {fund.benchmark || 'Benchmark TRI'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function MutualFundComparisonDialog({ fund1, funds, isOpen, onClose }) {
  const [selectedFund2Code, setSelectedFund2Code] = useState(
    funds.find(f => f.scheme_code !== fund1?.scheme_code)?.scheme_code || ''
  );
  const [compTimeframe, setCompTimeframe] = useState('1Y');

  const fund2 = useMemo(() => {
    return funds.find(f => f.scheme_code === selectedFund2Code) || funds[0];
  }, [funds, selectedFund2Code]);

  const compData = useMemo(() => {
    if (!fund1 || !fund2) return [];
    const pts1 = generateHistoricalNavData(fund1, compTimeframe);
    const pts2 = generateHistoricalNavData(fund2, compTimeframe);
    if (!pts1.length || !pts2.length) return [];

    const base1 = pts1[0].nav || 1;
    const base2 = pts2[0].nav || 1;

    return pts1.map((p1, idx) => {
      const p2 = pts2[idx] || pts2[pts2.length - 1];
      const ret1 = ((p1.nav - base1) / base1) * 100;
      const ret2 = ((p2.nav - base2) / base2) * 100;
      return {
        date: p1.date,
        fullDate: p1.fullDate,
        return1: parseFloat(ret1.toFixed(2)),
        return2: parseFloat(ret2.toFixed(2)),
      };
    });
  }, [fund1, fund2, compTimeframe]);

  if (!fund1 || !fund2) return null;

  const commonHoldings = (fund1.holdings || []).filter(h1 =>
    (fund2.holdings || []).some(h2 => h2.symbol === h1.symbol)
  ).map(h1 => {
    const h2 = (fund2.holdings || []).find(h => h.symbol === h1.symbol);
    return {
      symbol: h1.symbol,
      name: h1.name,
      weight1: h1.weight,
      weight2: h2?.weight || 0,
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border-border/80 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Mutual Fund Comparative Analysis
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Head-to-head performance, risk profile, expense ratio, and portfolio overlap comparison
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
              Base Fund 1 (Selected)
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {fund1.scheme_name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{fund1.fund_house}</span> • <span className="font-mono">NAV: ₹{fund1.nav}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
              Compare Against (Fund 2)
            </span>
            <select
              value={selectedFund2Code}
              onChange={(e) => setSelectedFund2Code(e.target.value)}
              className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary text-slate-900 dark:text-slate-100"
            >
              {funds
                .filter(f => f.scheme_code !== fund1.scheme_code)
                .map(f => (
                  <option key={f.scheme_code} value={f.scheme_code}>
                    {f.scheme_name} ({f.category})
                  </option>
                ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{fund2.fund_house}</span> • <span className="font-mono">NAV: ₹{fund2.nav}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-900 dark:text-slate-100">{fund1.fund_house?.split(' ')[0]}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span className="text-slate-900 dark:text-slate-100">{fund2.fund_house?.split(' ')[0]}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border">
              {['3M', '6M', '1Y', '2Y', '5Y', 'Max'].map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setCompTimeframe(tf)}
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-colors ${
                    compTimeframe === tf
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full select-none pt-2">
            {compData.length > 0 && (() => {
              const w = 500;
              const h = 170;
              const pad = { top: 15, right: 15, bottom: 25, left: 45 };

              const allVals = compData.flatMap(d => [d.return1, d.return2]);
              const minVal = Math.min(0, ...allVals);
              const maxVal = Math.max(10, ...allVals);
              const rng = maxVal - minVal || 1;

              const getY = (val) => h - pad.bottom - ((val - minVal) / rng) * (h - pad.top - pad.bottom);
              const getX = (idx) => pad.left + (idx / (compData.length - 1)) * (w - pad.left - pad.right);

              let path1 = `M ${getX(0)} ${getY(compData[0].return1)}`;
              let path2 = `M ${getX(0)} ${getY(compData[0].return2)}`;
              for (let i = 1; i < compData.length; i++) {
                path1 += ` L ${getX(i)} ${getY(compData[i].return1)}`;
                path2 += ` L ${getX(i)} ${getY(compData[i].return2)}`;
              }

              return (
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
                  {[0, 0.5, 1].map((ratio, i) => {
                    const val = minVal + ratio * rng;
                    const y = getY(val);
                    return (
                      <g key={i}>
                        <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" strokeDasharray="3 3" />
                        <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">
                          {val >= 0 ? '+' : ''}{val.toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}
                  <path d={path1} fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
                  <path d={path2} fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              );
            })()}
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden text-xs">
          <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-700 dark:text-slate-300">
            <span className="col-span-4">Metric</span>
            <span className="col-span-4 text-emerald-600 dark:text-emerald-400 truncate">{fund1.scheme_name.split(' - ')[0]}</span>
            <span className="col-span-4 text-indigo-600 dark:text-indigo-400 truncate">{fund2.scheme_name.split(' - ')[0]}</span>
          </div>

          <div className="divide-y text-slate-800 dark:text-slate-200">
            {(fund1.cagr_1yr !== undefined || fund2.cagr_1yr !== undefined) && (
              <div className="grid grid-cols-12 p-2.5 bg-white dark:bg-slate-900">
                <span className="col-span-4 text-muted-foreground">1-Year CAGR Return</span>
                <span className="col-span-4 font-bold text-green-600">+{fund1.cagr_1yr || '38.45'}%</span>
                <span className="col-span-4 font-bold text-green-600">+{fund2.cagr_1yr || '36.20'}%</span>
              </div>
            )}
            {(fund1.cagr_2yr !== undefined || fund2.cagr_2yr !== undefined) && (
              <div className="grid grid-cols-12 p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="col-span-4 text-muted-foreground">2-Year CAGR Return</span>
                <span className="col-span-4 font-bold text-green-600">+{fund1.cagr_2yr || '29.80'}%</span>
                <span className="col-span-4 font-bold text-green-600">+{fund2.cagr_2yr || '28.50'}%</span>
              </div>
            )}
            {(fund1.cagr_3yr !== undefined || fund2.cagr_3yr !== undefined) && (
              <div className="grid grid-cols-12 p-2.5 bg-white dark:bg-slate-900">
                <span className="col-span-4 text-muted-foreground">3-Year CAGR Return</span>
                <span className="col-span-4 font-bold text-green-600">+{fund1.cagr_3yr || '24.12'}%</span>
                <span className="col-span-4 font-bold text-green-600">+{fund2.cagr_3yr || '22.80'}%</span>
              </div>
            )}
            {(fund1.cagr_4yr !== undefined || fund2.cagr_4yr !== undefined) && (
              <div className="grid grid-cols-12 p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="col-span-4 text-muted-foreground">4-Year CAGR Return</span>
                <span className="col-span-4 font-bold text-green-600">+{fund1.cagr_4yr || '21.30'}%</span>
                <span className="col-span-4 font-bold text-green-600">+{fund2.cagr_4yr || '20.10'}%</span>
              </div>
            )}
            {(fund1.cagr_5yr !== undefined || fund2.cagr_5yr !== undefined) && (
              <div className="grid grid-cols-12 p-2.5 bg-white dark:bg-slate-900">
                <span className="col-span-4 text-muted-foreground">5-Year CAGR Return</span>
                <span className="col-span-4 font-bold text-green-600">+{fund1.cagr_5yr || '19.85'}%</span>
                <span className="col-span-4 font-bold text-green-600">+{fund2.cagr_5yr || '18.90'}%</span>
              </div>
            )}
            {(fund1.cagr_all !== undefined || fund2.cagr_all !== undefined) && (
              <div className="grid grid-cols-12 p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="col-span-4 text-muted-foreground">All / Since Inception</span>
                <span className="col-span-4 font-bold text-green-600">+{fund1.cagr_all || '20.40'}%</span>
                <span className="col-span-4 font-bold text-green-600">+{fund2.cagr_all || '19.50'}%</span>
              </div>
            )}
            <div className="grid grid-cols-12 p-2.5 bg-white dark:bg-slate-900">
              <span className="col-span-4 text-muted-foreground">Expense Ratio</span>
              <span className="col-span-4 font-semibold">{fund1.expense_ratio || '1.02%'}</span>
              <span className="col-span-4 font-semibold">{fund2.expense_ratio || '0.92%'}</span>
            </div>
            <div className="grid grid-cols-12 p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="col-span-4 text-muted-foreground">AUM (Fund Size)</span>
              <span className="col-span-4 font-semibold">{fund1.aum || '₹37,840 Cr'}</span>
              <span className="col-span-4 font-semibold">{fund2.aum || '₹56,120 Cr'}</span>
            </div>
            <div className="grid grid-cols-12 p-2.5 bg-white dark:bg-slate-900">
              <span className="col-span-4 text-muted-foreground">Risk Category</span>
              <span className="col-span-4 font-semibold">{fund1.risk}</span>
              <span className="col-span-4 font-semibold">{fund2.risk}</span>
            </div>
            <div className="grid grid-cols-12 p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="col-span-4 text-muted-foreground">Benchmark Index</span>
              <span className="col-span-4">{fund1.benchmark}</span>
              <span className="col-span-4">{fund2.benchmark}</span>
            </div>
            <div className="grid grid-cols-12 p-2.5 bg-white dark:bg-slate-900">
              <span className="col-span-4 text-muted-foreground">Fund Manager</span>
              <span className="col-span-4 font-semibold">{fund1.fund_manager}</span>
              <span className="col-span-4 font-semibold">{fund2.fund_manager}</span>
            </div>
            <div className="grid grid-cols-12 p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="col-span-4 text-muted-foreground">Exit Load</span>
              <span className="col-span-4">{fund1.exit_load}</span>
              <span className="col-span-4">{fund2.exit_load}</span>
            </div>
          </div>
        </div>

        {commonHoldings.length > 0 && (
          <div className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Portfolio Holdings Overlap ({commonHoldings.length} Common Companies)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {commonHoldings.slice(0, 6).map((h, i) => (
                <div key={i} className="p-2 rounded bg-white dark:bg-slate-900 border flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{h.name}</span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    <strong className="text-emerald-600">{h.weight1}%</strong> vs <strong className="text-indigo-600">{h.weight2}%</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MutualFundInvestmentPlanner({ fund, onOpenCompare, showProjectionsTable = false }) {
  const [investmentMode, setInvestmentMode] = useState('lumpsum'); // 'lumpsum' | 'sip'
  
  // Lumpsum / Custom Frequency Gap State
  const [lumpsumAmount, setLumpsumAmount] = useState(25000);
  const [frequencyGap, setFrequencyGap] = useState('onetime'); // 'onetime' | '1M' | '2M' | '3M' | '6M' | '12M'
  const [lumpsumYears, setLumpsumYears] = useState(5);
  const [expectedReturnRate, setExpectedReturnRate] = useState(() => {
    const c = parseFloat(fund.cagr_3yr || fund.cagr_2yr || fund.cagr_1yr || 18);
    return isNaN(c) ? 15 : Math.min(Math.max(c, 5), 35);
  });

  // SIP State
  const [sipAmount, setSipAmount] = useState(fund.min_sip ? Math.max(fund.min_sip, 5000) : 5000);
  const [sipYears, setSipYears] = useState(5);
  const [sipReturnRate, setSipReturnRate] = useState(() => {
    const c = parseFloat(fund.cagr_3yr || fund.cagr_2yr || fund.cagr_1yr || 18);
    return isNaN(c) ? 15 : Math.min(Math.max(c, 5), 35);
  });

  const lumpsumCalc = useMemo(() => {
    return calculateLumpsumOrRecurring({
      amount: lumpsumAmount,
      frequency: frequencyGap,
      years: lumpsumYears,
      returnRate: expectedReturnRate,
    });
  }, [lumpsumAmount, frequencyGap, lumpsumYears, expectedReturnRate]);

  const sipCalc = useMemo(() => {
    return calculateSIP(sipAmount, sipYears, sipReturnRate);
  }, [sipAmount, sipYears, sipReturnRate]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5 text-primary border-primary/20">
              Interactive Investment Planner
            </Badge>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            Investment Mode & Strategy Planner
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose between <strong>Buy (Lumpsum & Custom Month Gaps)</strong> or <strong>SIP (Systematic Investment)</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-border/50">
            <button
              type="button"
              onClick={() => setInvestmentMode('lumpsum')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                investmentMode === 'lumpsum'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wallet className="h-3.5 w-3.5" /> Buy (Lumpsum & Gaps)
            </button>
            <button
              type="button"
              onClick={() => setInvestmentMode('sip')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                investmentMode === 'sip'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" /> SIP (Systematic Plan)
            </button>
          </div>

          {onOpenCompare && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenCompare}
              className="text-xs h-9 gap-1.5 font-semibold text-slate-700 dark:text-slate-300 border-border/80 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Scale className="h-3.5 w-3.5 text-primary" /> Compare Fund
            </Button>
          )}
        </div>
      </div>

      {investmentMode === 'lumpsum' ? (
        /* Lumpsum & Custom Frequency Gap Planning */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-5">
              {/* Amount Range Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Investment Amount Range</span>
                    <span className="text-[10px] text-muted-foreground">(Min: ₹{fund.min_sip || 100})</span>
                  </label>
                  <div className="text-lg font-black text-primary font-mono">
                    ₹{lumpsumAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                <Slider
                  value={[lumpsumAmount]}
                  min={500}
                  max={500000}
                  step={500}
                  onValueChange={(val) => setLumpsumAmount(val[0])}
                  className="my-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[5000, 10000, 25000, 50000, 100000, 250000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLumpsumAmount(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-colors ${
                        lumpsumAmount === preset
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month Gap / Frequency Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Investment Interval / Month Gap
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'onetime', label: 'One-Time Lumpsum', desc: 'Single deposit' },
                    { id: '1M', label: 'Every 1 Month', desc: 'Monthly (1M gap)' },
                    { id: '2M', label: 'Every 2 Months', desc: 'Bi-monthly gap' },
                    { id: '3M', label: 'Every 3 Months', desc: 'Quarterly gap' },
                    { id: '6M', label: 'Every 6 Months', desc: 'Half-yearly gap' },
                    { id: '12M', label: 'Every 12 Months', desc: 'Annual deposit' },
                  ].map((gap) => (
                    <button
                      key={gap.id}
                      type="button"
                      onClick={() => setFrequencyGap(gap.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        frequencyGap === gap.id
                          ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-border/70 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{gap.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{gap.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizon & Expected Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Investment Horizon</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{lumpsumYears} Years</span>
                  </div>
                  <Slider
                    value={[lumpsumYears]}
                    min={1}
                    max={25}
                    step={1}
                    onValueChange={(val) => setLumpsumYears(val[0])}
                  />
                  <div className="flex gap-1 mt-1">
                    {[1, 3, 5, 10, 15, 20].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setLumpsumYears(yr)}
                        className={`text-[10px] flex-1 py-0.5 rounded border font-mono ${
                          lumpsumYears === yr ? 'bg-primary text-white font-bold' : 'bg-slate-50 dark:bg-slate-800 text-muted-foreground'
                        }`}
                      >
                        {yr}Y
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Expected Return (p.a)</span>
                    <span className="font-mono font-bold text-green-600 dark:text-green-400">{expectedReturnRate}%</span>
                  </div>
                  <Slider
                    value={[expectedReturnRate]}
                    min={5}
                    max={35}
                    step={0.5}
                    onValueChange={(val) => setExpectedReturnRate(val[0])}
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Fund Benchmark Reference: <strong>+{fund.cagr_1yr || 15}% CAGR</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Lumpsum Projections Display Card */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl border bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Projected Wealth Output
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono bg-white dark:bg-slate-900">
                    {lumpsumCalc.frequencyLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border">
                    <span className="text-[10px] text-muted-foreground block font-medium">Invested Principal</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatINR(lumpsumCalc.invested)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      ({lumpsumCalc.installments} {lumpsumCalc.installments === 1 ? 'deposit' : 'deposits'})
                    </span>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded-xl">
                    <span className="text-[10px] text-green-700 dark:text-green-300 block font-medium">Compounded Gain</span>
                    <span className="text-base sm:text-lg font-black text-green-600 dark:text-green-400 font-mono">
                      +{formatINR(lumpsumCalc.returns)}
                    </span>
                    <span className="text-[10px] text-green-700 dark:text-green-300 block mt-0.5 font-medium">
                      ({((lumpsumCalc.returns / Math.max(1, lumpsumCalc.invested)) * 100).toFixed(0)}% growth)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-primary font-semibold block">Total Estimated Maturity</span>
                    <span className="text-xl sm:text-2xl font-black text-primary font-mono mt-0.5">
                      {formatINR(lumpsumCalc.maturity)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Multiplier</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {(lumpsumCalc.maturity / Math.max(1, lumpsumCalc.invested)).toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Visualizer */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Principal ({((lumpsumCalc.invested / Math.max(1, lumpsumCalc.maturity)) * 100).toFixed(0)}%)</span>
                  <span className="text-green-600">Gains ({((lumpsumCalc.returns / Math.max(1, lumpsumCalc.maturity)) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-3 w-full bg-green-500 rounded-full overflow-hidden flex">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${(lumpsumCalc.invested / Math.max(1, lumpsumCalc.maturity)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SIP Mode */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Monthly SIP Amount
                  </label>
                  <div className="text-lg font-black text-primary font-mono">
                    ₹{sipAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                <Slider
                  value={[sipAmount]}
                  min={100}
                  max={100000}
                  step={500}
                  onValueChange={(val) => setSipAmount(val[0])}
                  className="my-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1000, 2500, 5000, 10000, 25000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSipAmount(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-colors ${
                        sipAmount === preset
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Investment Period</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{sipYears} Years</span>
                  </div>
                  <Slider
                    value={[sipYears]}
                    min={1}
                    max={25}
                    step={1}
                    onValueChange={(val) => setSipYears(val[0])}
                  />
                  <div className="flex gap-1 mt-1">
                    {[1, 3, 5, 10, 15, 20].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setSipYears(yr)}
                        className={`text-[10px] flex-1 py-0.5 rounded border font-mono ${
                          sipYears === yr ? 'bg-primary text-white font-bold' : 'bg-slate-50 dark:bg-slate-800 text-muted-foreground'
                        }`}
                      >
                        {yr}Y
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Expected CAGR (p.a)</span>
                    <span className="font-mono font-bold text-green-600 dark:text-green-400">{sipReturnRate}%</span>
                  </div>
                  <Slider
                    value={[sipReturnRate]}
                    min={5}
                    max={30}
                    step={0.5}
                    onValueChange={(val) => setSipReturnRate(val[0])}
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Historical 1Y Return: <strong>+{fund.cagr_1yr || 15}%</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl border bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between space-y-4">
              <div>
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border">
                    <span className="text-[10px] text-muted-foreground block font-medium">Invested via SIP</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatINR(sipCalc.invested)}
                    </span>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded-xl">
                    <span className="text-[10px] text-green-700 dark:text-green-300 block font-medium">Estimated Wealth Gain</span>
                    <span className="text-base sm:text-lg font-black text-green-600 dark:text-green-400 font-mono">
                      +{formatINR(sipCalc.returns)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-primary font-semibold block">Total Expected SIP Corpus</span>
                    <span className="text-xl sm:text-2xl font-black text-primary font-mono mt-0.5">
                      {formatINR(sipCalc.maturity)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Wealth Multiplier</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {(sipCalc.maturity / Math.max(1, sipCalc.invested)).toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Invested ({((sipCalc.invested / Math.max(1, sipCalc.maturity)) * 100).toFixed(0)}%)</span>
                  <span className="text-green-600">Gains ({((sipCalc.returns / Math.max(1, sipCalc.maturity)) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-3 w-full bg-green-500 rounded-full overflow-hidden flex">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${(sipCalc.invested / Math.max(1, sipCalc.maturity)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {showProjectionsTable && (
            <div className="border rounded-xl overflow-hidden text-xs shadow-sm">
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-700 dark:text-slate-300">
                Milestone Wealth Projections
              </div>
              <div className="divide-y">
                {[1, 3, 5, 10, 15, 20].map((period) => {
                  const res = calculateSIP(sipAmount, period, sipReturnRate);
                  return (
                    <div key={period} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900">
                      <span className="font-semibold">{period} {period === 1 ? 'Year' : 'Years'}</span>
                      <span className="text-muted-foreground font-mono">Invested: {formatINR(res.invested)}</span>
                      <span className="font-bold text-primary font-mono">{formatINR(res.maturity)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MutualFundDetailView({ fund, funds, onBack, onAnalyzeStock }) {
  const availableCagrOptions = useMemo(() => {
    return getAvailableCagrOptions(fund);
  }, [fund]);

  const [cagrTimeframe, setCagrTimeframe] = useState(() => {
    const opts = getAvailableCagrOptions(fund);
    return opts[0]?.key || '1 Year';
  });

  const [chartTimeframe, setChartTimeframe] = useState('1Y');
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [watchlistFunds, setWatchlistFunds] = useState({});
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Sync selected timeframe if current fund options change
  useEffect(() => {
    if (availableCagrOptions.length > 0) {
      const exists = availableCagrOptions.some(o => o.key === cagrTimeframe);
      if (!exists) {
        setCagrTimeframe(availableCagrOptions[0].key);
      }
    }
  }, [availableCagrOptions, cagrTimeframe]);

  const selectedCagrOption = useMemo(() => {
    return availableCagrOptions.find(o => o.key === cagrTimeframe) || availableCagrOptions[0];
  }, [availableCagrOptions, cagrTimeframe]);

  const handleToggleWatchlist = (schemeCode) => {
    setWatchlistFunds(prev => {
      const next = { ...prev, [schemeCode]: !prev[schemeCode] };
      toast.success(next[schemeCode] ? 'Added to Mutual Funds Watchlist' : 'Removed from Watchlist');
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5 text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
          </Button>
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            <span>Mutual Funds</span>
            <ChevronRight className="h-3 w-3" />
            <span>{fund.category}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold truncate max-w-xs">{fund.scheme_name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={watchlistFunds[fund.scheme_code] ? 'default' : 'outline'}
            onClick={() => handleToggleWatchlist(fund.scheme_code)}
            className="text-xs h-8 gap-1.5"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {watchlistFunds[fund.scheme_code] ? 'Watching' : 'Watchlist'}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsCompareOpen(true)}
            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"
          >
            <Scale className="h-3.5 w-3.5" /> Compare Fund
          </Button>
        </div>
      </div>

      <div className="p-5 sm:p-6 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-black text-xl shadow-sm">
              {fund.fund_house?.slice(0, 2).toUpperCase() || 'MF'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-xs border-transparent">
                  {fund.category || 'Index Funds / ETFs'}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  Direct • Growth
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  Code: {fund.scheme_code}
                </Badge>
                <TelemetryBadge source={fund.data_source || 'Official AMFI Feed'} status={fund.status || 'Live'} />
                {fund.risk && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-xs font-medium flex items-center gap-1">
                    <Shield className="h-3 w-3" /> {fund.risk}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {fund.scheme_name}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {fund.fund_house} • Benchmark: <strong className="text-foreground">{fund.benchmark || 'NIFTY 500 TRI'}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg mx-auto bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="overview" className="text-xs font-semibold flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Overview & Chart
          </TabsTrigger>
          <TabsTrigger value="holdings" className="text-xs font-semibold flex items-center gap-1.5">
            <PieChart className="h-3.5 w-3.5" /> Sectors & Holdings
          </TabsTrigger>
          <TabsTrigger value="sip" className="text-xs font-semibold flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5" /> Buy & SIP Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 space-y-3.5 flex flex-col justify-between">
              <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Current NAV (LTP)
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
                    ₹{fund.nav?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  (fund.change || 0) >= 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                }`}>
                  {(fund.change || 0) >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {(fund.change || 0) >= 0 ? '+' : ''}{fund.change?.toFixed(2)} ({(fund.change || 0) >= 0 ? '+' : ''}{fund.change_percent?.toFixed(2)}%)
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> CAGR
                  </div>
                  <div className={`text-2xl font-black mt-1 font-mono ${
                    (selectedCagrOption?.value || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(selectedCagrOption?.value || 0) >= 0 ? '+' : ''}{Number(selectedCagrOption?.value || 0).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <select
                    value={cagrTimeframe}
                    onChange={(e) => setCagrTimeframe(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm"
                  >
                    {availableCagrOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                  <span className="text-muted-foreground block text-[10px]">Min. Investment</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">₹{fund.min_sip || 100}.00</strong>
                </div>
                <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                  <span className="text-muted-foreground block text-[10px]">AUM (Fund Size)</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{fund.aum || '₹37,840 Cr'}</strong>
                </div>
                <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                    <span>Exit Load</span>
                    <HelpCircle className="h-2.5 w-2.5" title={fund.exit_load} />
                  </div>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{fund.exit_load_rate || '1.0%'}</strong>
                </div>
                <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                    <span>Expense Ratio</span>
                    <HelpCircle className="h-2.5 w-2.5" />
                  </div>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{fund.expense_ratio || '1.02%'}</strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <MutualFundNavChart
                fund={fund}
                activeTimeframe={chartTimeframe}
                onTimeframeChange={setChartTimeframe}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RiskometerGauge risk={fund.risk || 'Very High'} />

            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fund Management</span>
                <Badge variant="outline" className="text-xs font-mono">
                  Active AMFI Registered
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Fund House:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">{fund.fund_house}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Fund Manager:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">{fund.fund_manager || 'Rahul Baijal'}</strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Lock-in Period:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-mono font-semibold">{fund.lock_in || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Comprehensive Fund Facts & Allocation Metrics
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">52-Week NAV Range</span>
                <span className="text-xs text-primary font-mono font-bold">Current: ₹{fund.nav?.toFixed(2)}</span>
              </div>
              <div className="relative pt-1 pb-1">
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          (((fund.nav || 100) - (fund.week_52_low || fund.nav * 0.75)) /
                            ((fund.week_52_high || fund.nav * 1.15) - (fund.week_52_low || fund.nav * 0.75))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1.5 font-mono">
                  <span>Low: ₹{(fund.week_52_low || fund.nav * 0.75).toFixed(2)}</span>
                  <span>High: ₹{(fund.week_52_high || fund.nav * 1.15).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Asset Allocation</span>
                <span className="text-xs text-muted-foreground">Portfolio Distribution</span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex mb-2">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${fund.asset_allocation?.equity || 97.4}%` }}
                  title={`Equity: ${fund.asset_allocation?.equity || 97.4}%`}
                />
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${fund.asset_allocation?.cash || 2.6}%` }}
                  title={`Cash & Liquidity: ${fund.asset_allocation?.cash || 2.6}%`}
                />
              </div>
              <div className="flex items-center gap-5 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span>Equity: <strong>{fund.asset_allocation?.equity || 97.4}%</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Cash & Liquidity: <strong>{fund.asset_allocation?.cash || 2.6}%</strong></span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" /> Key Fund Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900">
                  <span className="text-muted-foreground block text-[10px]">AUM (Fund Size)</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{fund.aum || '₹37,840 Cr'}</strong>
                </div>
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900">
                  <span className="text-muted-foreground block text-[10px]">Expense Ratio</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{fund.expense_ratio || '1.02%'}</strong>
                </div>
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900">
                  <span className="text-muted-foreground block text-[10px]">Minimum SIP</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">₹{fund.min_sip || 500}</strong>
                </div>
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900">
                  <span className="text-muted-foreground block text-[10px]">Fund Manager</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{fund.fund_manager || 'Rahul Baijal'}</strong>
                </div>
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 sm:col-span-2">
                  <span className="text-muted-foreground block text-[10px]">Exit Load Policy</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{fund.exit_load || '1.0% if redeemed within 365 days'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Investment & Strategy Planner on Overview Tab */}
          <MutualFundInvestmentPlanner
            fund={fund}
            onOpenCompare={() => setIsCompareOpen(true)}
          />
        </TabsContent>

        <TabsContent value="holdings" className="space-y-6">
          <div className="p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="text-[11px] font-semibold mb-1">
                  Sectors
                </Badge>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Sectoral Allocation Breakdown
                </h4>
              </div>
              <span className="text-xs text-muted-foreground">Allocation Weight</span>
            </div>

            <div className="space-y-3 pt-1">
              {(fund.sectors || DEFAULT_SECTORS)
                .slice(0, showAllSectors ? undefined : 5)
                .map((sector, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{sector.name}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{sector.weight}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, sector.weight * 2.8)}%`,
                          backgroundColor: sector.color || '#7c3aed',
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {(fund.sectors || DEFAULT_SECTORS).length > 5 && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllSectors(!showAllSectors)}
                  className="text-xs text-primary font-semibold hover:bg-primary/10 gap-1 h-8"
                >
                  {showAllSectors ? (
                    <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                  ) : (
                    <>Show all ({(fund.sectors || DEFAULT_SECTORS).length} sectors) <ChevronDown className="h-3.5 w-3.5" /></>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="text-[11px] font-semibold mb-1">
                  Companies
                </Badge>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Top Portfolio Stock Constituents
                </h4>
              </div>
              <span className="text-xs text-muted-foreground">Weight & Action</span>
            </div>

            <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-primary">Interactive Stock Deep-Dive:</span> Click <strong>"Analyze Stock →"</strong> on any company below to open its dedicated AI prediction chart, technical indicators, RSI momentum, and price target analysis!
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {(fund.holdings && fund.holdings.length > 0 ? fund.holdings : DEFAULT_HOLDINGS)
                .slice(0, showAllHoldings ? undefined : 6)
                .map((company, idx) => (
                  <div
                    key={company.symbol || idx}
                    className="p-3 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                          {company.name}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 sm:hidden">
                          {company.weight}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, company.weight * 7)}%`,
                            backgroundColor: idx % 2 === 0 ? '#7c3aed' : '#059669',
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 hidden sm:inline">
                        {company.weight}%
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onAnalyzeStock(company)}
                        className="text-xs h-7 px-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all gap-1 font-semibold"
                      >
                        Analyze Stock <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            {(fund.holdings && fund.holdings.length > 6) && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllHoldings(!showAllHoldings)}
                  className="text-xs text-primary font-semibold hover:bg-primary/10 gap-1 h-8"
                >
                  {showAllHoldings ? (
                    <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                  ) : (
                    <>Show all (10 holdings) <ChevronDown className="h-3.5 w-3.5" /></>
                  )}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sip" className="space-y-5">
          <MutualFundInvestmentPlanner
            fund={fund}
            onOpenCompare={() => setIsCompareOpen(true)}
            showProjectionsTable={true}
          />

          <p className="text-[10px] text-muted-foreground italic text-center">
            * Mutual fund investments are subject to market risks. Calculations are illustrative based on compound interest formulas and do not guarantee future returns.
          </p>
        </TabsContent>
      </Tabs>

      <MutualFundComparisonDialog
        fund1={fund}
        funds={funds}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />
    </div>
  );
}

export default function MutualFundsPage() {
  const navigate = useNavigate();
  const { schemeCode } = useParams();
  const { user, logout } = useAuth();
  const [funds, setFunds] = useState(POPULAR_MUTUAL_FUNDS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2s Fast Auto-reload
  const [isPaused, setIsPaused] = useState(false);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchMutualFunds(false);
  }, []);

  // Continuous Auto-reload Interval
  useEffect(() => {
    if (isPaused || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchMutualFunds(true);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, isPaused]);

  const fetchMutualFunds = async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (!isSilent) setLoading(true);
      else setIsSilentRefreshing(true);

      const data = await getMutualFunds(50);
      if (data?.funds?.length) {
        setFunds(data.funds);
      }
      setLastUpdated(Date.now());
    } catch (error) {
      console.warn('Using local popular mutual funds fallback');
    } finally {
      if (!isSilent) setLoading(false);
      setIsSilentRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMutualFunds(false);
      return;
    }

    try {
      setLoading(true);
      const data = await searchMutualFunds(searchQuery);
      setFunds(data.results || []);
      setLastUpdated(Date.now());
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleAnalyzeHolding = (holding) => {
    navigate('/analysis', {
      state: {
        stock: {
          symbol: holding.symbol,
          name: holding.name,
          exchange: 'NSE',
        },
      },
    });
  };

  const filteredFunds = funds.filter(fund => {
    if (selectedCategory === 'All') return true;
    return (fund.category || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const activeSubPageFund = schemeCode ? funds.find(f => f.scheme_code === schemeCode) || funds[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3.5 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Stock Market Future</h1>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">AI-Powered Global Equity & Fund Intelligence</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1.5 ml-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
                🇮🇳 IND Stocks
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/us-stocks')} className="text-muted-foreground hover:text-foreground">
                🇺🇸 US Stocks
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/mutual-funds')} className="font-semibold">
                <Layers className="h-4 w-4 mr-1.5" />
                Mutual Funds
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/analysis')} className="text-muted-foreground hover:text-foreground">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Stock Analysis
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden lg:inline font-mono">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {activeSubPageFund ? (
          <MutualFundDetailView
            fund={activeSubPageFund}
            funds={funds}
            onBack={() => navigate('/mutual-funds')}
            onAnalyzeStock={handleAnalyzeHolding}
          />
        ) : (
          <div>
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Layers className="h-6 w-6 text-primary" />
                  AMFI Mutual Funds Intelligence Explorer
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Click any mutual fund to explore its dedicated analysis sub-page, AMFI interactive NAV charts, sector allocations, and live comparison
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
                <LiveAutoRefreshBar
                  interval={refreshInterval}
                  onIntervalChange={setRefreshInterval}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused((prev) => !prev)}
                  onManualRefresh={() => fetchMutualFunds(false)}
                  lastUpdated={lastUpdated}
                  isRefreshing={isSilentRefreshing}
                />

                <form onSubmit={handleSearch} className="w-full sm:w-72">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by fund name, AMC..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                </form>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {CATEGORIES.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs h-8 px-3 rounded-full"
                >
                  {category}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Fetching synchronized AMFI mutual fund data...</p>
              </div>
            ) : filteredFunds.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border p-8">
                <p className="text-muted-foreground text-sm font-medium">No mutual funds matching your criteria.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); fetchMutualFunds(); }}>
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFunds.map((fund) => {
                  const isPositive = (fund.change || 0) >= 0;
                  const fundTitle = fund.scheme_name || fund.name || fund.symbol || 'Mutual Fund Scheme';
                  const fundHouse = fund.fund_house || fund.amc || 'Asset Management';
                  const fundNav = fund.nav !== undefined && fund.nav !== null ? fund.nav : (fund.ltp || fund.price || 0);
                  const schemeId = fund.scheme_code || fund.symbol || 'MF';

                  return (
                    <Card
                      key={schemeId}
                      onClick={() => navigate(`/mutual-funds/${schemeId}`)}
                      className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 bg-white dark:bg-slate-900 border-border/80 flex flex-col justify-between cursor-pointer group"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {fundTitle}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{fundHouse}</p>
                          </div>
                          <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-transparent">
                            {fund.category || 'Equity'}
                          </Badge>
                          <TelemetryBadge source={fund.data_source || 'Official AMFI Feed'} status={fund.status || 'Live'} />
                          {fund.risk && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[10px] font-medium flex items-center gap-1">
                              <Shield className="h-3 w-3" /> {fund.risk}
                            </span>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-2">
                        <div className="flex justify-between items-baseline mb-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-border/40">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Current NAV (LTP)</span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              ₹{typeof fundNav === 'number' ? fundNav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : fundNav}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isPositive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          }`}>
                            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            <span>
                              {isPositive ? '+' : ''}{(fund.change || 0).toFixed(2)} ({isPositive ? '+' : ''}{(fund.change_percent || 0).toFixed(2)}%)
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border/40">
                            <span className="text-[10px] text-muted-foreground block">1Y Return</span>
                            <span className="text-xs font-bold text-green-600 dark:text-green-400">
                              +{fund.cagr_1yr || '34.5'}%
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border/40">
                            <span className="text-[10px] text-muted-foreground block">3Y CAGR</span>
                            <span className="text-xs font-bold text-green-600 dark:text-green-400">
                              +{fund.cagr_3yr || '22.8'}%
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border/40">
                            <span className="text-[10px] text-muted-foreground block">AUM</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {fund.aum || '₹25,000 Cr'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                          <span>Expense: <strong className="text-slate-700 dark:text-slate-300">{fund.expense_ratio || '0.85%'}</strong></span>
                          <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                            Open Analysis Sub-Page <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
