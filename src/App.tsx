// src/App.tsx - Refined approach using single onAuthStateChange for initial state and all updates
import { useEffect, useState, useRef } from "react"; // Import useRef
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

import CatalogueUploader from './components/CatalogueUploader';
import CatalogueViewer from './components/CatalogueViewer';
import UserManagementPage from './pages/UserManagementPage';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // Start as true, set to false once initial auth state is determined
  const [userType, setUserType] = useState<'admin' | 'client' | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Use useRef to track if the initial onAuthStateChange event has been fully processed
  const initialEventProcessedRef = useRef(false);

  // fetchUserProfile function remains the same (it's already robust and logs well)
  const fetchUserProfile = async (authUser: any) => {
    console.log('App: Entering fetchUserProfile for userId:', authUser?.id);
    if (!authUser?.id) {
      console.warn('App: fetchUserProfile - No authUser ID provided, returning null profile.');
      return null;
    }
    const SUPABASE_QUERY_TIMEOUT = 10000;
    try {
      console.log('App: Querying "users" table for profile (with timeout)...');
      const profilePromise = supabase.from("users").select("id, email, name, user_type").eq("id", authUser.id).single();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase profile query timed out')), SUPABASE_QUERY_TIMEOUT));
      const result = await Promise.race([profilePromise, timeoutPromise]);
      if (result instanceof Error) { throw result; }
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
    } catch (error: any) {
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
    let isMounted = true; // Flag to prevent state updates on unmounted component

    console.log('🔗 App: Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return; // Guard against unmount during async op

      console.log('🔄 App: Auth state changed:', event, session?.user?.email || 'No user');

      let currentUser = null;
      let currentUserType: 'admin' | 'client' | null = null;
      let currentUserName = "";

      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 App: Auth listener - User signed out or no session. Finalizing logout state.');
        // Clear all states and local storage on sign out
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_type');
      } else { // SIGNED_IN, TOKEN_REFRESHED, or INITIAL_SESSION events
        console.log('👤 App: Auth listener - Processing signed in user...');
        currentUser = session.user; // Set user from the session
        const profile = await fetchUserProfile(session.user); // Fetch profile for userType

        if (!isMounted) return; // Re-check unmount after async call

        if (profile) {
          currentUserType = profile.user_type;
          currentUserName = profile.name;
          console.log('App: Auth listener profile found. UserType:', currentUserType);
          // Also set local storage here to persist across app reloads outside of login form
          // This ensures that even if LoginForm didn't set them, App does.
          localStorage.setItem("user_email", session.user.email || '');
          localStorage.setItem("user_id", profile.id);
          localStorage.setItem("user_type", profile.user_type);
        } else {
          // If profile fetch fails/times out, we cannot reliably determine userType.
          // Set userType to null. ProtectedRoute will redirect to login.
          console.warn('App: Auth listener - Profile fetch failed/timed out. UserType NOT set. Will redirect via ProtectedRoute.');
        }
      }

      // Update states based on the processing result
      setUser(currentUser);
      setUserType(currentUserType);
      setUserName(currentUserName);

      // Crucially, set checking to false only AFTER the first comprehensive auth state has been handled.
      // This ensures isAuthenticated is stable before routing decisions are made.
      if (!initialEventProcessedRef.current && isMounted) { // Use ref here
        console.log('App: Initial authentication state processed. Setting checking to false.');
        setChecking(false);
        initialEventProcessedRef.current = true; // Mark as handled
      }
    });

    // Cleanup function for useEffect
    return () => {
      console.log('🔌 App: Cleaning up auth listener subscription and marking unmounted.');
      isMounted = false; // Set flag to prevent further state updates
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array, runs once on mount and handles all auth state changes

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
    // This return handles the main App loading state.
    // ProtectedRoute will also show a loading state if passed 'checking = true'.
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading authentication...</h2>
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

              {/* All Protected Routes now correctly use isCheckingAuth={checking} */}
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sync-manager"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <SyncManagerPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/catalogue-upload"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <CatalogueUploader />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/catalogues"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <CatalogueViewer userType={userType || 'client'} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <DashboardPage
                      userType={userType!} // userType is guaranteed to be non-null by isAuthenticated check
                      userEmail={userName}
                      onLogout={handleLogout}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mindmap"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <MindMapPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/forum"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <ForumPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/csv"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <CsvUploaderPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/zoho"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <ZohoPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/history"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
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
