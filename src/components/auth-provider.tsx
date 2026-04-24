'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Role, User as BaseUser, ROLE_NAMES } from '@/lib/types';

export type { Role } from '@/lib/types';
export interface User extends BaseUser {}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: Role, orgId: string) => Promise<boolean>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleNames: Record<Role, string> = ROLE_NAMES;

function parseToken(token: string): User | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    // Check exp (JWT standard: seconds since epoch)
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return {
      email: payload.email,
      role: payload.role,
      orgId: payload.orgId,
      name: payload.name || roleNames[payload.role as Role] || payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('argus-token');
    if (token) {
      const decoded = parseToken(token);
      if (decoded) {
        setUser(decoded);
      } else {
        // Token invalid or expired — hard remove
        localStorage.removeItem('argus-token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
    role: Role,
    orgId: string
  ): Promise<boolean> => {
    // NEVER catches and silently succeeds. If the backend is unreachable, this throws.
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, orgId }),
    });

    if (!res.ok) {
      // Let the caller handle the error message from the response
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Login failed (${res.status})`);
    }

    const data = await res.json();

    if (!data.success || !data.token) {
      throw new Error(data.message || 'Login failed — no token returned.');
    }

    localStorage.setItem('argus-token', data.token);

    const userData: User = {
      email: data.user?.email ?? email,
      role: data.user?.role ?? role,
      orgId: data.user?.orgId ?? orgId,
      name: data.user?.name ?? roleNames[role],
    };
    setUser(userData);
    
    // Force dashboard refetch after login by clearing any cached data
    // Dispatch custom event to trigger dashboard refresh
    window.dispatchEvent(new CustomEvent('auth_login_success', { detail: userData }));
    
    return true;
  };

  const logout = () => {
    localStorage.removeItem('argus-token');
    setUser(null);
  };

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('argus-token');
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
