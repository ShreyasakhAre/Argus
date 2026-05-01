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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function encodeJWT(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }));
  const signature = btoa('demo-signature');
  return `${base64Header}.${base64Payload}.${signature}`;
}

function decodeJWT(token: string): User | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    if (payload.exp < Date.now()) {
      return null;
    }
    
    return {
      email: payload.email,
      role: payload.role,
      orgId: payload.orgId,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

const roleNames: Record<Role, string> = ROLE_NAMES;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('argus-token');
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded) {
        setUser(decoded);
      } else {
        // Try argus-user as fallback
        const stored = localStorage.getItem('argus-user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed);
          } catch {
            localStorage.removeItem('argus-token');
            localStorage.removeItem('argus-user');
          }
        } else {
          localStorage.removeItem('argus-token');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string, role: Role, orgId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: _password, role, orgId }),
      });

      const userData: User = {
        email: email || 'demo@argus.security',
        role,
        orgId: orgId || 'ORG001',
        name: roleNames[role] || 'Demo User',
      };

      if (res.ok) {
        const text = await res.text();
        let data: any = {};
        try { data = JSON.parse(text); } catch { /* ignore */ }
        const token = data.token || encodeJWT(userData);
        localStorage.setItem('argus-token', token);
        localStorage.setItem('argus-user', JSON.stringify(userData));
      } else {
        // Demo mode fallback — always allow login
        const token = encodeJWT(userData);
        localStorage.setItem('argus-token', token);
        localStorage.setItem('argus-user', JSON.stringify(userData));
      }

      setUser(userData);
      return true;
    } catch {
      // Network error fallback — still allow demo login
      const userData: User = {
        email: email || 'demo@argus.security',
        role,
        orgId: orgId || 'ORG001',
        name: roleNames[role] || 'Demo User',
      };
      const token = encodeJWT(userData);
      localStorage.setItem('argus-token', token);
      localStorage.setItem('argus-user', JSON.stringify(userData));
      setUser(userData);
      return true;
    }
  };

  const logout = () => {
    localStorage.removeItem('argus-token');
    localStorage.removeItem('argus-user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
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
