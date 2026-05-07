import { apiRequest, apiRequestRaw, createFormData } from './serviceUtils';

const AUTH_BASES = {
	student: '/students',
	club_president: '/students',
	club_vice_president: '/students',
	faculty: '/faculty',
	hod: '/faculty',
	admin: '/admin',
	superadmin: '/admin',
};

const getAuthBase = (role) => {
	if (!AUTH_BASES[role]) {
		throw new Error(`Unsupported auth role: ${role}`);
	}

	return AUTH_BASES[role];
};

const authPath = (role, suffix) => `${getAuthBase(role)}${suffix}`;

export const loginStudent = (payload) => apiRequest('post', authPath('student', '/login'), { data: payload });
export const loginFaculty = (payload) => apiRequest('post', authPath('faculty', '/login'), { data: payload });
export const loginAdmin = (payload) => apiRequest('post', authPath('admin', '/login'), { data: payload });
export const loginWithEmail = (payload) => apiRequest('post', '/auth/login', { data: payload });

export const logoutStudent = () => apiRequest('post', authPath('student', '/logout'));
export const logoutFaculty = () => apiRequest('post', authPath('faculty', '/logout'));
export const logoutAdmin = () => apiRequest('post', authPath('admin', '/logout'));

export const refreshStudentToken = (refreshToken) => apiRequest('post', authPath('student', '/refresh-token'), { data: refreshToken ? { refreshToken } : undefined });
export const refreshFacultyToken = (refreshToken) => apiRequest('post', authPath('faculty', '/refresh-token'), { data: refreshToken ? { refreshToken } : undefined });
export const refreshAdminToken = (refreshToken) => apiRequest('post', authPath('admin', '/refresh-token'), { data: refreshToken ? { refreshToken } : undefined });

export const forgotStudentPassword = (payload) => apiRequest('post', authPath('student', '/forgot-password'), { data: payload });
export const forgotFacultyPassword = (payload) => apiRequest('post', authPath('faculty', '/forgot-password'), { data: payload });
export const forgotAdminPassword = (payload) => apiRequest('post', authPath('admin', '/forgot-password'), { data: payload });

export const resetStudentPassword = (token, payload) => apiRequest('post', authPath('student', `/reset-password/${token}`), { data: payload });
export const resetFacultyPassword = (token, payload) => apiRequest('post', authPath('faculty', `/reset-password/${token}`), { data: payload });
export const resetAdminPassword = (token, payload) => apiRequest('post', authPath('admin', `/reset-password/${token}`), { data: payload });

export const changeStudentPassword = (payload) => apiRequest('post', authPath('student', '/change-password'), { data: payload });
export const changeFacultyPassword = (payload) => apiRequest('post', authPath('faculty', '/change-password'), { data: payload });
export const changeAdminPassword = (payload) => apiRequest('post', authPath('admin', '/change-password'), { data: payload });

export const getStudentProfile = () => apiRequest('get', authPath('student', '/profile'));
export const getFacultyProfile = () => apiRequest('get', authPath('faculty', '/profile'));
export const getAdminProfile = () => apiRequest('get', authPath('admin', '/profile'));
export const updateProfileByRole = (role, payload) => apiRequest('patch', authPath(role, '/profile'), { data: payload });

export const updateFacultyProfile = (payload) => apiRequest('patch', authPath('faculty', '/profile'), { data: payload });

export const getAllStudents = (params) => apiRequest('get', authPath('student', ''), { params });
export const toggleStudentStatus = (studentId) => apiRequest('patch', authPath('student', `/${studentId}/toggle-status`));

export const uploadStudentsCsv = (file) => {
	const formData = createFormData({ file });
	return apiRequest('post', authPath('student', '/upload-csv'), { data: formData });
};

export const getAllFaculty = (params) => apiRequest('get', authPath('faculty', '/get-all-faculty'), { params });
export const toggleFacultyStatus = (facultyId) => apiRequest('patch', authPath('faculty', `/get-all-faculty/${facultyId}/toggle-status`));

export const uploadFacultyCsv = (file) => {
	const formData = createFormData({ file });
	return apiRequest('post', authPath('faculty', '/upload-csv'), { data: formData });
};

export const createAdmin = (payload) => apiRequest('post', authPath('admin', '/create-admin'), { data: payload });
export const getAllAdmins = () => apiRequest('get', authPath('admin', '/get-all-admins'));
export const toggleAdminStatus = (adminId) => apiRequest('patch', authPath('admin', `/${adminId}/toggle-status`));
export const getPlatformStats = () => apiRequest('get', authPath('admin', '/stats'));

export const requestPasswordReset = (role, payload) => apiRequest('post', authPath(role, '/forgot-password'), { data: payload });
export const resetPassword = (role, token, payload) => apiRequest('post', authPath(role, `/reset-password/${token}`), { data: payload });
export const loginByRole = (role, payload) => apiRequest('post', authPath(role, '/login'), { data: payload });
export const logoutByRole = (role) => apiRequest('post', authPath(role, '/logout'));
export const refreshTokenByRole = (role, refreshToken) => apiRequest('post', authPath(role, '/refresh-token'), { data: refreshToken ? { refreshToken } : undefined });
export const changePasswordByRole = (role, payload) => apiRequest('post', authPath(role, '/change-password'), { data: payload });
export const getProfileByRole = (role) => apiRequest('get', authPath(role, '/profile'));

export const adminAuthApi = {
	createAdmin,
	getAllAdmins,
	toggleAdminStatus,
	getPlatformStats,
};

export const facultyAuthApi = {
	getAllFaculty,
	toggleFacultyStatus,
	uploadFacultyCsv,
	updateFacultyProfile,
};

export const studentAuthApi = {
	getAllStudents,
	toggleStudentStatus,
	uploadStudentsCsv,
};

export { apiRequestRaw };
