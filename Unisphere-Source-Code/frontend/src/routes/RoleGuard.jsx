import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath } from '@/utils/roleRedirect';

/**
 * RoleGuard — Wraps routes that should only be accessible by specific roles.
 * If the user's role is not in `allowedRoles`, redirects them to their own dashboard.
 * Works in tandem with ProtectedRoute (which handles unauthenticated users).
 *
 * Usage:
 *   <Route element={<RoleGuard allowedRoles={['admin', 'superadmin']} />}>
 *     <Route path="/admin/students" element={<StudentManagementPage />} />
 *   </Route>
 */
export const RoleGuard = ({ allowedRoles = [] }) => {
  const { role } = useAuth();
  const location = useLocation();

  // Normalize roles: 'superadmin' inherits all 'admin' permissions unless specified
  const effectiveAllowedRoles = allowedRoles.includes('admin')
    ? [...new Set([...allowedRoles, 'superadmin'])]
    : allowedRoles;

  if (!effectiveAllowedRoles.includes(role)) {
    // Silently redirect to the user's own dashboard — no error page needed
    return <Navigate to={getDashboardPath(role)} replace state={{ from: location }} />;
  }

  return <Outlet />;
};
