import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMutualFunds, searchMutualFunds } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Search, TrendingUp, LogOut, Layers } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'Index Funds', 'Thematic'];

export default function MutualFundsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [funds, setFunds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

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

  const filteredFunds = funds.filter(fund => {
    if (selectedCategory === 'All') return true;
    return (fund.category || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
              <Button variant="secondary" size="sm" onClick={() => navigate('/mutual-funds')}>
                Mutual Funds
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden lg:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              AMFI Mutual Funds Explorer
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Live NAV pricing, fund categories, and performance tracking across Indian Asset Management Companies
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search mutual funds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Loading mutual funds data...</p>
          </div>
        ) : filteredFunds.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border">
            <p className="text-muted-foreground">No mutual funds matching your criteria.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); fetchMutualFunds(); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFunds.map((fund) => (
              <Card key={fund.scheme_code} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                      {fund.scheme_name}
                    </CardTitle>
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium w-fit">
                    {fund.category}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current NAV</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{fund.nav?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Scheme Code: {fund.scheme_code}</span>
                      <span>Updated: {fund.date}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
