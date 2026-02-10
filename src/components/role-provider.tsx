'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './auth-provider';
import { Role } from '@/lib/types';

export type { Role } from '@/lib/types';

interface RoleContextType {
  role: Role;
  orgId: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const contextValue: RoleContextType = {
    role: user?.role || 'employee',
    orgId: user?.orgId || 'ORG001',
  };

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  const { user } = useAuth();
  
  if (context !== undefined) {
    return context;
  }
  
  return {
    role: user?.role || 'employee' as Role,
    orgId: user?.orgId || 'ORG001',
  };
}
