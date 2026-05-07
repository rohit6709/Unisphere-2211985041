import { apiRequest, apiRequestRaw, createFormData } from './serviceUtils';

export const getAllEvents = (params) => apiRequest('get', '/events/all-events', { params });
export const getPublicEvents = (params) => apiRequest('get', '/events/public', { params });
export const getPublicEvent = (eventId) => apiRequest('get', `/events/public/${eventId}`);
export const getClubEvents = (clubId, params) => apiRequest('get', `/clubs/${clubId}/events`, { params });
export const getClubEvent = (clubId, eventId) => apiRequest('get', `/clubs/${clubId}/events/${eventId}`);
export const getEventLogs = (clubId, eventId, params) => apiRequest('get', `/clubs/${clubId}/events/${eventId}/logs`, { params });
export const getPendingEvents = (clubId, params) => apiRequest('get', `/clubs/${clubId}/events/pending`, { params });
export const getMySubmittedEvents = (params) => apiRequest('get', '/events/my-submitted', { params });
export const getAdviseePendingEvents = (params) => apiRequest('get', '/events/advisee-pending', { params });
export const getGlobalPendingRequests = (params) => apiRequest('get', '/events/pending-requests', { params });

export const createEvent = (clubId, payload) => apiRequest('post', `/clubs/${clubId}/events`, { data: payload });
export const submitEvent = (clubId, eventId) => apiRequest('patch', `/clubs/${clubId}/events/${eventId}/submit`);
export const updateEvent = (clubId, eventId, payload) => apiRequest('patch', `/clubs/${clubId}/events/${eventId}/update`, { data: payload });
export const reviewEvent = (clubId, eventId, payload) => apiRequest('patch', `/clubs/${clubId}/events/${eventId}/review`, { data: payload });
export const cancelEvent = (clubId, eventId, payload) => apiRequest('patch', `/clubs/${clubId}/events/${eventId}/cancel`, { data: payload });
export const deleteEvent = (eventId) => apiRequest('delete', `/events/${eventId}`);
export const toggleFeatured = (eventId) => apiRequest('patch', `/events/${eventId}/toggle-featured`);

export const getEventGroup = (clubId, eventId, params) => apiRequest('get', `/clubs/${clubId}/events/${eventId}/group`, { params });
export const getEventGroupMembers = (clubId, eventId, params) => apiRequest('get', `/clubs/${clubId}/events/${eventId}/group/members`, { params });
export const uploadEventPoster = (file) => {
	const formData = createFormData({ image: file });
	return apiRequest('post', '/uploads/image', { data: formData });
};

export const eventService = {
	getAllEvents,
	getPublicEvents,
	getPublicEvent,
	getClubEvents,
	getClubEvent,
	getEventLogs,
	getPendingEvents,
	getMySubmittedEvents,
	getAdviseePendingEvents,
	getGlobalPendingRequests,
	createEvent,
	submitEvent,
	updateEvent,
	reviewEvent,
	cancelEvent,
	deleteEvent,
	toggleFeatured,
	getEventGroup,
	getEventGroupMembers,
	uploadEventPoster,
};

export { apiRequestRaw };
