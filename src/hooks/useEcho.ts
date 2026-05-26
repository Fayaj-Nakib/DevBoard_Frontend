import { useEffect, useRef, useState } from 'react';
import type Echo from 'laravel-echo';
import { getEcho, destroyEcho } from '@/lib/echo';

export function useEcho() {
  const [echo, setEcho] = useState<Echo<'reverb'> | null>(null);
  const [connected, setConnected] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = localStorage.getItem('token');
    if (!token) return;

    const instance = getEcho(token);
    setEcho(instance);

    instance.connector.pusher.connection.bind('connected', () => setConnected(true));
    instance.connector.pusher.connection.bind('disconnected', () => setConnected(false));
    instance.connector.pusher.connection.bind('unavailable', () => setConnected(false));

    return () => {
      destroyEcho();
      setEcho(null);
      setConnected(false);
      initialized.current = false;
    };
  }, []);

  return { echo, connected };
}
