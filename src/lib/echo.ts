import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window { Pusher: typeof Pusher }
}

if (typeof window !== 'undefined') {
  window.Pusher = Pusher;
}

const createEcho = () => {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap2';

  if (!key) {
    console.warn('Pusher key not set — real-time features disabled');
    return null;
  }

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  const authBase = rawApiUrl.replace(/\/api\/?$/, '');

  return new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    forceTLS: true,
    authEndpoint: `${authBase}/broadcasting/auth`,
    auth: {
      headers: {
        // Getter so the token is read fresh on each auth request, not at module init
        get Authorization() {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          return `Bearer ${token ?? ''}`;
        },
        Accept: 'application/json',
      },
    },
  });
};

const echo = typeof window !== 'undefined' ? createEcho() : null;
export default echo;
