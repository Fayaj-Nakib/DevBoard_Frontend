import { useEffect, useState } from 'react';
import echo from '@/lib/echo';

export function useEcho() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!echo) return; // WebSocket not configured

    const conn = echo.connector.pusher.connection;
    const onConnected    = () => setConnected(true);
    const onDisconnected = () => setConnected(false);
    const onUnavailable  = () => setConnected(false);

    conn.bind('connected', onConnected);
    conn.bind('disconnected', onDisconnected);
    conn.bind('unavailable', onUnavailable);

    return () => {
      conn.unbind('connected', onConnected);
      conn.unbind('disconnected', onDisconnected);
      conn.unbind('unavailable', onUnavailable);
    };
  }, []);

  return { echo, connected };
}
