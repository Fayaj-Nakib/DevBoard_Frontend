import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<'reverb'>;
  }
}

let echoInstance: Echo<'reverb'> | null = null;

export function getEcho(authToken: string): Echo<'reverb'> | null {
  if (echoInstance) return echoInstance;

  if (!process.env.NEXT_PUBLIC_REVERB_HOST) {
    console.warn('WebSocket not configured — real-time features disabled');
    return null;
  }

  window.Pusher = Pusher;

  // Strip trailing /api so the auth endpoint isn't doubled
  // (NEXT_PUBLIC_API_URL already includes /api, e.g. https://host/api)
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  const apiBaseUrl = rawApiUrl.replace(/\/api\/?$/, '');

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key:      process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost:   process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort:   Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 443),
    wssPort:  Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 443),
    forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBaseUrl}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
}

export function destroyEcho(): void {
  echoInstance?.disconnect();
  echoInstance = null;
}
