import { apiRequest, apiRequestRaw } from './serviceUtils';

export const getEventGroup = (clubId, eventId, params) => apiRequest('get', `/clubs/${clubId}/events/${eventId}/group`, { params });
export const getEventGroupMembers = (clubId, eventId, params) => apiRequest('get', `/clubs/${clubId}/events/${eventId}/group/members`, { params });
export const leaveEventGroup = (clubId, eventId) => apiRequest('delete', `/clubs/${clubId}/events/${eventId}/group/leave`);

export const eventGroupService = {
	getEventGroup,
	getEventGroupMembers,
	leaveEventGroup,
};

export { apiRequestRaw };
