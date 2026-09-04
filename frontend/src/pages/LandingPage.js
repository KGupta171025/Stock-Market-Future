import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, LineChart, Brain, Bell } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Stock Market Future</h1>
          </div>
          <Button onClick={() => navigate('/auth')} data-testid="get-started-btn">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          AI-Powered Stock Market
          <br />
          <span className="text-primary">Predictions</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Make informed investment decisions with advanced machine learning,
          real-time analysis, and comprehensive market insights.
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            data-testid="hero-cta-button"
          >
            Start Analyzing
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-all">
            <Brain className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI Predictions</h3>
            <p className="text-muted-foreground">
              LSTM and Transformer models for accurate price predictions
            </p>
          </div>
          
          <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-all">
            <LineChart className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-Time Charts</h3>
            <p className="text-muted-foreground">
              Interactive TradingView-style charts with technical indicators
            </p>
          </div>
          
          <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-all">
            <Bell className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">News Sentiment</h3>
            <p className="text-muted-foreground">
              AI-powered news analysis for market sentiment insights
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Stock Market Future. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
