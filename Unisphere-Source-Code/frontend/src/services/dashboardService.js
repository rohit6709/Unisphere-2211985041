import { apiRequest, apiRequestRaw } from './serviceUtils';
import { getAllClubs, getMyAdvisedClubs } from './clubService';
import { getAdviseePendingEvents, getAllEvents, getPublicEvents } from './eventService';

export const getStudentDashboard = (params) => apiRequest('get', '/students/dashboard', { params });

const getFallbackDashboardData = async () => {
	const [clubsData, eventsData] = await Promise.all([
		getAllClubs(),
		getPublicEvents(),
	]);

	return {
		clubs: clubsData?.clubs ?? [],
		events: eventsData?.events ?? [],
	};
};

export const getFacultyDashboard = async () => {
	try {
		const [clubsData, eventsData] = await Promise.all([
			getMyAdvisedClubs(),
			getAdviseePendingEvents(),
		]);

		return {
			clubs: clubsData?.clubs ?? clubsData ?? [],
			events: eventsData?.events ?? eventsData ?? [],
		};
	} catch {
		return getFallbackDashboardData();
	}
};

export const getAdminDashboard = async () => {
	try {
		const [clubsData, eventsData] = await Promise.all([
			getAllClubs(),
			getAllEvents(),
		]);

		return {
			clubs: clubsData?.clubs ?? clubsData ?? [],
			events: eventsData?.events ?? eventsData ?? [],
		};
	} catch {
		return getFallbackDashboardData();
	}
};

export const dashboardService = {
	getStudentDashboard,
	getFacultyDashboard,
	getAdminDashboard,
};

export { apiRequestRaw };
