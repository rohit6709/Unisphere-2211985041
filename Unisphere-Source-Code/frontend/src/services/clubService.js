import { apiRequest, apiRequestRaw, createFormData } from './serviceUtils';

const getStoredUserId = () => {
	try {
		const rawUser = localStorage.getItem('unisphere_user');
		if (!rawUser) return null;
		const parsedUser = JSON.parse(rawUser);
		return parsedUser?._id || null;
	} catch {
		return null;
	}
};

const isSameId = (left, right) => left?.toString?.() === right?.toString?.();

const isMemberOfClub = (club, userId) => {
	if (!club || !userId) return false;

	if (isSameId(club?.president?._id || club?.president, userId)) return true;
	if (isSameId(club?.vicePresident?._id || club?.vicePresident, userId)) return true;

	const memberList = Array.isArray(club?.members) ? club.members : [];
	if (memberList.some((member) => isSameId(member?._id || member, userId))) return true;

	const advisorList = Array.isArray(club?.advisors) ? club.advisors : [];
	if (advisorList.some((advisor) => isSameId(advisor?._id || advisor, userId))) return true;

	return false;
};

export const getAllClubs = (params) => apiRequest('get', '/clubs/get-all-clubs', { params });
export const getClubById = (clubId) => apiRequest('get', `/clubs/get-club/${clubId}`);
export const getClubProfile = (clubId) => apiRequest('get', `/clubs/${clubId}/profile`);
export const getClubMembers = (clubId, params) => apiRequest('get', `/clubs/${clubId}/members`, { params });
export const getClubTags = (clubId) => apiRequest('get', `/clubs/${clubId}/tags`);
export const getPendingClubs = (params) => apiRequest('get', '/clubs/admin/pending-clubs', { params });
export const getMyClubs = async () => {
	try {
		return await apiRequest('get', '/clubs/my-clubs');
	} catch (error) {
		// Backend currently restricts this endpoint to role "student" only.
		// Club leaders still need the same UI, so fallback to a filtered club list.
		if (error?.response?.status !== 403) throw error;

		const userId = getStoredUserId();
		if (!userId) throw error;

		const data = await getAllClubs({ page: 1, limit: 500 });
		const clubs = (data?.clubs || []).filter((club) => isMemberOfClub(club, userId));
		return { clubs };
	}
};
export const getMyAdvisedClubs = () => apiRequest('get', '/clubs/my-advised-clubs');

export const createClub = (payload) => apiRequest('post', '/clubs/create-club', { data: payload });
export const requestClub = (payload) => apiRequest('post', '/clubs/request-club', { data: payload });
export const joinClub = (clubId) => apiRequest('post', `/clubs/join-club/${clubId}`);
export const leaveClub = (clubId) => apiRequest('post', `/clubs/leave-club/${clubId}`);

export const updateClub = (clubId, payload) => apiRequest('patch', `/clubs/update-club/${clubId}`, { data: payload });
export const reviewClubRequest = (clubId, payload) => apiRequest('patch', `/clubs/admin/${clubId}/review-request`, { data: payload });
export const assignPresident = (clubId, payload) => apiRequest('patch', `/clubs/${clubId}/assign-president`, { data: payload });
export const assignVicePresident = (clubId, payload) => apiRequest('patch', `/clubs/${clubId}/assign-vice-president`, { data: payload });
export const assignAdvisor = (clubId, payload) => apiRequest('patch', `/clubs/admin/${clubId}/assign-advisor`, { data: payload });
export const removeAdvisor = (clubId) => apiRequest('delete', `/clubs/admin/${clubId}/remove-advisor`);
export const toggleClubStatus = (clubId) => apiRequest('patch', `/clubs/admin/${clubId}/toggle-status`);

export const updateClubTags = (clubId, payload) => apiRequest('patch', `/clubs/${clubId}/tags`, { data: payload });
export const removeMember = (clubId, rollNo) => apiRequest('delete', `/clubs/${clubId}/remove-member/${rollNo}`);

export const uploadClubAssets = (payload) => {
	const formData = createFormData(payload);
	return apiRequest('post', '/uploads/image', { data: formData });
};

export const clubService = {
	getAllClubs,
	getClubById,
	getClubProfile,
	getClubMembers,
	getClubTags,
	getPendingClubs,
	getMyClubs,
	getMyAdvisedClubs,
	createClub,
	requestClub,
	joinClub,
	leaveClub,
	updateClub,
	reviewClubRequest,
	assignPresident,
	assignVicePresident,
	assignAdvisor,
	removeAdvisor,
	toggleClubStatus,
	updateClubTags,
	removeMember,
	uploadClubAssets,
};

export { apiRequestRaw };
