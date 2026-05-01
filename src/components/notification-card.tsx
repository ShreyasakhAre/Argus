'use client';

import { AlertTriangle, CheckCircle, Info, Mail, MessageSquare, Users, Building, DollarSign, Smartphone, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationCheckbox } from '@/components/notification-bulk-actions';
import type { Notification, Explanation, SourceApp } from '@/lib/ml-service';

interface NotificationCardProps {
  notification: Notification;
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  sourceAppIcons: Record<SourceApp, React.ReactNode>;
  sourceAppColors: Record<SourceApp, string>;
  selectedExplanation: { [key: string]: Explanation };
  fetchExplanation: (id: string) => void;
}

export function NotificationCard({
  notification,
  bulkMode,
  selectedIds,
  toggleSelect,
  sourceAppIcons,
  sourceAppColors,
  selectedExplanation,
  fetchExplanation,
}: NotificationCardProps) {
  const notSafe = notification.risk_score >= 0.4 || notification.threat_category !== 'Safe';
  const riskPercent = notification.risk_score > 1
    ? Math.round(notification.risk_score)
    : Math.round(notification.risk_score * 100);
  
  return (
    <div className={`bg-card border border-border hover:border-muted-foreground/30 transition-colors p-4 rounded-lg ${
      notSafe ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
    }`}>
      <div className="flex items-start gap-3">
        {bulkMode && (
          <NotificationCheckbox
            notification={notification}
            isSelected={selectedIds.has(notification.notification_id)}
            onToggle={toggleSelect}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              {notSafe ? (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              <span className="font-mono text-sm text-muted-foreground">{notification.notification_id}</span>
              <Badge className={`${sourceAppColors[notification.source_app || 'Email']} flex items-center gap-1`}>
                {sourceAppIcons[notification.source_app || 'Email']}
                {notification.source_app || 'Email'}
              </Badge>
              <Badge className={
                notification.risk_score >= 0.7 ? 'bg-red-500/20 text-red-400' :
                notification.risk_score >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }>
                {notification.risk_score >= 0.7 ? 'High' : notification.risk_score >= 0.4 ? 'Medium' : 'Low'} ({riskPercent}%)
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">{notification.department}</Badge>
              {notSafe && (
                <Badge className="bg-red-500/20 text-red-400">
                  Not Safe
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${
                notification.risk_score >= 0.7 ? 'text-red-500' :
                notification.risk_score >= 0.4 ? 'text-yellow-500' : 'text-green-500'
              }`} />
              <span className={`text-sm font-medium ${
                notification.risk_score >= 0.7 ? 'text-red-500' :
                notification.risk_score >= 0.4 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {riskPercent}% Risk
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <span className="text-muted-foreground">From: </span>
              <span className="text-foreground">{notification.sender}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Department: </span>
              <span className="text-foreground">{notification.department}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Source: </span>
              <span className="text-foreground">{notification.source_app || 'Email'}</span>
            </div>
          </div>
          <p className="text-foreground bg-muted p-3 rounded-lg text-sm line-clamp-2 mb-2">{notification.content}</p>
          
          {notSafe && (
            <div className="mt-3">
              <button
                onClick={() => fetchExplanation(notification.notification_id)}
                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
              >
                <Info className="w-4 h-4" />
                Why was this flagged?
              </button>
              
              {selectedExplanation[notification.notification_id] && (
                <div className="mt-3 bg-cyan-900/20 border border-cyan-800 p-4 rounded-lg">
                  <p className="text-foreground text-sm mb-2">
                    {selectedExplanation[notification.notification_id].explanation.explanation_text || 'AI analysis not available'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedExplanation[notification.notification_id].explanation.top_features.map((feature, idx) => (
                      <Badge key={idx} className="bg-cyan-500/20 text-cyan-400 text-xs">
                        {feature.feature.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
        </div>
      </div>
    </div>
  );
}

export function isNotSafe(notification: Notification) {
  return notification.risk_score >= 0.4 || notification.threat_category !== 'Safe';
}
