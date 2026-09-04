import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle, loginWithApple, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signup(email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Signup failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success('Login successful with Google!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Google login note: ' + (error.message || 'Domain unauthorized or cancelled'));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      await loginWithApple();
      toast.success('Login successful with Apple!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Apple login note: ' + (error.message || 'Domain unauthorized or cancelled'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    try {
      loginAsGuest();
      toast.success('Logged in with Demo / Guest Mode!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Guest access failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Stock Market Future</CardTitle>
          <CardDescription>Sign in to access AI-powered market predictions & analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="default"
            className="w-full mb-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-5 shadow-sm"
            onClick={handleGuestLogin}
            data-testid="guest-login-button"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Instant Guest / Demo Access
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or sign in with email</span>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="signup-tab">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-2">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="login-email-input"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="login-password-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-2">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="signup-email-input"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="signup-password-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  data-testid="signup-submit-button"
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full font-medium"
              onClick={handleGoogleLogin}
              disabled={loading}
              data-testid="google-login-button"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <Button
              variant="outline"
              className="w-full font-medium bg-slate-900 hover:bg-slate-800 text-white hover:text-white border-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
              onClick={handleAppleLogin}
              disabled={loading}
              data-testid="apple-login-button"
            >
              <svg className="mr-2 h-4 w-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12-14.42-6.09-9.33-10.87-19.78-14.34-31.35-3.48-11.57-5.22-22.37-5.22-32.4 0-14.65 3.63-26.68 10.9-36.08 7.27-9.4 16.32-14.18 27.16-14.34 4.35 0 9.28 1.14 14.78 3.42 5.5 2.28 9.38 3.48 11.66 3.6 2.45-.24 6.54-1.5 12.27-3.79 5.73-2.28 10.5-3.32 14.33-3.12 11.39.54 20.6 4.78 27.6 12.72-10.02 6.09-14.93 14.54-14.73 25.35.21 8.35 3.37 15.39 9.48 21.11 6.11 5.73 13.41 9.07 21.9 10.02-2.18 6.53-4.94 13.06-8.29 19.59zM119.22 31.86c0-7.39 2.65-14.17 7.94-20.35 5.3-6.17 11.75-9.98 19.37-11.41.33 1.09.49 2.12.49 3.1 0 7.39-2.73 14.28-8.19 20.67-5.46 6.38-12.01 10.19-19.65 11.43-.22-1.09-.33-2.12-.33-3.44z" />
              </svg>
              Apple
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
