'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

import api from '@/lib/api';
import { cn, initials } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import echo from '@/lib/echo';
import type { Notification } from '@/types';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

function getActorName(n: Notification): string {
  return (
    n.data.mentioned_by ??
    n.data.assigned_by ??
    n.data.comment_by ??
    n.data.from ??
    'DevBoard'
  );
}

function getMessage(n: Notification): string {
  if (n.data.message) return n.data.message;
  const task = n.data.task_title ? `"${n.data.task_title}"` : 'a task';
  if (n.type === 'mention_notification') return `mentioned you in ${task}`;
  if (n.type === 'assignment_notification') return `assigned you to ${task}`;
  if (n.type === 'comment_notification') return `commented on ${task}`;
  return `updated ${task}`;
}

function getTaskLink(n: Notification, workspaceId: string): string | null {
  if (n.data.task_id) {
    const project = n.data.project;
    if (project) {
      return `/workspaces/${workspaceId}/projects/${project}`;
    }
  }
  return null;
}

interface NotifListProps {
  items: Notification[];
  onNotifClick: (n: Notification) => void;
}

function NotifList({ items, onNotifClick }: NotifListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-6">
        <Bell className="w-8 h-8 text-foreground-muted mb-3" />
        <p className="text-sm font-medium">All caught up</p>
        <p className="text-xs text-foreground-tertiary mt-1">No notifications here</p>
      </div>
    );
  }
  return (
    <>
      {items.map((n) => (
        <div
          key={n.id}
          onClick={() => onNotifClick(n)}
          className={cn(
            'flex gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-accent/30',
            !n.read_at && 'bg-primary-subtle/10 border-l-2 border-primary',
          )}
        >
          <Avatar size="sm" className="flex-shrink-0 mt-0.5">
            <AvatarFallback className="text-[10px]">{initials(getActorName(n))}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-relaxed">
              <span className="font-medium">{getActorName(n)}</span>{' '}
              {getMessage(n)}
            </p>
            <p className="text-[10px] text-foreground-tertiary mt-1" suppressHydrationWarning>
              {formatRelativeTime(n.created_at)}
            </p>
          </div>
          {!n.read_at && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
          )}
        </div>
      ))}
    </>
  );
}

export default function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get('/notifications')
      .then((r) => {
        setNotifications(r.data.notifications?.data ?? []);
        setUnreadCount(r.data.unread_count ?? 0);
      })
      .catch(() => {});
  }, [refreshKey]);

  // Real-time via Pusher
  useEffect(() => {
    if (!user?.id) return;
    const echoClient = echo;
    if (!echoClient) return; // WebSocket not configured

    const channel = echoClient.private(`private-user.${user.id}`);
    channel.listen('.notification.created', (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((c) => c + 1);
    });
    return () => { echoClient.leave(`private-user.${user.id}`); };
  }, [user?.id]);

  const markRead = (id: string) => {
    api.patch(`/notifications/${id}/read`)
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      })
      .catch(() => {});
  };

  const markAllRead = () => {
    api.patch('/notifications/read-all')
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        setUnreadCount(0);
      })
      .catch(() => {});
  };

  const handleNotifClick = (n: Notification) => {
    if (!n.read_at) markRead(n.id);
    const workspaceId = user?.id ?? '';
    const link = getTaskLink(n, workspaceId);
    if (link) { setOpen(false); router.push(link); }
  };

  const unread = notifications.filter((n) => !n.read_at);
  const mentions = notifications.filter((n) => n.type === 'mention_notification');

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => { setOpen(true); setRefreshKey((k) => k + 1); }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col gap-0" showCloseButton={false}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <h2 className="text-base font-semibold">Notifications</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              Mark all read
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="flex flex-col flex-1 min-h-0">
            <TabsList
              variant="line"
              className="w-full rounded-none border-b border-border bg-transparent h-9 px-4 justify-start gap-4 flex-shrink-0"
            >
              <TabsTrigger value="all" className="text-xs pb-2">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs pb-2">
                Unread{unreadCount > 0 && ` (${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="mentions" className="text-xs pb-2">Mentions</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex-1 overflow-y-auto m-0">
              <NotifList items={notifications} onNotifClick={handleNotifClick} />
            </TabsContent>
            <TabsContent value="unread" className="flex-1 overflow-y-auto m-0">
              <NotifList items={unread} onNotifClick={handleNotifClick} />
            </TabsContent>
            <TabsContent value="mentions" className="flex-1 overflow-y-auto m-0">
              <NotifList items={mentions} onNotifClick={handleNotifClick} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
