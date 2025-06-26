// Fixed Index.tsx - Handles proper redirects
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ User already authenticated, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('❌ No session found, redirecting to login');
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        navigate('/login', { replace: true });
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  // Show loading while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-50">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Phytoclinic Portal...</h2>
        <p className="text-gray-500">Checking your session</p>
      </div>
    </div>
  );
}