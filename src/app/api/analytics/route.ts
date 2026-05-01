import { NextResponse } from 'next/server';
import { loadDatasetNotifications, getDatasetStats } from '@/lib/dataset-notifications';

export async function GET() {
  const notifications = loadDatasetNotifications();
  const stats = getDatasetStats();
  
  // Generate real analytics from dataset
  const timelineData = notifications.reduce((acc, notif) => {
    const date = notif.timestamp.split(' ')[0]; // Get date part
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.count++;
      if (notif.is_flagged) existing.flagged++;
    } else {
      acc.push({
        date,
        count: 1,
        flagged: notif.is_flagged ? 1 : 0
      });
    }
    return acc;
  }, [] as Array<{ date: string; count: number; flagged: number }>);

  // Calculate hourly distribution
  const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    total: notifications.filter(n => parseInt(n.timestamp.split(' ')[1].split(':')[0]) === i).length,
    flagged: notifications.filter(n => parseInt(n.timestamp.split(' ')[1].split(':')[0]) === i && n.is_flagged).length
  }));

  // Calculate attack vectors
  const threatCounts = notifications.reduce((acc, notif) => {
    const category = notif.threat_category || 'Safe';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const attackVectors = Object.entries(threatCounts).map(([name, value]) => ({
    name,
    value
  }));

  // Calculate weekly trend
  const weeklyTrend = timelineData.slice(-7).map(day => ({
    week: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    detected: day.flagged,
    falsePositive: Math.floor(day.flagged * 0.15), // Estimate false positives
    confirmed: day.flagged - Math.floor(day.flagged * 0.15)
  }));

  // Calculate risk trend
  const riskTrend = timelineData.slice(-14).map(day => {
    const dayNotifications = notifications.filter(n => n.timestamp.startsWith(day.date));
    const avgRisk = dayNotifications.reduce((sum, n) => sum + (n.risk_score || 0), 0) / dayNotifications.length;
    const maxRisk = Math.max(...dayNotifications.map(n => n.risk_score || 0));
    return {
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgRisk,
      maxRisk
    };
  });

  const analytics = {
    hourlyDistribution,
    weeklyTrend,
    attackVectors,
    riskTrend,
    summary: {
      avgResponseTime: '2.3s', // Simulated response time
      detectionRate: `${(stats.model_metrics.accuracy * 100).toFixed(1)}%`,
      falsePositiveRate: `${((1 - stats.model_metrics.precision) * 100).toFixed(1)}%`,
      threatsBlocked: stats.flagged_notifications,
      totalAnalyzed: stats.total_notifications
    }
  };

  return NextResponse.json(analytics);
}
