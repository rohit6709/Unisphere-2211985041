import { Router } from 'express';
import { getMyNotifications, getUnreadCount,markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const notificationRouter = Router();

notificationRouter.use(verifyJWT);

notificationRouter.route('/').get(getMyNotifications);
notificationRouter.route('/unread-count').get(getUnreadCount);
notificationRouter.route('/read-all').patch(markAllAsRead);

notificationRouter.route('/:notificationId/read').patch(markAsRead);
notificationRouter.route('/:notificationId').delete(deleteNotification);

export default notificationRouter;