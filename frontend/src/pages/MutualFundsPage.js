import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMutualFunds, searchMutualFunds } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function MutualFundsPage() {
  const navigate = useNavigate();
  const [funds, setFunds] = useState([]);
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
    e.preventDefault();
    if (!searchQuery) {
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Mutual Funds</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search mutual funds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <p>Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funds.map((fund) => (
              <Card key={fund.scheme_code}>
                <CardHeader>
                  <CardTitle className="text-base">{fund.scheme_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">NAV</span>
                      <span className="font-semibold">₹{fund.nav}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm">{fund.date}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{fund.category}</span>
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
