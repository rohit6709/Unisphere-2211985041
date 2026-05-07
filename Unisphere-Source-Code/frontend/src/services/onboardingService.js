import { apiRequest, apiRequestRaw } from './serviceUtils';

export const getInterestCategories = () => apiRequest('get', '/students/interest-categories');
export const saveInterests = (payload) => apiRequest('post', '/students/onboarding', { data: payload });
export const getClubRecommendations = () => apiRequest('get', '/students/club-recommendations');
export const updateInterests = (payload) => apiRequest('patch', '/students/interests', { data: payload });

export const onboardingService = {
	getInterestCategories,
	saveInterests,
	getClubRecommendations,
	updateInterests,
};

export { apiRequestRaw };
