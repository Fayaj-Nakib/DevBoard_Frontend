'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getEcho } from '@/lib/echo';

interface Notification {
  id: string;
  type: string;
  data: { message?: string; task_title?: string };
  read_at: string | null;
  created_at: string;
}

export default function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => setVersion((v) => v + 1);

  useEffect(() => {
    api
      .get('/notifications')
      .then((r) => {
        setNotifications(r.data.notifications?.data ?? []);
        setUnreadCount(r.data.unread_count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [version]);

  // Subscribe to personal notification channel via Reverb
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const echo = getEcho(token);
    const channel = echo.private(`private-user.${user.id}`);

    channel.listen('.notification.created', (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      echo.leave(`private-user.${user.id}`);
    };
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  const displayText = (n: Notification) =>
    n.data?.message ?? n.data?.task_title ?? n.type;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchNotifications();
        }}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y">
            {loading && notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && markRead(n.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.read_at ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug truncate">
                        {displayText(n)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
