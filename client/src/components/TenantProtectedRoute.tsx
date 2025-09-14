import React, { useEffect } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface TenantProtectedRouteProps {
  children: React.ReactNode;
}

const LAST_ALLOWED_PATH_KEY = 'lastAllowedPath';

const TenantProtectedRoute: React.FC<TenantProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth() as any;
  const { tenantPrefix } = useParams<{ tenantPrefix: string }>();
  const location = useLocation();
  const isGlobalAdmin = !!user && user.email === 'global@asc.com';

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      try { localStorage.setItem(LAST_ALLOWED_PATH_KEY, location.pathname + location.search); } catch {}
    }
  }, [loading, isAuthenticated, user, location.pathname, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const target = `/t/${tenantPrefix || localStorage.getItem('tenantPrefix') || 'default'}/login`;
    return <Navigate to={target} replace />;
  }

  if (isGlobalAdmin) {
    return <>{children}</>;
  }

  const userTenantPrefix = ((): string | null => {
    try { return localStorage.getItem('tenantPrefix'); } catch { return null; }
  })();

  if (tenantPrefix && userTenantPrefix && userTenantPrefix !== tenantPrefix) {
    const fallback = `/t/${userTenantPrefix}/dashboard`;
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default TenantProtectedRoute;
