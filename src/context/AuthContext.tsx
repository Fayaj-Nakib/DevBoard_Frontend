'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const r = await api.get('/auth/me');
        setToken(savedToken);
        setUser(r.data);
      } catch {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    router.push('/workspaces');
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      password_confirmation: password,
    });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    router.push('/workspaces');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Server-side logout failed — still clear local auth state
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success("You've been signed out");
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};