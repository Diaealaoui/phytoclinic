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
    console.log('App: Entering fetchUserProfile for userId:', authUser?.id);
    if (!authUser?.id) {
      console.warn('App: fetchUserProfile - No authUser ID provided, returning null profile.');
      return null;
    }

    const SUPABASE_QUERY_TIMEOUT = 10000; // Define a timeout duration (e.g., 10 seconds)

    try {
      console.log('App: Querying "users" table for profile (with timeout)...');
      // Create a promise for the Supabase query
      const profilePromise = supabase
        .from("users")
        .select("id, email, name, user_type")
        .eq("id", authUser.id)
        .single();

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase profile query timed out')), SUPABASE_QUERY_TIMEOUT)
      );

      // Race the Supabase query against the timeout
      const result = await Promise.race([profilePromise, timeoutPromise]);

      // If the timeout wins, result will be an Error object
      if (result instanceof Error) {
        throw result; // Propagate the timeout error
      }

      // If Supabase query wins, it will be an object with data and error properties
      const { data: profile, error } = result;

      if (error) {
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn('⚠️ App: User profile not found in "users" table, or RLS denied access:', error.message);
        } else {
            console.error('❌ App: Supabase error fetching user profile:', error);
        }
        return null;
      }

      console.log('✅ App: User profile loaded:', profile);
      return profile;
    } catch (error: any) { // Type 'any' for the error object for flexibility
      console.error('❌ App: Error in fetchUserProfile catch block:', error.message || error);
      if (error.message === 'Supabase profile query timed out') {
        console.error('App: Supabase profile query exceeded timeout of', SUPABASE_QUERY_TIMEOUT, 'ms. This might indicate a slow database response or RLS issue.');
      }
      return null;
    } finally {
      console.log('App: Exiting fetchUserProfile.');
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 App: initializeAuth started. Checking session...');
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        console.log('App: supabase.auth.getSession() completed.');

        if (error) {
          console.error('❌ App: Session error from getSession:', error);
          setUser(null);
          setUserType(null); // Keep userType null on session error
          setUserName("");
          console.log('App: getSession error path, setting checking to false.');
          setChecking(false);
          return;
        }

        const sessionUser = sessionData?.session?.user || null;
        console.log('👤 App: Session user from getSession:', sessionUser?.email || 'No user');

        setUser(sessionUser);

        if (sessionUser) {
          console.log('App: User found in session, fetching profile...');
          const profile = await fetchUserProfile(sessionUser);

          if (profile) {
            setUserType(profile.user_type);
            setUserName(profile.name);
            console.log('App: Profile found and set.');
          } else {
            // ✅ IMPORTANT CHANGE: If profile fetch fails/times out, DO NOT default userType to "client".
            // Instead, set userType to null. This will make ProtectedRoute redirect to login,
            // which is safer than misassigning roles.
            setUserType(null); // Set to null to trigger ProtectedRoute redirect
            setUserName(sessionUser.email || 'User'); // Still use email for display if needed
            console.warn('App: Profile fetch failed/timed out. UserType NOT set. Will redirect to login via ProtectedRoute.');
          }
        } else {
            // If no session user, ensure userType is null
            setUserType(null);
            console.log('App: No user in session from getSession.');
        }
      } catch (error) {
        console.error('❌ App: Auth initialization error (catch block):', error);
        setUser(null);
        setUserType(null); // Ensure userType is null on unexpected error
        setUserName("");
      } finally {
        console.log('App: initializeAuth finished, setting checking to false.');
        setChecking(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    console.log('🔗 App: Setting up auth state listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 App: Auth state changed:', event, session?.user?.email || 'No user');
      console.log('App: Auth state listener triggered.');

      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 App: Auth listener - User signed out or no session.');
        setUser(null);
        setUserType(null); // Ensure userType is null on sign out
        setUserName("");
        setChecking(false);
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_type');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || session) {
        console.log('👤 App: Auth listener - Processing signed in user...');
        const sessionUser = session?.user || null;
        setUser(sessionUser);

        if (sessionUser) {
          console.log('App: Auth listener - User found, fetching profile...');
          const profile = await fetchUserProfile(sessionUser);
          if (profile) {
            setUserType(profile.user_type);
            setUserName(profile.name);
            console.log('App: Auth listener - Profile found and set.');
          } else {
            // ✅ IMPORTANT CHANGE: If profile fetch fails/times out, DO NOT default userType to "client".
            // Set userType to null to trigger ProtectedRoute redirect.
            setUserType(null); // Set to null to trigger ProtectedRoute redirect
            setUserName(sessionUser.email || 'User');
            console.warn('App: Auth listener - Profile fetch failed/timed out. UserType NOT set. Will redirect to login via ProtectedRoute.');
          }
        } else {
            // If no session user, ensure userType is null
            setUserType(null);
            console.log('App: Auth listener - No user in session.');
        }
        console.log('App: Auth listener processing finished, setting checking to false.');
        setChecking(false);
      }
    });

    return () => {
      console.log('🔌 App: Cleaning up auth listener subscription.');
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
    console.log('App: Render - Showing loading state...');
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
  // This `isAuthenticated` check now correctly relies on userType being determined
  console.log('App: Render - Checking complete, isAuthenticated:', !!user, 'UserType:', userType);
  const isAuthenticated = !!user && !!userType && !checking; // userType must be not null for auth

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
                    {/* Pass the resolved userType or default to 'client' if not determined,
                        though ideally userType would be null and ProtectedRoute handles redirection */}
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
                      userType={userType!} // userType is guaranteed by isAuthenticated check
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
