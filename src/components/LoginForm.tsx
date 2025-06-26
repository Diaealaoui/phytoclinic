// Fixed LoginForm.tsx - Removed user type selection only
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔐 Attempting login for:', email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.error('❌ Login error:', signInError);
        setError(
          signInError.message === 'Email not confirmed'
            ? 'Please confirm your account from your email first.'
            : signInError.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please try again.'
            : signInError.message
        );
        return;
      }

      const user = data.user;
      console.log('✅ Login successful for:', user?.email);

      if (user) {
        // ✅ FIXED: Store user info immediately 
        localStorage.setItem("user_email", user.email || '');
        
        // ✅ FIXED: Fetch and validate user profile
        try {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("id, user_type, name")
            .eq("email", user.email)
            .single();

          if (profileError) {
            console.warn('⚠️ Profile not found, using defaults');
            localStorage.setItem("user_type", "client");
          } else if (profile) {
            console.log('✅ Profile found:', profile);
            localStorage.setItem("user_id", profile.id);
            localStorage.setItem("user_type", profile.user_type);
          }
        } catch (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          localStorage.setItem("user_type", "client");
        }

        // ✅ FIXED: Navigate to dashboard after successful login
        console.log('🏠 Navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('❌ Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-blue-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/6848c10115c1e7aea64f3606_1749599147143_6f59f594.jpg" 
              alt="Phytoclinic Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">
            Welcome to Phytoclinic Portal
          </CardTitle>
          <p className="text-sm text-gray-600">Phytoclinic Santé Végétale</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-500">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-green-700 hover:text-green-800"
              onClick={() => navigate('/signup')}
              disabled={loading}
            >
              Don't have an account? Sign Up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;