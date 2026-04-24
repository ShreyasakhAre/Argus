/**
 * Database service abstraction layer
 * Now unified to use datasetService as single source of truth
 */

const datasetService = require('./datasetService');

class DatabaseService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Ensure dataset is loaded
    await datasetService.load();
    this.initialized = true;
    console.log('[db-service] Unified to use datasetService (10K records)');
  }

  isUsingMemoryFallback() {
    return false; // Always false now - using datasetService
  }

  // Alert operations - now use datasetService
  async findAlerts(filter = {}) {
    await this.initialize();
    
    // Convert legacy filter format to datasetService format
    const dsFilters = {};
    if (filter.org_id) dsFilters.org_id = filter.org_id;
    if (filter.department) dsFilters.department = filter.department;
    if (filter.severity) dsFilters.threat_category = filter.severity;
    
    const result = datasetService.query(dsFilters, { limit: 10000 });
    return result.data;
  }

  async createAlert(alertData) {
    await this.initialize();
    // Not supported in dataset mode
    throw new Error('Creating alerts is disabled in dataset mode');
  }

  async updateAlert(id, updateData) {
    await this.initialize();
    
    // Map to datasetService updateStatus format
    const dsUpdate = {};
    if (updateData.review_status) dsUpdate.review_status = updateData.review_status;
    if (updateData.analyst_feedback) dsUpdate.analyst_feedback = updateData.analyst_feedback;
    
    return datasetService.updateStatus(id, dsUpdate);
  }

  async deleteAlert(id) {
    await this.initialize();
    // Not supported in dataset mode
    throw new Error('Deleting alerts is disabled in dataset mode');
  }

  // User operations - use minimal mock users for demo
  async findUsers(filter = {}) {
    await this.initialize();
    
    // Mock user data for demo
    const mockUsers = [
      { _id: 'user_1', email: 'admin@argus.com', role: 'admin', org_id: 'ORG001', department: 'Admin', active: true },
      { _id: 'user_2', email: 'analyst@argus.com', role: 'fraud_analyst', org_id: 'ORG001', department: 'Finance', active: true },
      { _id: 'user_3', email: 'dept_head@argus.com', role: 'department_head', org_id: 'ORG001', department: 'IT', active: true },
      { _id: 'user_4', email: 'employee@argus.com', role: 'employee', org_id: 'ORG001', department: 'HR', active: true }
    ];
    
    return mockUsers.filter(user => {
      if (filter.org_id && user.org_id !== filter.org_id) return false;
      if (filter.department && user.department !== filter.department) return false;
      if (filter.role && user.role !== filter.role) return false;
      return true;
    });
  }

  async findUserByEmail(email) {
    await this.initialize();
    const users = await this.findUsers();
    return users.find(user => user.email === email) || null;
  }

  // Logging operations - simplified for demo
  async log(level, message, metadata = {}) {
    await this.initialize();
    console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    return { _id: `log_${Date.now()}`, level, message, metadata, timestamp: new Date() };
  }

  async findLogs(filter = {}) {
    await this.initialize();
    // Return minimal logs for demo
    return [];
  }

  // Statistics and health - now use datasetService
  async getStats() {
    await this.initialize();
    
    const stats = datasetService.getStats();
    return {
      alerts: stats.totalAlerts,
      users: 4, // Mock users
      logs: 0,
      mode: 'dataset',
      dataset: {
        total: stats.totalAlerts,
        flagged: stats.maliciousCount,
        benign: stats.benign,
        avgRisk: stats.avgRiskScore
      }
    };
  }

  // Health check
  async healthCheck() {
    await this.initialize();
    
    return {
      status: 'healthy',
      mode: 'dataset',
      message: 'Running on 10K dataset mode',
      dataset: {
        loaded: datasetService._ready,
        size: datasetService.size
      }
    };
  }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
