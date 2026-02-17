import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'fraud_analyst' | 'department_head' | 'employee' | 'auditor';
  passwordHash: string;
  forcePasswordReset: boolean;
  lastPasswordChange: Date;
}

let users: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@argus.com',
    role: 'admin',
    passwordHash: '$2a$10$example.hash.for.password123',
    forcePasswordReset: false,
    lastPasswordChange: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Fraud Analyst',
    email: 'analyst@argus.com',
    role: 'fraud_analyst',
    passwordHash: '$2a$10$example.hash.for.password123',
    forcePasswordReset: false,
    lastPasswordChange: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Department Head',
    email: 'head@argus.com',
    role: 'department_head',
    passwordHash: '$2a$10$example.hash.for.password123',
    forcePasswordReset: false,
    lastPasswordChange: new Date('2024-01-01')
  },
  {
    id: '4',
    name: 'Employee',
    email: 'employee@argus.com',
    role: 'employee',
    passwordHash: '$2a$10$example.hash.for.password123',
    forcePasswordReset: false,
    lastPasswordChange: new Date('2024-01-01')
  },
  {
    id: '5',
    name: 'Auditor',
    email: 'auditor@argus.com',
    role: 'auditor',
    passwordHash: '$2a$10$example.hash.for.password123',
    forcePasswordReset: false,
    lastPasswordChange: new Date('2024-01-01')
  }
];

export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}

export function updateUserPassword(email: string, newPasswordHash: string): boolean {
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex === -1) return false;
  
  users[userIndex] = {
    ...users[userIndex],
    passwordHash: newPasswordHash,
    lastPasswordChange: new Date(),
    forcePasswordReset: false
  };
  
  return true;
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one symbol' };
  }
  
  return { isValid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
