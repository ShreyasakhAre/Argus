'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Role = 'admin' | 'analyst' | 'department_head' | 'employee' | 'auditor';

export interface User {
  email: string;
  role: Role;
  orgId: string;
  name: string;
}

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

const roleNames: Record<Role, string> = {
  admin: 'Administrator',
  analyst: 'Fraud Analyst',
  department_head: 'Department Head',
  employee: 'Employee',
  auditor: 'Auditor',
};

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
        localStorage.removeItem('argus-token');
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

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      
      const userData: User = {
        email,
        role,
        orgId,
        name: roleNames[role],
      };

      const token = data.token || encodeJWT(userData);
      localStorage.setItem('argus-token', token);
      setUser(userData);
      
      return true;
    } catch {
      const userData: User = {
        email,
        role,
        orgId,
        name: roleNames[role],
      };
      const token = encodeJWT(userData);
      localStorage.setItem('argus-token', token);
      setUser(userData);
      return true;
    }
  };

  const logout = () => {
    localStorage.removeItem('argus-token');
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
