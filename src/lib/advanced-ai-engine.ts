import { initSocketConnection } from './socket';

// Helper function to fetch notifications via API
async function fetchNotifications() {
  try {
    const response = await fetch('/api/notifications');
    if (!response.ok) {
      console.error('Failed to fetch notifications:', response.statusText);
      return [];
    }
    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export interface AIDecision {
  decision: 'BLOCK' | 'ESCALATE' | 'MONITOR' | 'GLOBAL_ALERT';
  confidence: number;
  reasoning: string;
  factors: {
    risk: number;
    userBehaviorScore: number;
    sourceTrustScore: number;
    contextScore: number;
  };
  patternDetected?: {
    type: 'CAMPAIGN' | 'REPEATED_ATTEMPT' | 'TARGETED_ATTACK';
    details: string;
  };
}

export interface LearningMemory {
  notification_id: string;
  originalDecision: AIDecision;
  analystOverride: string;
  timestamp: string;
  weightAdjustments: Record<string, number>;
}

export interface TrendAnalysis {
  spikes: Array<{
    timestamp: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedDepartments: string[];
    pattern: string;
  }>;
  targetedDepartments: Array<{
    department: string;
    attackCount: number;
    riskLevel: number;
  }>;
  anomalyPatterns: Array<{
    pattern: string;
    frequency: number;
    confidence: number;
  }>;
}

export type AIMode = 'PASSIVE' | 'ASSISTED' | 'AUTONOMOUS';

class AdvancedAIEngine {
  private learningMemory: LearningMemory[] = [];
  private currentMode: AIMode = 'ASSISTED';
  private rollingWindow: any[] = [];
  private departmentSensitivity: Record<string, number> = {
    'Finance': 1.0,
    'Executive': 0.9,
    'IT': 0.7,
    'HR': 0.5,
    'Marketing': 0.3,
    'Sales': 0.3
  };

  constructor() {
    this.loadLearningMemory();
  }

  /**
   * Multi-Factor Decision Engine
   * finalScore = (0.6 * risk) + (0.2 * userBehaviorScore) + (0.2 * sourceTrustScore)
   */
  async analyzeNotification(notification: any): Promise<AIDecision> {
    const factors = await this.calculateFactors(notification);
    const contextScore = await this.calculateContextScore(notification);
    const finalScore = (0.6 * factors.risk) + (0.2 * factors.userBehaviorScore) + (0.2 * factors.sourceTrustScore);
    
    const decision = this.makeDecision(finalScore, contextScore, notification);
    const reasoning = this.generateReasoning(decision, factors, contextScore, notification);
    
    // Check for patterns
    const patternDetected = await this.detectPatterns(notification);
    
    return {
      ...decision,
      confidence: this.calculateConfidence(finalScore, contextScore),
      reasoning,
      factors: { ...factors, contextScore },
      patternDetected
    };
  }

  private async calculateFactors(notification: any) {
    // Risk Score
    const risk = notification.confidence || 0;
    
    // User Behavior Score (anomaly detection)
    const userBehaviorScore = await this.calculateUserBehaviorScore(notification);
    
    // Source Trust Score
    const sourceTrustScore = this.calculateSourceTrustScore(notification);
    
    return { risk, userBehaviorScore, sourceTrustScore };
  }

  private async calculateUserBehaviorScore(notification: any): Promise<number> {
    const notifications = await fetchNotifications();
    const userNotifications = notifications.filter((n: any) => n.sender === notification.sender);
    
    if (userNotifications.length === 0) return 0.8; // New user = higher risk
    
    // Analyze frequency and timing patterns
    const recentNotifications = userNotifications.filter((n: any) => {
      const notifDate = new Date(n.timestamp);
      const currentDate = new Date(notification.timestamp);
      const hoursDiff = (currentDate.getTime() - notifDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24; // Last 24 hours
    });
    
    const frequencyScore = Math.min(recentNotifications.length / 10, 1.0);
    
    // Time-based anomaly (unusual hours)
    const hour = new Date(notification.timestamp).getHours();
    const unusualHour = (hour < 6 || hour > 20) ? 0.3 : 0;
    
    return frequencyScore + unusualHour;
  }

  private calculateSourceTrustScore(notification: any): number {
    // Known internal sources get high trust
    const internalDomains = ['company.com', 'internal.org'];
    const sender = notification.sender || '';
    
    if (internalDomains.some(domain => sender.includes(domain))) {
      return 0.1; // Low risk
    }
    
    // Known malicious patterns
    const suspiciousPatterns = ['tempmail.com', 'darkweb.com', 'scam.net', 'malicious.net'];
    if (suspiciousPatterns.some(pattern => sender.includes(pattern))) {
      return 0.9; // High risk
    }
    
    // External but not obviously malicious
    return 0.5;
  }

  private async calculateContextScore(notification: any): Promise<number> {
    let score = 0;
    
    // Department sensitivity
    const deptSensitivity = this.departmentSensitivity[notification.department] || 0.5;
    score += deptSensitivity * 0.3;
    
    // Historical patterns for this sender
    const senderHistory = await this.getSenderHistory(notification.sender);
    if (senderHistory.flaggedRatio > 0.5) {
      score += 0.4;
    }
    
    // Content-based context
    const urgentKeywords = ['urgent', 'immediate', 'action required', 'verify now'];
    const message = notification.message || '';
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    if (hasUrgentKeywords) {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  private makeDecision(finalScore: number, contextScore: number, notification: any) {
    const combinedScore = (finalScore + contextScore) / 2;
    
    if (this.currentMode === 'PASSIVE') {
      return { decision: 'MONITOR' as const };
    }
    
    if (combinedScore > 0.8) {
      return { decision: 'BLOCK' as const };
    } else if (combinedScore > 0.6) {
      return { decision: 'ESCALATE' as const };
    } else if (combinedScore > 0.4) {
      return { decision: 'MONITOR' as const };
    } else {
      return { decision: 'MONITOR' as const };
    }
  }

  private generateReasoning(decision: any, factors: any, contextScore: number, notification: any): string {
    const reasons = [];
    
    if (factors.risk > 0.7) {
      reasons.push('high risk content detected');
    }
    
    if (factors.userBehaviorScore > 0.6) {
      reasons.push('unusual user behavior pattern');
    }
    
    if (factors.sourceTrustScore > 0.7) {
      reasons.push('untrusted source');
    }
    
    if (contextScore > 0.7) {
      reasons.push('sensitive department context');
    }
    
    const decisionText = decision.decision.toLowerCase().replace('_', ' ');
    return `${decisionText} because ${reasons.join(' + ') || 'standard risk factors detected'}`;
  }

  private calculateConfidence(finalScore: number, contextScore: number): number {
    const combinedScore = (finalScore + contextScore) / 2;
    return Math.round(combinedScore * 100);
  }

  /**
   * Pattern Detection for coordinated attacks
   */
  private async detectPatterns(notification: any) {
    const notifications = await fetchNotifications();
    
    // Check for repeated attempts from same sender
    const sameSenderNotifications = notifications.filter(n => n.sender === notification.sender);
    if (sameSenderNotifications.length > 3) {
      return {
        type: 'REPEATED_ATTEMPT' as const,
        details: `Same sender ${notification.sender} has ${sameSenderNotifications.length} notifications`
      };
    }
    
    // Check for campaign patterns
    const recentNotifications = notifications.filter(n => {
      const notifDate = new Date(n.timestamp);
      const currentDate = new Date(notification.timestamp);
      const hoursDiff = (currentDate.getTime() - notifDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 1; // Last hour
    });
    
    const similarContent = recentNotifications.filter((n: any) => 
      n.severity === notification.severity &&
      Math.abs((n.confidence || 0) - (notification.confidence || 0)) < 0.2
    );
    
    if (similarContent.length > 5) {
      return {
        type: 'CAMPAIGN' as const,
        details: `Coordinated ${notification.severity} severity attack detected (${similarContent.length} similar alerts)`
      };
    }
    
    // Check for targeted attacks on specific department
    const deptTargeted = recentNotifications.filter(n => n.department === notification.department);
    if (deptTargeted.length > 3) {
      return {
        type: 'TARGETED_ATTACK' as const,
        details: `${notification.department} department targeted (${deptTargeted.length} alerts)`
      };
    }
    
    return undefined;
  }

  /**
   * Adaptive Learning System
   */
  recordAnalystFeedback(notificationId: string, originalDecision: AIDecision, analystOverride: string) {
    const memory: LearningMemory = {
      notification_id: notificationId,
      originalDecision,
      analystOverride,
      timestamp: new Date().toISOString(),
      weightAdjustments: this.calculateWeightAdjustments(originalDecision, analystOverride)
    };
    
    this.learningMemory.push(memory);
    this.saveLearningMemory();
    this.applyWeightAdjustments(memory.weightAdjustments);
  }

  private calculateWeightAdjustments(original: AIDecision, override: string): Record<string, number> {
    const adjustments: Record<string, number> = {};
    
    // Simple weight adjustment logic
    if (original.decision === 'BLOCK' && override === 'SAFE') {
      adjustments['risk'] = -0.1;
      adjustments['sourceTrustScore'] = 0.05;
    } else if (original.decision === 'MONITOR' && override === 'MALICIOUS') {
      adjustments['risk'] = 0.1;
      adjustments['userBehaviorScore'] = 0.05;
    }
    
    return adjustments;
  }

  private applyWeightAdjustments(adjustments: Record<string, number>) {
    // Apply weight adjustments to future decisions
    // This would modify the calculation weights in calculateFactors
    console.log('Applied weight adjustments:', adjustments);
  }

  /**
   * Trend Analysis Engine
   */
  async analyzeTrends(): Promise<TrendAnalysis> {
    const notifications = await fetchNotifications();
    const recentNotifications = notifications.slice(-100); // Last 100 alerts
    
    const spikes = this.detectSpikes(recentNotifications);
    const targetedDepartments = this.analyzeTargetedDepartments(recentNotifications);
    const anomalyPatterns = this.detectAnomalyPatterns(recentNotifications);
    
    return {
      spikes,
      targetedDepartments,
      anomalyPatterns
    };
  }

  private detectSpikes(notifications: any[]) {
    // Simple spike detection based on frequency
    const hourlyCounts = notifications.reduce((acc, notif) => {
      const hour = new Date(notif.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const counts = Object.values(hourlyCounts) as number[];
    const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    
    return Object.entries(hourlyCounts)
      .filter(([_, count]) => (count as number) > avgCount * 2)
      .map(([hour, count]) => ({
        timestamp: `Hour ${hour}`,
        severity: (count as number) > avgCount * 3 ? 'CRITICAL' as const : 'HIGH' as const,
        affectedDepartments: [],
        pattern: `Spike detected: ${count} alerts (avg: ${avgCount.toFixed(1)})`
      }));
  }

  private analyzeTargetedDepartments(notifications: any[]) {
    const deptCounts = notifications.reduce((acc, notif) => {
      acc[notif.department] = (acc[notif.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(deptCounts)
      .map(([department, attackCount]) => ({
        department,
        attackCount: attackCount as number,
        riskLevel: (attackCount as number) / notifications.length
      }))
      .sort((a, b) => b.attackCount - a.attackCount)
      .slice(0, 5);
  }

  private detectAnomalyPatterns(notifications: any[]) {
    // Simple pattern detection
    const patterns = [
      { pattern: 'Urgent requests', frequency: notifications.filter((n: any) => n.message?.toLowerCase().includes('urgent')).length },
      { pattern: 'External senders', frequency: notifications.filter((n: any) => !n.sender?.includes('company.com')).length },
      { pattern: 'URL links', frequency: notifications.filter((n: any) => n.message?.includes('http')).length }
    ];
    
    return patterns
      .filter(p => p.frequency > 5)
      .map(p => ({
        ...p,
        confidence: p.frequency / notifications.length
      }));
  }

  /**
   * AI Agent Modes
   */
  setMode(mode: AIMode) {
    this.currentMode = mode;
    console.log(`AI Agent mode changed to: ${mode}`);
  }

  getMode(): AIMode {
    return this.currentMode;
  }

  /**
   * Autonomous Response System
   */
  async executeAction(decision: AIDecision, notification: any) {
    const socket = initSocketConnection();
    
    switch (decision.decision) {
      case 'BLOCK':
        await this.blockNotification(notification, socket);
        break;
      case 'ESCALATE':
        await this.escalateNotification(notification, socket);
        break;
      case 'MONITOR':
        await this.monitorNotification(notification, socket);
        break;
      case 'GLOBAL_ALERT':
        await this.triggerGlobalAlert(notification, socket);
        break;
    }
  }

  private async blockNotification(notification: any, socket: any) {
    console.log(`[AI] Blocking notification: ${notification.id}`);
    
    // Emit to Socket.IO
    socket.emit('notification_blocked', {
      notification_id: notification.id,
      reason: 'AI decision: BLOCK',
      timestamp: new Date().toISOString()
    });
  }

  private async escalateNotification(notification: any, socket: any) {
    console.log(`[AI] Escalating notification: ${notification.id}`);
    
    socket.emit('notification_escalated', {
      notification_id: notification.id,
      reason: 'AI decision: ESCALATE',
      timestamp: new Date().toISOString()
    });
  }

  private async monitorNotification(notification: any, socket: any) {
    console.log(`[AI] Monitoring notification: ${notification.id}`);
    
    socket.emit('notification_monitored', {
      notification_id: notification.id,
      reason: 'AI decision: MONITOR',
      timestamp: new Date().toISOString()
    });
  }

  private async triggerGlobalAlert(notification: any, socket: any) {
    console.log(`[AI] GLOBAL ALERT triggered: ${notification.id}`);
    
    socket.emit('global_alert', {
      notification_id: notification.id,
      pattern: notification.patternDetected,
      reason: 'AI decision: GLOBAL ALERT',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Helper methods
   */
  private async getSenderHistory(sender: string) {
    const notifications = await fetchNotifications();
    const senderNotifications = notifications.filter(n => n.sender === sender);
    const flaggedCount = senderNotifications.filter(n => n.is_flagged).length;
    
    return {
      total: senderNotifications.length,
      flaggedCount,
      flaggedRatio: senderNotifications.length > 0 ? flaggedCount / senderNotifications.length : 0
    };
  }

  private loadLearningMemory() {
    // In production, load from database
    // For now, initialize empty
    this.learningMemory = [];
  }

  private saveLearningMemory() {
    // In production, save to database
    console.log('Learning memory saved:', this.learningMemory.length);
  }
}

// Singleton instance
export const advancedAIEngine = new AdvancedAIEngine();
