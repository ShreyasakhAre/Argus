import type { Notification } from './ml-service';

interface ThreatVelocityResult {
  current24h: number;
  previous24h: number;
  percentageChange: number;
  isSpike: boolean;
  displayText: string;
}

export function calculateThreatVelocity(notifications: Notification[]): ThreatVelocityResult {
  if (!Array.isArray(notifications)) {
    return {
      current24h: 0,
      previous24h: 0,
      percentageChange: 0,
      isSpike: false,
      displayText: 'No data available'
    };
  }

  const now = new Date();
  const current24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const previous24hStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const previous24hEnd = current24hStart;

  // Filter high-risk notifications (risk_score > 0.7)
  const isHighRisk = (notification: Notification) => {
    const riskScore = notification?.risk_score ?? 0;
    return riskScore > 0.7;
  };

  const current24hHighRisk = notifications.filter(n => {
    if (!n?.timestamp) return false;
    const notificationDate = new Date(n.timestamp);
    return notificationDate >= current24hStart && isHighRisk(n);
  });

  const previous24hHighRisk = notifications.filter(n => {
    if (!n?.timestamp) return false;
    const notificationDate = new Date(n.timestamp);
    return notificationDate >= previous24hStart && notificationDate < previous24hEnd && isHighRisk(n);
  });

  const currentCount = current24hHighRisk.length;
  const previousCount = previous24hHighRisk.length;

  // Calculate percentage change
  let percentageChange = 0;
  if (previousCount > 0) {
    percentageChange = ((currentCount - previousCount) / previousCount) * 100;
  } else if (currentCount > 0) {
    percentageChange = 100; // First high-risk alerts
  }

  const isSpike = percentageChange > 15;

  let displayText = '';
  if (isSpike) {
    displayText = `Threat Spike Detected (+${Math.round(percentageChange)}%)`;
  } else if (percentageChange < 0) {
    displayText = `Threat Decrease (${Math.round(percentageChange)}%)`;
  } else if (percentageChange > 0) {
    displayText = `Threat Increase (+${Math.round(percentageChange)}%)`;
  } else {
    displayText = 'Threat Level Stable';
  }

  return {
    current24h: currentCount,
    previous24h: previousCount,
    percentageChange,
    isSpike,
    displayText
  };
}
