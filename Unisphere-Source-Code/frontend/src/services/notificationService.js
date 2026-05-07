import { apiRequest, apiRequestRaw } from './serviceUtils';

export const getMyNotifications = (params) => apiRequest('get', '/notifications', { params });
export const getUnreadCount = () => apiRequest('get', '/notifications/unread-count');
export const markAsRead = (notificationId) => apiRequest('patch', `/notifications/${notificationId}/read`);
export const markAllAsRead = () => apiRequest('patch', '/notifications/read-all');
export const deleteNotification = (notificationId) => apiRequest('delete', `/notifications/${notificationId}`);

export const notificationService = {
	getMyNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
};

export { apiRequestRaw };
