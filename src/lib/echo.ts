import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<'reverb'>;
  }
}

let echoInstance: Echo<'reverb'> | null = null;

export function getEcho(authToken: string): Echo<'reverb'> {
  if (echoInstance) return echoInstance;

  window.Pusher = Pusher;

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

  // Derive WebSocket host and scheme from the API URL so production works
  // automatically once NEXT_PUBLIC_API_URL is set to the Render backend URL.
  // Override with NEXT_PUBLIC_REVERB_* only if Reverb runs on a separate host.
  let derivedHost = 'localhost';
  let derivedScheme = 'http';
  try {
    const parsed = new URL(rawApiUrl);
    derivedHost = parsed.hostname;
    derivedScheme = parsed.protocol.replace(':', '');
  } catch {
    // keep localhost defaults if the URL is somehow unparseable
  }

  const reverbScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? derivedScheme;
  const reverbHost   = process.env.NEXT_PUBLIC_REVERB_HOST   ?? derivedHost;
  const defaultPort  = reverbScheme === 'https' ? 443 : 8080;
  const reverbPort   = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? defaultPort);

  // Strip a trailing /api segment so the auth endpoint isn't doubled
  // (NEXT_PUBLIC_API_URL already includes /api, e.g. https://host/api)
  const apiBaseUrl = rawApiUrl.replace(/\/api\/?$/, '');

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key:      process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? 'devboard-key',
    wsHost:   reverbHost,
    wsPort:   reverbPort,
    wssPort:  reverbPort,
    forceTLS: reverbScheme === 'https',
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
