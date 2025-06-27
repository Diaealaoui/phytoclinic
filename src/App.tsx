// src/App.tsx - Corrected version with UserManagementPage route and improved logout, and extensive logging for debugging stuck on refresh
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
import UserManagementPage from './pages/UserManagementPage';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [userType, setUserType] = useState<'admin' | 'client' | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Fetch user profile from your users table
  const fetchUserProfile = async (authUser: any) => {
    console.log('App: Entering fetchUserProfile for userId:', authUser?.id); // NEW LOG
    if (!authUser?.id) {
      console.warn('App: fetchUserProfile - No authUser ID provided, returning null profile.'); // NEW LOG
      return null;
    }

    try {
      console.log('App: Querying "users" table for profile...'); // NEW LOG
      const { data: profile, error } = await supabase
        .from("users")
        .select("id, email, name, user_type")
        .eq("id", authUser.id)
        .single();

      if (error) {
        // If profile not found, it's not always an error, but a "null" result
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') { // RLS no rows found error
            console.warn('⚠️ App: User profile not found in "users" table, or RLS denied access:', error.message); // MODIFIED LOG
        } else {
            console.error('❌ App: Supabase error fetching user profile:', error); // MODIFIED LOG
        }
        return null;
      }

      console.log('✅ App: User profile loaded:', profile); // MODIFIED LOG
      return profile;
    } catch (error) {
      console.error('❌ App: Unexpected error in fetchUserProfile catch block:', error); // MODIFIED LOG
      return null;
    } finally {
      console.log('App: Exiting fetchUserProfile.'); // NEW LOG
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 App: initializeAuth started. Checking session...'); // MODIFIED LOG
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        console.log('App: supabase.auth.getSession() completed.'); // NEW LOG

        if (error) {
          console.error('❌ App: Session error from getSession:', error); // MODIFIED LOG
          setUser(null);
          setUserType(null);
          setUserName("");
          console.log('App: getSession error path, setting checking to false.'); // NEW LOG
          setChecking(false);
          return;
        }

        const sessionUser = sessionData?.session?.user || null;
        console.log('👤 App: Session user from getSession:', sessionUser?.email || 'No user'); // MODIFIED LOG

        setUser(sessionUser);

        if (sessionUser) {
          console.log('App: User found in session, fetching profile...'); // NEW LOG
          const profile = await fetchUserProfile(sessionUser); // Call the instrumented version

          if (profile) {
            setUserType(profile.user_type);
            setUserName(profile.name);
            console.log('App: Profile found and set.'); // NEW LOG
          } else {
            // Fallback if profile not found (e.g., new signup not yet in public.users)
            setUserType("client");
            setUserName(sessionUser.email || 'User');
            console.log('App: Profile NOT found, falling back to client type.'); // NEW LOG
          }
        } else {
            console.log('App: No user in session from getSession.'); // NEW LOG
        }
      } catch (error) {
        console.error('❌ App: Auth initialization error (catch block):', error); // MODIFIED LOG
        setUser(null);
        setUserType(null);
        setUserName("");
      } finally {
        console.log('App: initializeAuth finished, setting checking to false.'); // NEW LOG
        setChecking(false);
      }
    };

    initializeAuth();
  }, []); // Runs once on mount

  useEffect(() => {
    console.log('🔗 App: Setting up auth state listener...'); // MODIFIED LOG

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 App: Auth state changed:', event, session?.user?.email || 'No user'); // MODIFIED LOG
      console.log('App: Auth state listener triggered.'); // NEW LOG

      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 App: Auth listener - User signed out or no session.'); // MODIFIED LOG
        setUser(null);
        setUserType(null);
        setUserName("");
        setChecking(false);
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_type');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || session) {
        console.log('👤 App: Auth listener - Processing signed in user...'); // MODIFIED LOG
        const sessionUser = session?.user || null;
        setUser(sessionUser);

        if (sessionUser) {
          console.log('App: Auth listener - User found, fetching profile...'); // NEW LOG
          const profile = await fetchUserProfile(sessionUser); // Call the instrumented version
          if (profile) {
            setUserType(profile.user_type);
            setUserName(profile.name);
            console.log('App: Auth listener - Profile found and set.'); // NEW LOG
          } else {
            setUserType("client");
            setUserName(sessionUser.email || 'User');
            console.log('App: Auth listener - Profile NOT found, falling back to client type.'); // NEW LOG
          }
        } else {
            console.log('App: Auth listener - No user in session.'); // NEW LOG
        }
        console.log('App: Auth listener processing finished, setting checking to false.'); // MODIFIED LOG
        setChecking(false);
      }
    });

    return () => {
      console.log('🔌 App: Cleaning up auth listener subscription.'); // MODIFIED LOG
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log('🚪 App: Logging out...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
      }

      setUser(null);
      setUserType(null);
      setUserName("");

      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_type');

      // Using setTimeout just to ensure logs are flushed, though usually not needed
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);

    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setUserType(null);
      setUserName("");
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_type');
      window.location.href = '/login';
    }
  };

  if (checking) {
    console.log('App: Render - Showing loading state...'); // NEW LOG
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
  console.log('App: Render - Checking complete, isAuthenticated:', !!user); // NEW LOG
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
                path="/users"
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
