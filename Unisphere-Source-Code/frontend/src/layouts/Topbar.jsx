import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Moon, Sun, User as UserIcon, Bell, CheckCircle, Info, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { useThemeContext } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { cn } from '@/utils/cn';
import { getProfilePath } from '@/utils/roleRedirect';
import { getMyNotifications, getUnreadCount, markAllAsRead as markAllNotificationsAsRead, markAsRead as markNotificationAsRead } from '@/services/notificationService';

const getRoleDisplay = (currentRole) => {
  if (currentRole === 'club_president') return 'Student';
  if (currentRole === 'club_vice_president') return 'Student';
  if (currentRole === 'hod') return 'Faculty';
  if (currentRole === 'superadmin') return 'Admin';
  return currentRole ? currentRole.replace(/_/g, ' ') : '';
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const data = await getMyNotifications({ page: 1, limit: 8 });
      return data?.notifications || [];
    },
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => getUnreadCount(),
  });

  const unreadCount = unreadData?.count ?? notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification) => {
      queryClient.setQueryData(['notifications'], (old) => {
        return [notification, ...(old || [])];
      });
      queryClient.setQueryData(['notifications-unread-count'], (old) => ({
        ...(old || {}),
        count: (old?.count || 0) + (notification?.isRead ? 0 : 1),
      }));
    };
    socket.on('notification', handleNewNotification);
    return () => socket.off('notification', handleNewNotification);
  }, [socket, queryClient]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => markNotificationAsRead(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['notifications'], (old) => 
        (old || []).map((n) => n._id === id ? { ...n, isRead: true } : n)
      );
      queryClient.setQueryData(['notifications-unread-count'], (old) => ({
        ...(old || {}),
        count: Math.max(0, (old?.count || 0) - 1),
      }));
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.setQueryData(['notifications'], (old) => 
        (old || []).map((n) => ({ ...n, isRead: true }))
      );
      queryClient.setQueryData(['notifications-unread-count'], (old) => ({
        ...(old || {}),
        count: 0,
      }));
    }
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-[var(--text)] hover:bg-[var(--bg-card-alt)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--bg-card)]"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl overflow-hidden z-50">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-card-alt)]/50">
              <h3 className="font-heading font-bold text-[var(--text-h)]">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllAsRead.mutate()}
                  className="text-xs text-[var(--primary)] hover:underline font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-[var(--text)]">
                  <Bell className="w-8 h-8 mx-auto opacity-20 mb-2" />
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {notifications.map((notification) => (
                    <div 
                      key={notification._id} 
                      className={cn(
                        "p-4 transition-colors hover:bg-[var(--bg-card-alt)] group relative",
                        !notification.isRead ? "bg-[var(--primary-glow)]" : ""
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="shrink-0 mt-0.5">
                          {notification.type === 'SUCCESS' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : notification.type === 'ALERT' ? (
                            <Info className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Bell className="w-5 h-5 text-[var(--primary)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium mb-1", !notification.isRead ? "text-[var(--text-h)]" : "text-[var(--text)]")}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-[var(--text)] mb-2 line-clamp-2">
                            {notification.body}
                          </p>
                          <span className="text-[10px] text-[var(--text)] opacity-70">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <button 
                            onClick={() => markAsReadMutation.mutate(notification._id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-card)] rounded transition-all shrink-0 self-start text-[var(--primary)]"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-[var(--border)] bg-[var(--bg-card-alt)]/50 text-center">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-[var(--primary)] hover:underline transition-colors"
              >
                View all notifications
              </Link>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Topbar = ({ setSidebarOpen }) => {
  const { theme, toggleTheme } = useThemeContext();
  const { user, role, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const roleDisplay = getRoleDisplay(role);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-[var(--text)] hover:bg-[var(--bg-card-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <div className="ml-4 md:hidden">
            <span className="text-xl font-heading font-extrabold text-[var(--text-h)] tracking-tight">
              Unisphere
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[var(--text)] hover:bg-[var(--bg-card-alt)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <NotificationDropdown />

          <div className="relative ml-1 sm:ml-3">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-white shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={16} />}
              </div>
              <div className="hidden sm:flex sm:flex-col sm:items-start sm:ml-1">
                <span className="text-sm font-medium text-[var(--text-h)] leading-none">{user?.name || 'User'}</span>
                <span className="text-xs text-[var(--text)] mt-1">{roleDisplay}</span>
              </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[var(--bg-card)] py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-[var(--border)]">
                  <div className="px-4 py-2 border-b border-[var(--border)] sm:hidden">
                    <p className="text-sm font-medium text-[var(--text-h)]">{user?.name}</p>
                    <p className="text-xs text-[var(--text)] truncate">{user?.email}</p>
                  </div>
                  <Link
                    to={getProfilePath(role)}
                    onClick={() => setIsProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-h)] transition-colors"
                  >
                    Your Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-[var(--red)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
