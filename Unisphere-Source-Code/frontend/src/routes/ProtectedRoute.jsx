import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath } from '@/utils/roleRedirect';
import { isStudentRole } from '@/utils/roles';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--primary)]">
        <svg className="h-8 w-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  // Student-specific edge cases also apply to club leadership roles.
  if (isStudentRole(role)) {
    if (user.isFirstLogin && location.pathname !== '/force-change-password') {
      return <Navigate to="/force-change-password" replace />;
    }
    if (!user.isFirstLogin && !user.isOnboarded && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <Outlet />;
};
