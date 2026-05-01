import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, orgId } = body;

    // Demo mode: accept any email/password combo, just need a role
    const validRoles = ['admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'];

    // Normalize role in case legacy 'analyst' is passed
    const normalizedRole = role === 'analyst' ? 'fraud_analyst' : (role || 'admin');

    const roleNames: Record<string, string> = {
      admin: 'Administrator',
      fraud_analyst: 'Fraud Analyst',
      department_head: 'Department Head',
      employee: 'Employee',
      auditor: 'Auditor',
    };

    const userEmail = email || 'demo@argus.security';
    const userOrgId = orgId || 'ORG001';
    const userName = roleNames[normalizedRole] || 'Demo User';

    const payload = {
      email: userEmail,
      role: normalizedRole,
      orgId: userOrgId,
      name: userName,
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
        email: userEmail,
        role: normalizedRole,
        orgId: userOrgId,
        name: userName,
      },
    });
  } catch {
    // Even on error, return a valid demo response
    return NextResponse.json({
      success: true,
      token: Buffer.from(JSON.stringify({ email: 'demo@argus.security', role: 'admin', orgId: 'ORG001', name: 'Administrator', exp: Date.now() + 86400000 })).toString('base64'),
      user: {
        email: 'demo@argus.security',
        role: 'admin',
        orgId: 'ORG001',
        name: 'Administrator',
      },
    });
  }
}
