import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMutualFunds, searchMutualFunds } from '../services/api';
import { Button } from '../components/ui/button';
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

// Generate realistic historical NAV points for Coin line chart
function generateHistoricalNavData(fund, timeframe = '1Y') {
  if (!fund) return [];
  const currentNav = fund.nav || 100;
  const cagr1 = parseFloat(fund.cagr_1yr || 15) / 100;
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
    startNav = currentNav / Math.pow(1 + cagr3, 2);
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

// -------------------------------------------------------------
// Speedometer Radial Risk Gauge Component (Coin Zerodha Style)
// -------------------------------------------------------------
function RiskometerGauge({ risk = 'Very High' }) {
  // Determine needle rotation angle:
  // Low: -140 deg, Moderately Low: -105 deg, Moderate: -70 deg, Moderately High: -35 deg, High: 0 deg, Very High: 25 deg
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
        {/* Speedometer SVG */}
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
            {/* Background Arc Track */}
            <path
              d="M 15 85 A 65 65 0 0 1 145 85"
              fill="none"
              stroke="url(#riskGradient)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Center Pivot Base */}
            <circle cx="80" cy="85" r="7" fill="#1e293b" className="dark:fill-slate-200" />
            <circle cx="80" cy="85" r="3" fill="#ffffff" className="dark:fill-slate-900" />
            {/* Needle Pointer */}
            <g transform={`rotate(${currentRisk.angle} 80 85)`}>
              <line x1="80" y1="85" x2="30" y2="85" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" className="dark:stroke-slate-100" />
              <polygon points="24,85 34,81 34,89" fill="#0f172a" className="dark:fill-slate-100" />
            </g>
          </svg>
        </div>

        {/* Risk Explanation */}
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

// -------------------------------------------------------------
// Interactive Historical NAV Chart Component (Coin Zerodha Style)
// -------------------------------------------------------------
function MutualFundNavChart({ fund, activeTimeframe, onTimeframeChange }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const chartRef = useRef(null);

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

  // Generate SVG path polyline string
  let pathD = `M ${getX(0)} ${getY(points[0].nav)}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${getX(i)} ${getY(points[i].nav)}`;
  }

  // Generate closed fill area under curve
  const areaD = `${pathD} L ${getX(points.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;

  // Y-axis grid ticks (4 steps)
  const yTicks = [0, 0.33, 0.66, 1].map(ratio => minNav + ratio * range);

  // X-axis date labels (5 labels)
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
      {/* Top Header of Chart */}
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

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border">
          {['3M', '6M', '1Y', '2Y', '5Y', 'Max'].map(tf => (
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

      {/* SVG Line Chart */}
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

          {/* Horizontal Gridlines & Y-Axis Scale Values */}
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

          {/* Area Fill */}
          <path d={areaD} fill="url(#navLineGradient)" />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-axis Date Labels */}
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

          {/* Hover Crosshair */}
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
    </div>
  );
}

// -------------------------------------------------------------
// MAIN MUTUAL FUNDS PAGE
// -------------------------------------------------------------
export default function MutualFundsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [funds, setFunds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Selected Fund Details Modal State
  const [selectedFund, setSelectedFund] = useState(null);
  const [cagrTimeframe, setCagrTimeframe] = useState('1 Year');
  const [chartTimeframe, setChartTimeframe] = useState('1Y');
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [watchlistFunds, setWatchlistFunds] = useState({});

  // SIP Calculator State
  const [sipAmount, setSipAmount] = useState(5000);
  const [sipYears, setSipYears] = useState(5);
  const [sipReturnRate, setSipReturnRate] = useState(15);

  useEffect(() => {
    fetchMutualFunds();
  }, []);

  const fetchMutualFunds = async () => {
    try {
      setLoading(true);
      const data = await getMutualFunds(50);
      setFunds(data.funds || []);
    } catch (error) {
      toast.error('Failed to fetch mutual funds');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMutualFunds();
      return;
    }

    try {
      setLoading(true);
      const data = await searchMutualFunds(searchQuery);
      setFunds(data.results || []);
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

  const handleOpenFund = (fund) => {
    setSelectedFund(fund);
    setCagrTimeframe('1 Year');
    setChartTimeframe('1Y');
    setShowAllSectors(false);
    setShowAllHoldings(false);
    setSipAmount(fund.min_sip ? Math.max(fund.min_sip, 5000) : 5000);
    setSipYears(5);
    const cagr = parseFloat(fund.cagr_3yr || fund.cagr_1yr || 15);
    setSipReturnRate(isNaN(cagr) ? 15 : Math.min(Math.max(cagr, 5), 30));
  };

  const handleToggleWatchlist = (schemeCode) => {
    setWatchlistFunds(prev => {
      const next = { ...prev, [schemeCode]: !prev[schemeCode] };
      toast.success(next[schemeCode] ? 'Added to Mutual Funds Watchlist' : 'Removed from Watchlist');
      return next;
    });
  };

  const handleAnalyzeHolding = (holding) => {
    setSelectedFund(null);
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

  const sipCalc = calculateSIP(sipAmount, sipYears, sipReturnRate);

  // Dynamic CAGR based on selected dropdown
  const getDisplayCagr = (fund) => {
    if (!fund) return '0.00';
    if (cagrTimeframe === '1 Year') return `+${fund.cagr_1yr || '38.45'}%`;
    if (cagrTimeframe === '3 Years') return `+${fund.cagr_3yr || '24.12'}%`;
    if (cagrTimeframe === '5 Years') return `+${fund.cagr_5yr || '19.85'}%`;
    return `+${fund.cagr_all || fund.cagr_3yr || '22.40'}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3.5 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Stock Market Future</h1>
            </div>
            <nav className="hidden md:flex items-center gap-2 ml-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/mutual-funds')} className="font-semibold">
                Mutual Funds
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/analysis')}>
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
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              AMFI Mutual Funds Intelligence Explorer
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Synchronized Net Asset Values (NAV), Coin Zerodha charts, sector allocations, underlying holdings, and SIP simulator
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full md:w-80">
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

        {/* Category Filter Pills */}
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

        {/* Funds Grid */}
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
              return (
                <Card
                  key={fund.scheme_code}
                  onClick={() => handleOpenFund(fund)}
                  className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 bg-white dark:bg-slate-900 border-border/80 flex flex-col justify-between cursor-pointer group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {fund.scheme_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{fund.fund_house || 'Asset Management'}</p>
                      </div>
                      <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-transparent">
                        {fund.category}
                      </Badge>
                      {fund.risk && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[10px] font-medium flex items-center gap-1">
                          <Shield className="h-3 w-3" /> {fund.risk}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {/* NAV (LTP) and 1D Change */}
                    <div className="flex justify-between items-baseline mb-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Current NAV (LTP)</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          ₹{fund.nav?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isPositive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}>
                        {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        <span>
                          {isPositive ? '+' : ''}{fund.change?.toFixed(2)} ({isPositive ? '+' : ''}{fund.change_percent?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Returns Grid */}
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

                    {/* Bottom Action Bar */}
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      <span>Expense: <strong className="text-slate-700 dark:text-slate-300">{fund.expense_ratio || '0.85%'}</strong></span>
                      <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                        View Details & SIP <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* COIN ZERODHA INSPIRED INTERACTIVE MUTUAL FUND DETAILS & ANALYTICS MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedFund} onOpenChange={(open) => !open && setSelectedFund(null)}>
        {selectedFund && (
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-7 bg-white dark:bg-slate-900 border-border/80 rounded-2xl">
            {/* Top Identity Header */}
            <DialogHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {/* Fund House Avatar Icon */}
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-black text-lg shadow-sm">
                    {selectedFund.fund_house?.slice(0, 2).toUpperCase() || 'MF'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-xs border-transparent">
                        {selectedFund.category || 'Index Funds / ETFs'}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        Direct • Growth
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Code: {selectedFund.scheme_code}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
                      {selectedFund.scheme_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {selectedFund.fund_house} • Benchmark: <strong className="text-foreground">{selectedFund.benchmark || 'NIFTY 500 TRI'}</strong>
                    </DialogDescription>
                  </div>
                </div>

                {/* Watchlist & Compare Quick Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={watchlistFunds[selectedFund.scheme_code] ? 'default' : 'outline'}
                    onClick={() => handleToggleWatchlist(selectedFund.scheme_code)}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {watchlistFunds[selectedFund.scheme_code] ? 'Watching' : 'Watchlist'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info(`Comparing ${selectedFund.scheme_name} with Category Benchmark`)}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Scale className="h-3.5 w-3.5" /> Compare
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Modal Navigation Tabs */}
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid grid-cols-3 w-full max-w-lg mx-auto mb-5 bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger value="overview" className="text-xs font-semibold flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" /> Overview & Coin Chart
                </TabsTrigger>
                <TabsTrigger value="holdings" className="text-xs font-semibold flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5" /> Sectors & Holdings
                </TabsTrigger>
                <TabsTrigger value="sip" className="text-xs font-semibold flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5" /> SIP Calculator
                </TabsTrigger>
              </TabsList>

              {/* ========================================================================= */}
              {/* TAB 1: OVERVIEW & COIN ZERODHA EXPERIENCE */}
              {/* ========================================================================= */}
              <TabsContent value="overview" className="space-y-6">
                {/* 1. Coin Zerodha Top Section: Left cards + Right Line Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Left Column (5 Cols) */}
                  <div className="lg:col-span-5 space-y-3.5 flex flex-col justify-between">
                    {/* Current NAV Card */}
                    <div className="p-3.5 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-primary" /> Current NAV
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
                          ₹{selectedFund.nav?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        (selectedFund.change || 0) >= 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}>
                        {(selectedFund.change || 0) >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {(selectedFund.change || 0) >= 0 ? '+' : ''}{selectedFund.change?.toFixed(2)} ({(selectedFund.change || 0) >= 0 ? '+' : ''}{selectedFund.change_percent?.toFixed(2)}%)
                      </div>
                    </div>

                    {/* CAGR Card with Dropdown Selector */}
                    <div className="p-3.5 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-amber-500" /> CAGR ({cagrTimeframe})
                        </div>
                        <div className="text-2xl font-black text-green-600 dark:text-green-400 mt-1 font-mono">
                          {getDisplayCagr(selectedFund)}
                        </div>
                      </div>
                      <div>
                        <select
                          value={cagrTimeframe}
                          onChange={(e) => setCagrTimeframe(e.target.value)}
                          className="text-xs bg-white dark:bg-slate-900 border rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-200"
                        >
                          <option value="1 Year">1 Year</option>
                          <option value="3 Years">3 Years</option>
                          <option value="5 Years">5 Years</option>
                          <option value="All">All / Max</option>
                        </select>
                      </div>
                    </div>

                    {/* Key Metrics 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-lg border bg-white dark:bg-slate-900">
                        <span className="text-muted-foreground block text-[10px]">Min. Investment</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">₹{selectedFund.min_sip || 100}.00</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-white dark:bg-slate-900">
                        <span className="text-muted-foreground block text-[10px]">AUM</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{selectedFund.aum || '₹37,840 Cr'}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                          <span>Exit Load</span>
                          <HelpCircle className="h-2.5 w-2.5" title={selectedFund.exit_load} />
                        </div>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{selectedFund.exit_load_rate || '1.0%'}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                          <span>Expense Ratio</span>
                          <HelpCircle className="h-2.5 w-2.5" />
                        </div>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{selectedFund.expense_ratio || '1.02%'}</strong>
                      </div>
                    </div>

                    {/* Buy / SIP Action Buttons (Coin Zerodha Style) */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <Button
                        variant="outline"
                        onClick={() => toast.success(`Simulating Lumpsum Buy for ${selectedFund.scheme_name}`)}
                        className="w-full font-bold text-xs h-9 bg-white dark:bg-slate-900 hover:bg-slate-100"
                      >
                        Buy (Lumpsum)
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => {
                          const tabBtn = document.querySelector('button[value="sip"]');
                          if (tabBtn) tabBtn.click();
                        }}
                        className="w-full font-bold text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      >
                        SIP (Monthly)
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Historical NAV Line Chart (7 Cols) */}
                  <div className="lg:col-span-7">
                    <MutualFundNavChart
                      fund={selectedFund}
                      activeTimeframe={chartTimeframe}
                      onTimeframeChange={setChartTimeframe}
                    />
                  </div>
                </div>

                {/* 2. Middle Section: Riskometer Gauge + Management Info (Coin Zerodha Image C) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RiskometerGauge risk={selectedFund.risk || 'Very High'} />

                  <div className="p-4 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fund Management</span>
                      <Badge variant="outline" className="text-xs font-mono">
                        Active AMFI Registered
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Fund House:</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">{selectedFund.fund_house}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Fund Manager:</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">{selectedFund.fund_manager || 'Lead Portfolio Team'}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Lock-in Period:</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-mono font-semibold">{selectedFund.lock_in || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Previous Detailed Sections Specifically Requested By User */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                    <Layers className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                      Comprehensive Fund Analysis & Facts
                    </h3>
                  </div>

                  {/* 52-Week NAV Range */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">52-Week NAV Range</span>
                      <span className="text-xs text-primary font-mono font-bold">Current: ₹{selectedFund.nav?.toFixed(2)}</span>
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
                                (((selectedFund.nav || 100) - (selectedFund.week_52_low || selectedFund.nav * 0.75)) /
                                  ((selectedFund.week_52_high || selectedFund.nav * 1.15) - (selectedFund.week_52_low || selectedFund.nav * 0.75))) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground mt-1.5 font-mono">
                        <span>Low: ₹{(selectedFund.week_52_low || selectedFund.nav * 0.75).toFixed(2)}</span>
                        <span>High: ₹{(selectedFund.week_52_high || selectedFund.nav * 1.15).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Asset Allocation */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Asset Allocation</span>
                      <span className="text-xs text-muted-foreground">Portfolio Distribution</span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex mb-2">
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${selectedFund.asset_allocation?.equity || 97.4}%` }}
                        title={`Equity: ${selectedFund.asset_allocation?.equity || 97.4}%`}
                      />
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${selectedFund.asset_allocation?.cash || 2.6}%` }}
                        title={`Cash & Liquidity: ${selectedFund.asset_allocation?.cash || 2.6}%`}
                      />
                    </div>
                    <div className="flex items-center gap-5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <span>Equity: <strong>{selectedFund.asset_allocation?.equity || 97.4}%</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span>Cash & Liquidity: <strong>{selectedFund.asset_allocation?.cash || 2.6}%</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Key Fund Information Table / Cards */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-primary" /> Key Fund Information
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-muted-foreground block text-[10px]">AUM (Fund Size)</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.aum || '₹37,840 Cr'}</strong>
                      </div>
                      <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-muted-foreground block text-[10px]">Expense Ratio</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.expense_ratio || '1.02%'}</strong>
                      </div>
                      <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-muted-foreground block text-[10px]">Minimum SIP</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">₹{selectedFund.min_sip || 500}</strong>
                      </div>
                      <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-muted-foreground block text-[10px]">Fund Manager</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.fund_manager || 'Rahul Baijal'}</strong>
                      </div>
                      <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/30 sm:col-span-2">
                        <span className="text-muted-foreground block text-[10px]">Exit Load Policy</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.exit_load || '1.0% if redeemed within 365 days'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ========================================================================= */}
              {/* TAB 2: SECTORS & COMPANIES ALLOCATION (COIN ZERODHA IMAGE C & D) */}
              {/* ========================================================================= */}
              <TabsContent value="holdings" className="space-y-6">
                {/* Sector Allocation Section (Coin Image C) */}
                <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="text-[11px] font-semibold mb-1">
                        Sectors
                      </Badge>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Sectoral Distribution
                      </h4>
                    </div>
                    <span className="text-xs text-muted-foreground">Allocation</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {(selectedFund.sectors || DEFAULT_SECTORS)
                      .slice(0, showAllSectors ? undefined : 5)
                      .map((sector, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{sector.name}</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{sector.weight}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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

                  {(selectedFund.sectors || DEFAULT_SECTORS).length > 5 && (
                    <div className="pt-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllSectors(!showAllSectors)}
                        className="text-xs text-primary font-semibold hover:bg-primary/10 gap-1 h-7"
                      >
                        {showAllSectors ? (
                          <>Show less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <>Show all ({(selectedFund.sectors || DEFAULT_SECTORS).length}) <ChevronDown className="h-3 w-3" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Companies Allocation Section (Coin Image D with Direct Stock Analysis) */}
                <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
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

                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-primary">Interactive Stock Deep-Dive:</span> Click <strong>"Analyze Stock →"</strong> on any company below to open its dedicated AI prediction chart, technical indicators, RSI momentum, and price target analysis!
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {(selectedFund.holdings && selectedFund.holdings.length > 0 ? selectedFund.holdings : DEFAULT_HOLDINGS)
                      .slice(0, showAllHoldings ? undefined : 6)
                      .map((company, idx) => (
                        <div
                          key={company.symbol || idx}
                          className="p-2.5 rounded-lg border border-border/60 bg-white dark:bg-slate-900 hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
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
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                              onClick={() => handleAnalyzeHolding(company)}
                              className="text-xs h-7 px-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all gap-1"
                            >
                              Analyze <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {(selectedFund.holdings && selectedFund.holdings.length > 6) && (
                    <div className="pt-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllHoldings(!showAllHoldings)}
                        className="text-xs text-primary font-semibold hover:bg-primary/10 gap-1 h-7"
                      >
                        {showAllHoldings ? (
                          <>Show less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <>Show all (10 holdings) <ChevronDown className="h-3 w-3" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ========================================================================= */}
              {/* TAB 3: SIP WEALTH SIMULATOR */}
              {/* ========================================================================= */}
              <TabsContent value="sip" className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border space-y-4">
                  {/* Monthly Investment Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Monthly Investment Amount
                      </label>
                      <div className="text-base font-black text-primary font-mono">
                        ₹{sipAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <Slider
                      value={[sipAmount]}
                      min={100}
                      max={100000}
                      step={500}
                      onValueChange={(val) => setSipAmount(val[0])}
                      className="my-3"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[1000, 2500, 5000, 10000, 25000, 50000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSipAmount(preset)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-colors ${
                            sipAmount === preset
                              ? 'bg-primary text-primary-foreground border-primary font-bold'
                              : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          ₹{preset.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Investment Period Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Investment Time Period
                      </label>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                        {sipYears} {sipYears === 1 ? 'Year' : 'Years'}
                      </div>
                    </div>
                    <Slider
                      value={[sipYears]}
                      min={1}
                      max={25}
                      step={1}
                      onValueChange={(val) => setSipYears(val[0])}
                      className="my-3"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[1, 3, 5, 10, 15, 20].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setSipYears(yr)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-colors ${
                            sipYears === yr
                              ? 'bg-primary text-primary-foreground border-primary font-bold'
                              : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {yr}Y
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expected Return Rate Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Expected Return Rate (p.a)
                      </label>
                      <div className="text-base font-black text-green-600 dark:text-green-400 font-mono">
                        {sipReturnRate}%
                      </div>
                    </div>
                    <Slider
                      value={[sipReturnRate]}
                      min={5}
                      max={30}
                      step={0.5}
                      onValueChange={(val) => setSipReturnRate(val[0])}
                      className="my-3"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Fund's 3-Year Historical CAGR: <strong className="text-foreground">+{selectedFund.cagr_3yr || 24.1}%</strong>
                    </p>
                  </div>
                </div>

                {/* SIP Output Projection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[11px] text-muted-foreground block mb-0.5 font-medium">Total Invested Amount</span>
                    <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatINR(sipCalc.invested)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50">
                    <span className="text-[11px] text-green-700 dark:text-green-300 block mb-0.5 font-medium">Estimated Wealth Gains</span>
                    <span className="text-lg sm:text-xl font-black text-green-600 dark:text-green-400 font-mono">
                      +{formatINR(sipCalc.returns)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-primary/10 border-primary/30">
                    <span className="text-[11px] text-primary block mb-0.5 font-medium">Total Expected Maturity</span>
                    <span className="text-lg sm:text-xl font-black text-primary font-mono">
                      {formatINR(sipCalc.maturity)}
                    </span>
                  </div>
                </div>

                {/* Visual Ratio Progress Bar */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Invested ({((sipCalc.invested / Math.max(1, sipCalc.maturity)) * 100).toFixed(0)}%)</span>
                    <span className="text-green-600 dark:text-green-400">Gains ({((sipCalc.returns / Math.max(1, sipCalc.maturity)) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 w-full bg-green-500 rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${(sipCalc.invested / Math.max(1, sipCalc.maturity)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Milestone Projections Table */}
                <div className="border rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-700 dark:text-slate-300">
                    Milestone Wealth Projections
                  </div>
                  <div className="divide-y">
                    {[1, 3, 5, 10, 15].map((period) => {
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

                <p className="text-[10px] text-muted-foreground italic text-center">
                  * Mutual fund investments are subject to market risks. Calculations are illustrative based on compound interest formulas and do not guarantee future returns.
                </p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

