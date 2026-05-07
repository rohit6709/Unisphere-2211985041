import { apiRequest, apiRequestRaw } from './serviceUtils';

export const getMyNotices = (params) => apiRequest('get', '/notices/my', { params });
export const getMyPostedNotices = (params) => apiRequest('get', '/notices/posted', { params });
export const getNotice = (noticeId) => apiRequest('get', `/notices/${noticeId}`);
export const getAllNotices = (params) => apiRequest('get', '/notices', { params });

export const createNotice = (payload) => apiRequest('post', '/notices', { data: payload });
export const updateNotice = (noticeId, payload) => apiRequest('patch', `/notices/${noticeId}`, { data: payload });
export const deleteNotice = (noticeId) => apiRequest('delete', `/notices/${noticeId}`);

export const noticeService = {
	getMyNotices,
	getMyPostedNotices,
	getNotice,
	getAllNotices,
	createNotice,
	updateNotice,
	deleteNotice,
};

export { apiRequestRaw };
