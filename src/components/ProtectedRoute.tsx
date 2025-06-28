// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import React from 'react'; // Make sure React is imported

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  isCheckingAuth: boolean; // NEW PROP: Indicate if auth check is still ongoing
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAuthenticated, isCheckingAuth, children }) => {
  if (isCheckingAuth) {
    // If we are still checking authentication, display a loading state
    // This prevents premature redirects while userType is being determined
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading authentication...</h2>
          <p className="text-gray-500">Please wait</p>
        </div>
      </div>
    );
  }

  // Once checking is complete, then evaluate isAuthenticated
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
