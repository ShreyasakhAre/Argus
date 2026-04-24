'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, AlertTriangle, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useRole } from '@/components/role-provider';

interface LiveAlert {
  id: string;
  title: string;
  sender: string;
  department: string;
  threatType: string;
  severity: 'critical' | 'high' | 'medium' | 'safe';
  riskScore: number;
  explanation: string;
  timestamp: string;
  notification?: any;
}

interface LiveAlertToastProps {
  alert: LiveAlert;
  onClose: () => void;
}

export function LiveAlertToast({ alert, onClose }: LiveAlertToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { role } = useRole();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 7000); // Auto-dismiss after 7 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'high':
        return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'safe':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
      default:
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5" />;
      case 'safe':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const shouldShowAlert = useCallback(() => {
    // Role-based filtering logic
    switch (role) {
      case 'admin':
        return true; // Show all alerts
      case 'fraud_analyst':
        return alert.severity === 'critical' || alert.severity === 'high' || alert.riskScore >= 70;
      case 'department_head':
        // Show alerts for their department only (simplified for demo)
        return true; // In real implementation, check user's department
      case 'employee':
        return alert.severity === 'safe' || alert.riskScore < 40; // Show personal notifications
      case 'auditor':
        return alert.severity === 'critical' || alert.severity === 'high'; // Show audit/security events
      default:
        return true;
    }
  }, [role, alert]);

  if (!shouldShowAlert()) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border shadow-lg
        transition-all duration-300 transform
        ${getSeverityColor(alert.severity)}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getSeverityIcon(alert.severity)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold truncate">{alert.title}</h4>
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="flex-shrink-0 ml-2 p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 text-slate-300">
              <span>From: {alert.sender}</span>
              <span>•</span>
              <span>{alert.department}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Risk: {alert.riskScore}%</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-400">{alert.threatType}</span>
            </div>
            
            <p className="text-slate-300 line-clamp-2 mt-2">
              {alert.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LiveAlertContainerProps {
  alerts: LiveAlert[];
  onRemoveAlert: (id: string) => void;
}

export function LiveAlertContainer({ alerts, onRemoveAlert }: LiveAlertContainerProps) {
  // Show maximum 3 alerts at once
  const visibleAlerts = alerts.slice(-3);

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {visibleAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className="pointer-events-auto"
          style={{ 
            top: `${index * 120}px`, 
            position: 'absolute',
            width: '400px',
            maxWidth: '90vw'
          }}
        >
          <LiveAlertToast
            alert={alert}
            onClose={() => onRemoveAlert(alert.id)}
          />
        </div>
      ))}
    </div>
  );
}
