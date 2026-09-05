import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import USStocksPage from './pages/USStocksPage';
import AnalysisPage from './pages/AnalysisPage';
import MutualFundsPage from './pages/MutualFundsPage';

function App() {
  const { user } = useAuth();

  const PrivateRoute = ({ children }) => {
    return user ? children : <Navigate to="/auth" />;
  };

  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/us-stocks"
            element={
              <PrivateRoute>
                <USStocksPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <PrivateRoute>
                <AnalysisPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/mutual-funds"
            element={
              <PrivateRoute>
                <MutualFundsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/mutual-funds/:schemeCode"
            element={
              <PrivateRoute>
                <MutualFundsPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
