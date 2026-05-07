import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const getOriginFromBaseUrl = (baseUrl) => {
	try {
		return new URL(baseUrl).origin;
	} catch {
		return 'http://localhost:5000';
	}
};

const SOCKET_URL = getOriginFromBaseUrl(BASE_URL);

let socketInstance = null;

export const createSocket = (options = {}) => {
	if (socketInstance) {
		return socketInstance;
	}

	socketInstance = io(SOCKET_URL, {
		path: '/socket.io',
		withCredentials: true,
		autoConnect: true,
		transports: ['websocket', 'polling'],
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 1000,
		...options,
	});

	return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
	if (!socketInstance) return;
	socketInstance.disconnect();
	socketInstance = null;
};

