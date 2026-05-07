import { apiRequest, apiRequestRaw } from './serviceUtils';

export const registerForEvent = (eventId) => apiRequest('post', `/event-registrations/${eventId}/register`);
export const unregisterFromEvent = (eventId) => apiRequest('delete', `/event-registrations/${eventId}/unregister`);
export const cancelRegistration = (eventId) => unregisterFromEvent(eventId);
export const getEventRegistrations = (eventId, params) => apiRequest('get', `/event-registrations/${eventId}/registrations`, { params });
export const getRegistrations = (eventId, params) => getEventRegistrations(eventId, params);
export const getMyRegistrations = (params) => apiRequest('get', '/event-registrations/my-registrations', { params });
export const getAllRegistrations = (params) => apiRequest('get', '/event-registrations/all', { params });
export const exportRegistrations = (eventId, params) => apiRequestRaw('get', `/event-registrations/${eventId}/export`, { params, responseType: 'blob' });

export const getMyRegistrationStatus = async (eventId, params = {}) => {
	const registrations = await getMyRegistrations(params);
	const list = registrations?.registrations || registrations || [];

	return list.find((registration) => {
		const registrationEventId = registration?.event?._id || registration?.event;
		return registrationEventId?.toString?.() === eventId?.toString?.();
	}) || null;
};

export const registrationService = {
	registerForEvent,
	unregisterFromEvent,
	cancelRegistration,
	getEventRegistrations,
	getRegistrations,
	getMyRegistrations,
	getAllRegistrations,
	exportRegistrations,
	getMyRegistrationStatus,
};

export { apiRequestRaw };
