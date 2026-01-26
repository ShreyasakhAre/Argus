'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Role } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Shield, Search, Building2, User, FileText, Loader2, Sun, Moon, Info } from 'lucide-react';

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  admin: { 
    label: 'Admin', 
    icon: <Shield className="w-4 h-4" />, 
    color: 'text-red-500',
    description: 'Full system access, ML model management'
  },
  analyst: { 
    label: 'Fraud Analyst', 
    icon: <Search className="w-4 h-4" />, 
    color: 'text-blue-500',
    description: 'Review and approve/reject flagged items'
  },
  department_head: { 
    label: 'Department Head', 
    icon: <Building2 className="w-4 h-4" />, 
    color: 'text-green-500',
    description: 'Department-level fraud monitoring'
  },
  employee: { 
    label: 'Employee', 
    icon: <User className="w-4 h-4" />, 
    color: 'text-yellow-500',
    description: 'View personal notifications and alerts'
  },
  auditor: { 
    label: 'Auditor', 
    icon: <FileText className="w-4 h-4" />, 
    color: 'text-purple-500',
    description: 'Compliance reporting and audit logs'
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [email, setEmail] = useState('demo@argus.security');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState<Role>('admin');
  const [orgId, setOrgId] = useState('ORG001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const success = await login(email, password, role, orgId);
      if (success) {
        router.push('/');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background grid-pattern flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-4 rounded-2xl">
              <Eye className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">ARGUS</h1>
            <p className="text-muted-foreground">Fraud Detection System</p>
          </div>
        </div>

        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-foreground">Demo Login</CardTitle>
            <CardDescription>
              Demo authentication for evaluation purposes. Select a role to explore different dashboard views.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@argus.security"
                  className="bg-muted border-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-muted border-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                  <SelectTrigger className="bg-muted border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {Object.entries(roleConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={config.color}>{config.icon}</span>
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roleConfig[role].description}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Organization</label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger className="bg-muted border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="ORG001">ORG001 - Acme Corp</SelectItem>
                    <SelectItem value="ORG002">ORG002 - TechStart Inc</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Demo Mode</p>
              <p>This is a demonstration environment. Any email/password combination will work. 
              Select different roles to explore role-specific dashboards and features.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
