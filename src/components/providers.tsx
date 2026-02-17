"use client";

import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { RoleProvider } from "./role-provider";
import { NotificationProvider } from "./notification-provider";
import { Toaster } from "react-hot-toast";
import { NotificationToastSystem } from "./notification-toast-system";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RoleProvider>
          <NotificationProvider>
            <Toaster position="top-right" />
            <NotificationToastSystem />
            {children}
          </NotificationProvider>
        </RoleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
