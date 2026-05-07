import { apiRequest, apiRequestRaw } from './serviceUtils';

export const getChatRooms = () => apiRequest('get', '/chat/rooms');
export const searchChatUsers = (params) => apiRequest('get', '/chat/users/search', { params });
export const createDirectConversation = (payload) => apiRequest('post', '/chat/direct-conversations', { data: payload });
export const getMessageHistory = (roomType, roomId, params) => apiRequest('get', `/chat/${roomType}/${roomId}/messages`, { params });
export const deleteMessage = (roomType, roomId, messageId) => apiRequest('delete', `/chat/${roomType}/${roomId}/messages/${messageId}`);

export const chatService = {
	getChatRooms,
	searchChatUsers,
	createDirectConversation,
	getMessageHistory,
	deleteMessage,
};

export { apiRequestRaw };
