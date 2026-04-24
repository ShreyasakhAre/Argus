/**
 * In-memory fallback service for when MongoDB is unavailable
 * Provides basic CRUD operations with mock data
 */

class MemoryFallback {
  constructor() {
    this.alerts = new Map();
    this.users = new Map();
    this.policies = new Map();
    this.logs = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    console.log("[memory-fallback] Initializing in-memory data store");
    
    // Initialize with sample data
    this.initializeSampleData();
    this.initialized = true;
    
    console.log("[memory-fallback] In-memory store ready");
  }

  initializeSampleData() {
    // Sample alerts
    const sampleAlerts = [
      {
        _id: 'alert_1',
        notification_id: 'notif_001',
        org_id: 'org_001',
        department: 'IT',
        channel: 'Email',
        severity: 'high',
        title: 'Suspicious login detected',
        message: 'Unusual login pattern detected from IP 192.168.1.100',
        risk_score: 0.85,
        is_malicious: 1,
        created_at: new Date(),
        read: false
      },
      {
        _id: 'alert_2',
        notification_id: 'notif_002',
        org_id: 'org_001',
        department: 'Finance',
        channel: 'ERP',
        severity: 'medium',
        title: 'Unusual transaction pattern',
        message: 'Multiple large transactions detected outside business hours',
        risk_score: 0.65,
        is_malicious: 0,
        created_at: new Date(),
        read: false
      }
    ];

    sampleAlerts.forEach(alert => {
      this.alerts.set(alert._id, alert);
    });

    // Sample users
    const sampleUsers = [
      {
        _id: 'user_1',
        email: 'admin@argus.com',
        role: 'admin',
        org_id: 'org_001',
        department: 'IT',
        active: true
      },
      {
        _id: 'user_2',
        email: 'analyst@argus.com',
        role: 'analyst',
        org_id: 'org_001',
        department: 'Finance',
        active: true
      }
    ];

    sampleUsers.forEach(user => {
      this.users.set(user._id, user);
    });
  }

  // Alert operations
  async findAlerts(filter = {}) {
    const alerts = Array.from(this.alerts.values());
    
    return alerts.filter(alert => {
      if (filter.org_id && alert.org_id !== filter.org_id) return false;
      if (filter.department && alert.department !== filter.department) return false;
      if (filter.severity && alert.severity !== filter.severity) return false;
      return true;
    });
  }

  async createAlert(alertData) {
    const alert = {
      _id: `alert_${Date.now()}`,
      ...alertData,
      created_at: new Date(),
      read: false
    };
    
    this.alerts.set(alert._id, alert);
    return alert;
  }

  async updateAlert(id, updateData) {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    
    Object.assign(alert, updateData);
    this.alerts.set(id, alert);
    return alert;
  }

  async deleteAlert(id) {
    const deleted = this.alerts.delete(id);
    return deleted;
  }

  // User operations
  async findUsers(filter = {}) {
    const users = Array.from(this.users.values());
    
    return users.filter(user => {
      if (filter.org_id && user.org_id !== filter.org_id) return false;
      if (filter.department && user.department !== filter.department) return false;
      if (filter.role && user.role !== filter.role) return false;
      return true;
    });
  }

  async findUserByEmail(email) {
    const users = Array.from(this.users.values());
    return users.find(user => user.email === email);
  }

  // Logging operations
  async log(level, message, metadata = {}) {
    const logEntry = {
      _id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      metadata,
      timestamp: new Date()
    };
    
    this.logs.push(logEntry);
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
    
    return logEntry;
  }

  async findLogs(filter = {}) {
    return this.logs.filter(log => {
      if (filter.level && log.level !== filter.level) return false;
      if (filter.since && log.timestamp < filter.since) return false;
      return true;
    });
  }

  // Statistics
  getStats() {
    return {
      alerts: this.alerts.size,
      users: this.users.size,
      logs: this.logs.length,
      mode: 'memory'
    };
  }
}

// Singleton instance
const memoryFallback = new MemoryFallback();

module.exports = memoryFallback;
