import React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSocket } from '@/context/SocketContext';

const FRAGMENTS_BY_NOTIFICATION = {
  event_submitted: [
    'events',
    'event',
    'event-admin-list',
    'admin-events',
    'faculty-events',
    'advisee-pending-events',
    'faculty-pending-events',
    'admin-pending-requests',
    'my-submitted-events',
  ],
  event_approved: [
    'events',
    'event',
    'event-admin-list',
    'admin-events',
    'faculty-events',
    'my-submitted-events',
    'registration-status',
  ],
  event_rejected: [
    'events',
    'event',
    'event-admin-list',
    'admin-events',
    'faculty-events',
    'my-submitted-events',
  ],
  event_live: ['events', 'event', 'discovery-events'],
  event_cancelled: [
    'events',
    'event',
    'my-registrations',
    'registration',
    'registration-status',
    'registration-admin-events',
    'registration-admin-event-detail',
  ],
  club_request_approved: [
    'clubs',
    'club',
    'my-clubs',
    'admin-pending-clubs',
    'admin-pending-requests',
    'faculty-clubs',
    'advised-clubs',
    'club-admin-list',
    'admin-clubs',
  ],
  club_request_rejected: [
    'admin-pending-clubs',
    'admin-pending-requests',
    'clubs',
    'club',
    'my-clubs',
    'faculty-clubs',
    'advised-clubs',
  ],
  club_member_removed: ['clubs', 'club', 'my-clubs', 'club-governance', 'club-members'],
  club_role_assigned: [
    'clubs',
    'club',
    'my-clubs',
    'club-governance',
    'club-members',
    'club-leadership-detail',
    'club-admin-detail',
  ],
  registration_confirmed: [
    'my-registrations',
    'registration',
    'registration-status',
    'registration-admin-events',
    'registration-admin-event-detail',
    'event',
    'events',
  ],
  new_message: ['messaging-hub-rooms', 'chat-room-messages'],
};

const BASE_REALTIME_FRAGMENTS = ['notifications', 'notifications-page'];

const normalizeQueryKey = (queryKey) => {
  if (!Array.isArray(queryKey)) {
    return [String(queryKey || '')];
  }

  return queryKey
    .map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part === 'number' || typeof part === 'boolean') return String(part);
      if (part == null) return '';
      try {
        return JSON.stringify(part);
      } catch {
        return String(part);
      }
    })
    .filter(Boolean);
};

const matchesFragments = (queryKey, fragments) => {
  const normalized = normalizeQueryKey(queryKey);
  return normalized.some((part) => fragments.some((fragment) => part.includes(fragment)));
};

export function RealtimeSyncProvider({ children }) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!socket) return undefined;

    const invalidateByFragments = (fragments) => {
      if (!Array.isArray(fragments) || !fragments.length) return;
      queryClient.invalidateQueries({
        predicate: (query) => matchesFragments(query.queryKey, fragments),
      });
    };

    const handleRealtimeNotification = (notification) => {
      const type = notification?.type;
      const typeFragments = FRAGMENTS_BY_NOTIFICATION[type] || [];
      const allFragments = [...BASE_REALTIME_FRAGMENTS, ...typeFragments];
      invalidateByFragments(allFragments);
    };

    const handleSocketConnected = () => {
      queryClient.refetchQueries({ type: 'active' });
    };

    socket.on('notification', handleRealtimeNotification);
    socket.on('connect', handleSocketConnected);

    return () => {
      socket.off('notification', handleRealtimeNotification);
      socket.off('connect', handleSocketConnected);
    };
  }, [socket, queryClient]);

  React.useEffect(() => {
    const shouldRefetch = () => typeof document !== 'undefined' && document.visibilityState === 'visible';

    const intervalId = window.setInterval(() => {
      if (!shouldRefetch()) return;
      queryClient.refetchQueries({ type: 'active' });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [queryClient]);

  return children;
}
