// App.tsx - Corrected version with UserManagementPage route
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { supabase } from "@/lib/supabase";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";
import MindMapPage from "./pages/MindMap";
import ForumPage from "./pages/Forum";
import CsvUploaderPage from "./pages/CsvUploader";
import ZohoPage from "./pages/Zoho";
import PurchaseHistoryPage from "./pages/PurchaseHistoryPage";
import AnalyticsPage from './pages/AnalyticsPage';
import SyncManagerPage from './pages/SyncManagerPage';
import ProtectedRoute from "./components/ProtectedRoute";

// Import catalogue components directly since we don't have separate page files yet
import CatalogueUploader from './components/CatalogueUploader';
import CatalogueViewer from './components/CatalogueViewer';

// Import the new UserManagementPage
import UserManagementPage from './pages/UserManagementPage'; //

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [userType, setUserType] = useState<'admin' | 'client' | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Fetch user profile from your users table
  const fetchUserProfile = async (authUser: any) => {
    if (!authUser?.id) return null;
    
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("id, email, name, user_type")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.warn('⚠️ Could not fetch user profile:', error);
        return null;
      }

      console.log('✅ User profile loaded:', profile);
      return profile;
    } catch (error) {
      console.error('❌ Profile fetch error:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking authentication...');
        
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          setUser(null);
          setUserType(null);
          setUserName("");
          setChecking(false);
          return;
        }

        const sessionUser = sessionData?.session?.user || null;
        console.log('👤 Session user:', sessionUser?.email);
        
        setUser(sessionUser);

        if (sessionUser) {
          // Fetch user profile from your users table
          const profile = await fetchUserProfile(sessionUser);
          
          if (profile) {
            setUserType(profile.user_type);
            setUserName(profile.name);
          } else {
            // Fallback to default values
            setUserType("client");
            setUserName(sessionUser.email || 'User');
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setUser(null);
        setUserType(null);
        setUserName("");
      } finally {
        setChecking(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    console.log('🔗 Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 User signed out');
        setUser(null);
        setUserType(null);
        setUserName("");
        setChecking(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || session) {
        console.log('👤 Processing signed in user...');
        const sessionUser = session?.user || null;
        setUser(sessionUser);

        if (sessionUser) {
          // Fetch user profile from your users table
          const profile = await fetchUserProfile(sessionUser);
          
          if (profile) {
            setUserType(profile.user_type);
            setUserName(profile.name);
          } else {
            // Fallback to default values
            setUserType("client");
            setUserName(sessionUser.email || 'User');
          }
        }
        setChecking(false);
      }
    });

    return () => {
      console.log('🔌 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      setUser(null);
      setUserType(null);
      setUserName("");
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setUserType(null);
      setUserName("");
      window.location.href = '/login';
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading...</h2>
          <p className="text-gray-500">Checking your session</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = !!user && !!userType && !checking;

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route 
                path="/analytics" 
                element={isAuthenticated ? <AnalyticsPage /> : <Navigate to="/login" />} 
              />

              <Route
                path="/sync-manager"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <SyncManagerPage />
                  </ProtectedRoute>
                }
              />

              {/* Catalogue routes using components directly */}
              <Route
                path="/catalogue-upload"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <CatalogueUploader />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/catalogues"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <CatalogueViewer userType={userType || 'client'} />
                  </ProtectedRoute>
                }
              />

              {/* New Route for User Management Page */}
              <Route
                path="/users" // This is the path for User Management
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <DashboardPage
                      userType={userType!}
                      userEmail={userName}
                      onLogout={handleLogout}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mindmap"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <MindMapPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/forum"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <ForumPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/csv"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <CsvUploaderPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/zoho"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <ZohoPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/history"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <PurchaseHistoryPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;