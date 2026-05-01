const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchNotifications(params?: {
  org_id?: string;
  department?: string;
  limit?: number;
  skip?: number;
  search?: string;
  threat_category?: string;
  risk_level?: string;
}) {
  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(`${API_BASE_URL}/notifications?${queryString}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  
  return response.json();
}

export async function fetchNotificationStats(params?: {
  org_id?: string;
  department?: string;
}) {
  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(`${API_BASE_URL}/notifications/stats?${queryString}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch notification stats');
  }
  
  return response.json();
}

export async function fetchExplanation(notificationId: string) {
  const response = await fetch(`${API_BASE_URL}/notifications/explain/${notificationId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch explanation');
  }
  
  return response.json();
}

export async function fetchDepartments() {
  const response = await fetch(`${API_BASE_URL}/notifications/departments`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  
  return response.json();
}

export async function fetchOrganizations() {
  const response = await fetch(`${API_BASE_URL}/notifications/organizations`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch organizations');
  }
  
  return response.json();
}

export async function fetchThreatTrends(range?: string) {
  const queryString = range ? `?range=${range}` : '';
  const response = await fetch(`${API_BASE_URL}/notifications/trends${queryString}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch threat trends');
  }
  
  return response.json();
}

export async function fetchHeatmapData(params?: {
  org_id?: string;
  department?: string;
}) {
  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(`${API_BASE_URL}/notifications/heatmap?${queryString}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch heatmap data');
  }
  
  return response.json();
}

export async function fetchSuspiciousQueue(params?: {
  org_id?: string;
  department?: string;
  limit?: number;
}) {
  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(`${API_BASE_URL}/notifications/suspicious?${queryString}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch suspicious queue');
  }
  
  return response.json();
}
