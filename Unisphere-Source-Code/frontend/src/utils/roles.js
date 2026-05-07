export const STUDENT_ROLES = ['student', 'club_president', 'club_vice_president'];
export const FACULTY_ROLES = ['faculty', 'hod'];
export const ADMIN_ROLES = ['admin', 'superadmin'];

export const isStudentRole = (role) => STUDENT_ROLES.includes(role);
export const isFacultyRole = (role) => FACULTY_ROLES.includes(role);
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
