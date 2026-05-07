import { isFacultyRole, isStudentRole } from './roles';

export const getDashboardPath = (role) => {
  if (role === 'superadmin') return '/dashboard/admin';
  if (role === 'hod') return '/dashboard/faculty';
  if (isStudentRole(role) && role !== 'student') return '/dashboard/student';
  if (role) return `/dashboard/${role}`;
  return '/login';
};

export const getProfilePath = (role) => {
  if (isStudentRole(role)) {
    return '/profile/student';
  }

  if (isFacultyRole(role)) {
    return '/profile/faculty';
  }

  return '/profile/settings';
};
