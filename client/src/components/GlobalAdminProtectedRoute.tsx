import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface GlobalAdminProtectedRouteProps {
  children: React.ReactNode;
}

const LAST_ALLOWED_PATH_KEY = 'lastAllowedPath';

const GlobalAdminProtectedRoute: React.FC<GlobalAdminProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth() as any;
  const location = useLocation();
  const isGlobalAdmin = !!user && user.email === 'global@asc.com';

  useEffect(() => {
    if (!loading && isAuthenticated && user && isGlobalAdmin) {
      try { localStorage.setItem(LAST_ALLOWED_PATH_KEY, location.pathname + location.search); } catch {}
    }
  }, [loading, isAuthenticated, user, isGlobalAdmin, location.pathname, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isGlobalAdmin) {
    const fallback = ((): string => {
      try { return localStorage.getItem(LAST_ALLOWED_PATH_KEY) || '/'; } catch { return '/'; }
    })();
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default GlobalAdminProtectedRoute;
