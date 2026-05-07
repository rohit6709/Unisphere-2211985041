import { apiRequest, apiRequestRaw } from './serviceUtils';

export const getEventFeedback = (eventId) => apiRequest('get', `/feedback/${eventId}`);
export const submitFeedback = (payload) => apiRequest('post', '/feedback/submit', { data: payload });

export const feedbackService = {
  getEventFeedback,
  submitFeedback,
};

export { apiRequestRaw };