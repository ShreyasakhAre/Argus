import { NextRequest, NextResponse } from 'next/server';
import { handleGlobalError } from '@/lib/demo-mode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, orgId } = body;

    if (!email || !role || !orgId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const roleNames: Record<string, string> = {
      admin: 'Administrator',
      fraud_analyst: 'Fraud Analyst',
      department_head: 'Department Head',
      employee: 'Employee',
      auditor: 'Auditor',
    };

    const payload = {
      email,
      role,
      orgId,
      name: roleNames[role],
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64');
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = Buffer.from('demo-signature').toString('base64');
    const token = `${base64Header}.${base64Payload}.${signature}`;

    return NextResponse.json({
      success: true,
      token,
      user: {
        email,
        role,
        orgId,
        name: roleNames[role],
      },
    });
  } catch (error) {
    console.error('❌ Login API error:', handleGlobalError(error, 'auth/login'));
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
