// src/App.tsx - Fully updated version with all debugging logs and fixes,
// specifically addressing race condition on refresh for userType and checking state.
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
    let isMounted = true; // Flag to prevent state updates on unmounted component

    // Consolidated function to process a session and update all relevant states
    const processSessionAndSetStatus = async (sessionUser: any) => {
        if (!isMounted) return; // Prevent updates if component unmounted during async operation

        if (sessionUser) {
            console.log('App: processSessionAndSetStatus - User found, fetching profile...');
            const profile = await fetchUserProfile(sessionUser); // Fetch profile

            if (!isMounted) return; // Re-check if unmounted after async call

            if (profile) {
                setUser(sessionUser); // Set user from session
                setUserType(profile.user_type); // Set userType from profile
                setUserName(profile.name); // Set userName from profile
                console.log('App: processSessionAndSetStatus - Profile found and set. UserType:', profile.user_type);
            } else {
                // If profile fetch fails (timeout/RLS), consider it an invalid state for dashboard access
                // Clear user and userType, forcing ProtectedRoute to redirect to login.
                setUser(null);
                setUserType(null); // Explicitly set to null if profile cannot be fetched
                setUserName("");
                console.warn('App: processSessionAndSetStatus - Profile fetch failed/timed out. Forcing logout via ProtectedRoute.');
                // Optionally, could force signOut here if profile is always mandatory for any access
                // await supabase.auth.signOut();
            }
        } else {
            // No user session, ensure all auth related states are null/empty
            setUser(null);
            setUserType(null);
            setUserName("");
            // Ensure local storage is also cleared in this case for consistency
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_type');
            console.log('App: processSessionAndSetStatus - No user session, cleared states.');
        }

        // IMPORTANT: Only set checking to false AFTER all session and profile processing is done
        if (isMounted) {
            console.log('App: processSessionAndSetStatus finished, setting checking to false.');
            setChecking(false);
        }
    };

    // --- Initial authentication check on mount ---
    const initializeAuth = async () => {
        console.log('🔍 App: initializeAuth started. Checking session (initial mount)...');
        try {
            const { data: sessionData, error } = await supabase.auth.getSession();
            console.log('⚡️ App: supabase.auth.getSession() result on load:', sessionData, 'Error:', error);

            if (!isMounted) return; // Guard against unmount during async op

            if (error) {
                console.error('❌ App: Session error from getSession:', error);
                await processSessionAndSetStatus(null); // Treat as no user if getSession fails
            } else {
                await processSessionAndSetStatus(sessionData?.session?.user || null);
            }
        } catch (error) {
            console.error('❌ App: Auth initialization error (catch block):', error);
            await processSessionAndSetStatus(null); // Treat as no user on unexpected error
        }
    };

    initializeAuth(); // Call initial check

    // --- Listener for real-time auth state changes ---
    console.log('🔗 App: Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 App: Auth state changed:', event, session?.user?.email || 'No user');
        if (!isMounted) return; // Guard against unmount during async op

        // This listener ensures our state is always in sync with Supabase Auth.
        // It will call processSessionAndSetStatus which handles all state updates including setting checking to false.
        await processSessionAndSetStatus(session?.user || null);
    });

    // Cleanup function for useEffect
    return () => {
        console.log('🔌 App: Cleaning up auth listener subscription and marking unmounted.');
        isMounted = false; // Set flag to prevent further state updates
        subscription.unsubscribe();
    };
  }, []); // Empty dependency array, runs once on mount

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
                element={
                  // Pass isCheckingAuth to ProtectedRoute
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

              {/* Catalogue routes using components directly */}
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
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={checking}>
                    {/* userType is guaranteed to be non-null by isAuthenticated check */}
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
