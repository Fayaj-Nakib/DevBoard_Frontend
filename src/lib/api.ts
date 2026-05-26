import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    if (err.response?.status === 403 && err.response?.data?.message === '2fa_required') {
      const match = (err.config?.url as string | undefined)?.match(/\/workspaces\/([^/?]+)/);
      if (match) {
        window.location.href = `/workspaces/${match[1]}/settings?tab=security`;
      }
    }
    return Promise.reject(err);
  }
);

export default api;