import React from 'react';
import { BellRing, CalendarDays, CheckCheck, Filter, MessageSquare, ShieldAlert, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { deleteNotification, getMyNotifications, markAllAsRead, markAsRead } from '@/services/notificationService';
import { useSocket } from '@/context/SocketContext';

const TYPE_LABELS = {
  event_submitted: 'Event',
  event_approved: 'Event',
  event_rejected: 'Event',
  event_live: 'Event',
  event_cancelled: 'Event',
  club_request_approved: 'Club',
  club_request_rejected: 'Club',
  club_member_removed: 'Club',
  club_role_assigned: 'Club',
  club_advisor_assigned: 'Club',
  registration_confirmed: 'Registration',
  new_message: 'Message',
  club_recommendation: 'Recommendation',
};

function getNotificationIcon(type) {
  if (type === 'new_message') return MessageSquare;
  if (type?.startsWith('event_')) return CalendarDays;
  if (type?.startsWith('club_')) return ShieldAlert;
  return BellRing;
}

function getNotificationTarget(notification) {
  const data = notification?.data || {};
  if (data.eventId) return `/events/${data.eventId}`;
  if (data.clubId && notification.type !== 'new_message') return `/clubs/${data.clubId}`;
  if (notification.type === 'new_message') return '/messages';
  return null;
}

export default function NotificationsPage() {
  useDocumentTitle('Notifications | Unisphere');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [filterMode, setFilterMode] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const notificationsQuery = useQuery({
    queryKey: ['notifications-page', filterMode, typeFilter, page],
    queryFn: () => getMyNotifications({
      page,
      limit: 20,
      isRead: filterMode === 'unread' ? false : undefined,
      type: typeFilter || undefined,
    }),
  });

  React.useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification) => {
      queryClient.setQueryData(['notifications-page', filterMode, typeFilter, page], (current) => {
        if (!current) return current;
        const matchesRead = filterMode !== 'unread' || !notification.isRead;
        const matchesType = !typeFilter || notification.type === typeFilter;
        if (!matchesRead || !matchesType || page !== 1) return current;
        return {
          ...current,
          notifications: [notification, ...(current.notifications || [])].slice(0, 20),
          unreadCount: (current.unreadCount || 0) + 1,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification', handleNewNotification);
    return () => socket.off('notification', handleNewNotification);
  }, [socket, queryClient, filterMode, typeFilter, page]);

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to mark notification as read'),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to mark all as read'),
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId) => deleteNotification(notificationId),
    onSuccess: () => {
      toast.success('Notification deleted');
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to delete notification'),
  });

  const notificationsData = notificationsQuery.data;
  const notifications = React.useMemo(
    () => notificationsData?.notifications ?? [],
    [notificationsData?.notifications]
  );
  const unreadCount = notificationsData?.unreadCount ?? 0;
  const pagination = notificationsData?.pagination ?? {};
  const notificationTypes = React.useMemo(() => {
    const types = new Set(notifications.map((notification) => notification.type));
    return Array.from(types);
  }, [notifications]);

  const openNotification = async (notification) => {
    const target = getNotificationTarget(notification);
    if (!notification.isRead) {
      try {
        await markReadMutation.mutateAsync(notification._id);
      } catch {
        return;
      }
    }
    if (target) {
      navigate(target);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Review platform activity in one place, filter unread items, jump to related resources, and keep the unread count under control.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {unreadCount} unread
          </div>
          <Button variant="outline" onClick={() => markAllMutation.mutate()} isLoading={markAllMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_auto_1fr]">
        <div className="inline-flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
          {[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilterMode(option.value);
                setPage(1);
              }}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                filterMode === option.value ? 'bg-white text-amber-700 shadow-sm dark:bg-gray-900 dark:text-amber-300' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            className="w-full bg-transparent py-3 text-sm outline-none"
          >
            <option value="">All types</option>
            {notificationTypes.map((type) => (
              <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
            ))}
          </select>
        </div>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 w-full rounded-3xl" />)}
        </div>
      ) : notifications.length ? (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const target = getNotificationTarget(notification);

            return (
              <article
                key={notification._id}
                className={`rounded-3xl border bg-white p-5 shadow-sm transition dark:bg-gray-900 ${
                  notification.isRead ? 'border-gray-200 dark:border-gray-800' : 'border-amber-300 dark:border-amber-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    className="flex min-w-0 flex-1 items-start gap-4 text-left"
                  >
                    <div className={`rounded-2xl p-3 ${
                      notification.isRead ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{notification.title}</h2>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {TYPE_LABELS[notification.type] || notification.type}
                        </span>
                        {!notification.isRead && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{notification.body}</p>
                      <p className="mt-3 text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</p>
                      {target && <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">Open related resource</p>}
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <Button
                        variant="outline"
                        onClick={() => markReadMutation.mutate(notification._id)}
                        isLoading={markReadMutation.isPending && markReadMutation.variables === notification._id}
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-red-600"
                      onClick={() => deleteMutation.mutate(notification._id)}
                      isLoading={deleteMutation.isPending && deleteMutation.variables === notification._id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No notifications found" description="There are no notifications for the current filters." icon={BellRing} />
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
