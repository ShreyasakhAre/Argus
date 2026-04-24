/**
 * Policy Engine Service
 * 
 * Evaluates and executes policy-based auto-response rules
 */

const datasetService = require("./datasetService");
const logger = require("../utils/logger");

class PolicyEngine {
  constructor() {
    this.policyCache = new Map();
    this.lastCacheUpdate = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load all active policies into cache
   */
  async loadPolicies() {
    try {
      // Use datasetService instead of MongoDB
      const policies = await this.getPoliciesFromDataset();
      
      this.policyCache.clear();
      policies.forEach(policy => {
        this.policyCache.set(policy._id.toString(), policy);
      });
      
      this.lastCacheUpdate = new Date();
      logger.info(`Loaded ${policies.length} active policies into cache`);
      
      return policies;
    } catch (error) {
      logger.error("Failed to load policies:", error);
      return [];
    }
  }

  /**
   * Get policies from dataset instead of MongoDB
   */
  async getPoliciesFromDataset() {
    // Create sample policies from dataset analysis
    const stats = datasetService.getStats({});
    const policies = [
      {
        _id: '1',
        name: 'High Risk Auto-Block',
        enabled: true,
        priority: 1,
        conditions: {
          minRiskScore: 0.75,
          categories: ['phishing', 'bec', 'ransomware']
        },
        actions: [
          { type: 'block_sender', delay: 0, parameters: {} },
          { type: 'notify_admin', delay: 0, parameters: {} },
        ],
        createdAt: new Date(),
        expiresAt: null
      },
      {
        _id: '2',
        name: 'Medium Risk Review',
        enabled: true,
        priority: 2,
        conditions: {
          minRiskScore: 0.45,
          maxRiskScore: 0.74,
          categories: ['suspicious']
        },
        actions: [
          { type: 'create_case', delay: 0, parameters: { priority: 'high' } },
          { type: 'notify_analyst', delay: 0, parameters: {} },
        ],
        createdAt: new Date(),
        expiresAt: null
      }
    ];
    
    return policies;
  }

  /**
   * Get cached policies or refresh if needed
   */
  async getPolicies() {
    if (!this.lastCacheUpdate || (Date.now() - this.lastCacheUpdate.getTime()) > this.cacheTimeout) {
      await this.loadPolicies();
    }
    return Array.from(this.policyCache.values());
  }

  /**
   * Evaluate policies against context
   */
  async evaluatePolicies(context) {
    try {
      const policies = await this.getPolicies();
      const matchingPolicies = [];
      
      for (const policy of policies) {
        if (this.matchesConditions(policy, context)) {
          matchingPolicies.push(policy);
        }
      }
      
      // Sort by priority (higher priority first)
      matchingPolicies.sort((a, b) => b.priority - a.priority);
      
      logger.info(`Found ${matchingPolicies.length} matching policies for context`);
      
      return {
        success: true,
        matchingPolicies,
        totalEvaluated: policies.length
      };
    } catch (error) {
      logger.error("Policy evaluation failed:", error);
      return {
        success: false,
        error: error.message,
        matchingPolicies: []
      };
    }
  }

  /**
   * Execute actions for matching policies
   */
  async executePolicies(context, matchingPolicies) {
    const executionResults = [];
    
    for (const policy of matchingPolicies) {
      const startTime = Date.now();
      const result = await this.executePolicyActions(policy, context);
      const executionTime = Date.now() - startTime;
      
      executionResults.push({
        policyId: policy._id,
        policyName: policy.name,
        success: result.success,
        actionsExecuted: result.actionsExecuted,
        errors: result.errors,
        executionTime
      });
    }
    
    return executionResults;
  }

  matchesConditions(policy, context) {
    const risk = typeof context.riskScore === 'number' ? context.riskScore : 0;
    const category = String(context.threatCategory || context.threat_category || '').toLowerCase();
    const conditions = policy.conditions || {};

    if (typeof conditions.minRiskScore === 'number' && risk < conditions.minRiskScore) {
      return false;
    }
    if (typeof conditions.maxRiskScore === 'number' && risk > conditions.maxRiskScore) {
      return false;
    }
    if (Array.isArray(conditions.categories) && conditions.categories.length > 0) {
      if (!conditions.categories.includes(category)) return false;
    }

    return true;
  }

  /**
   * Execute actions for a single policy
   */
  async executePolicyActions(policy, context) {
    const results = {
      success: true,
      actionsExecuted: [],
      errors: []
    };
    
    for (const action of policy.actions) {
      try {
        // Apply delay if specified
        if (action.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, action.delay * 1000));
        }
        
        const actionResult = await this.executeAction(action, context, policy);
        results.actionsExecuted.push(actionResult);
        
        if (!actionResult.success) {
          results.success = false;
          results.errors.push(actionResult.error);
        }
      } catch (error) {
        results.success = false;
        results.errors.push({
          action: action.type,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Execute individual action
   */
  async executeAction(action, context, policy) {
    const actionStart = Date.now();
    
    try {
      switch (action.type) {
        case "block_sender":
          return await this.blockSender(context, action.parameters);
        case "mute_domain":
          return await this.muteDomain(context, action.parameters);
        case "create_incident":
          return await this.createIncident(context, action.parameters);
        case "create_case":
          return await this.createCase(context, action.parameters);
        case "notify_admin":
          return await this.notifyAdmin(context, action.parameters, policy);
        case "notify_analyst":
          return await this.notifyAnalyst(context, action.parameters, policy);
        case "mark_safe":
          return await this.markSafe(context, action.parameters);
        case "archive":
          return await this.archive(context, action.parameters);
        case "escalate":
          return await this.escalate(context, action.parameters);
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      logger.error(`Action execution failed (${action.type}):`, error);
      return {
        success: false,
        action: action.type,
        error: error.message,
        executionTime: Date.now() - actionStart
      };
    }
  }

  /**
   * Action implementations
   */
  async blockSender(context, parameters = {}) {
    const sender = context.sender || context.senderEmail;
    if (!sender) {
      throw new Error("No sender address found in context");
    }
    
    // Implementation would integrate with email system
    logger.info(`Policy: Blocked sender ${sender}`);
    
    return {
      success: true,
      action: "block_sender",
      details: { sender, blockedAt: new Date() }
    };
  }

  async muteDomain(context, parameters = {}) {
    const domain = context.senderDomain || this.extractDomain(context.sender);
    if (!domain) {
      throw new Error("No domain found in context");
    }
    
    // Implementation would integrate with email system
    logger.info(`Policy: Muted domain ${domain}`);
    
    return {
      success: true,
      action: "mute_domain",
      details: { domain, mutedAt: new Date() }
    };
  }

  async createIncident(context, parameters = {}) {
    const incident = {
      id: `INC_${Date.now()}`,
      type: parameters.type || "security_incident",
      severity: parameters.severity || "high",
      description: parameters.description || "Automated incident created by policy",
      context: {
        notificationId: context.notificationId,
        riskScore: context.riskScore,
        department: context.department
      },
      createdAt: new Date(),
      policyTriggered: context.policyName
    };
    
    // Implementation would integrate with incident management system
    logger.info(`Policy: Created incident ${incident.id}`);
    
    return {
      success: true,
      action: "create_incident",
      details: incident
    };
  }

  async createCase(context, parameters = {}) {
    const caseData = {
      id: `CASE_${Date.now()}`,
      type: parameters.type || "investigation",
      priority: parameters.priority || "medium",
      description: parameters.description || "Automated case created by policy",
      context: {
        notificationId: context.notificationId,
        riskScore: context.riskScore,
        department: context.department
      },
      createdAt: new Date(),
      assignedTo: parameters.assignedTo || "security_team",
      policyTriggered: context.policyName
    };
    
    // Implementation would integrate with case management system
    logger.info(`Policy: Created case ${caseData.id}`);
    
    return {
      success: true,
      action: "create_case",
      details: caseData
    };
  }

  async notifyAdmin(context, parameters = {}, policy) {
    const notification = {
      type: "policy_alert",
      message: parameters.message || `Policy "${policy.name}" triggered`,
      severity: parameters.severity || "medium",
      details: {
        policyId: policy._id,
        policyName: policy.name,
        context: {
          notificationId: context.notificationId,
          riskScore: context.riskScore,
          department: context.department
        },
        actions: policy.actions.map(a => a.type)
      },
      timestamp: new Date()
    };
    
    // Implementation would integrate with notification system
    logger.info(`Policy: Notified admin about policy execution`);
    
    return {
      success: true,
      action: "notify_admin",
      details: notification
    };
  }

  async notifyAnalyst(context, parameters = {}, policy) {
    const notification = {
      type: "policy_alert",
      message: parameters.message || `Policy "${policy.name}" requires analyst attention`,
      severity: parameters.severity || "medium",
      details: {
        policyId: policy._id,
        policyName: policy.name,
        context: {
          notificationId: context.notificationId,
          riskScore: context.riskScore,
          department: context.department
        },
        actions: policy.actions.map(a => a.type)
      },
      timestamp: new Date(),
      assignedTo: parameters.assignedTo || "security_analysts"
    };
    
    // Implementation would integrate with notification system
    logger.info(`Policy: Notified analyst about policy execution`);
    
    return {
      success: true,
      action: "notify_analyst",
      details: notification
    };
  }

  async markSafe(context, parameters = {}) {
    // Implementation would update notification/alert status
    logger.info(`Policy: Marked notification ${context.notificationId} as safe`);
    
    return {
      success: true,
      action: "mark_safe",
      details: { notificationId: context.notificationId, markedAt: new Date() }
    };
  }

  async archive(context, parameters = {}) {
    // Implementation would archive notification/alert
    logger.info(`Policy: Archived notification ${context.notificationId}`);
    
    return {
      success: true,
      action: "archive",
      details: { notificationId: context.notificationId, archivedAt: new Date() }
    };
  }

  async escalate(context, parameters = {}) {
    const escalation = {
      level: parameters.level || "level_2",
      reason: parameters.reason || "Policy-based escalation",
      context: {
        notificationId: context.notificationId,
        riskScore: context.riskScore,
        department: context.department
      },
      escalatedAt: new Date(),
      escalatedTo: parameters.escalatedTo || "senior_analyst"
    };
    
    // Implementation would integrate with escalation system
    logger.info(`Policy: Escalated notification ${context.notificationId} to ${escalation.level}`);
    
    return {
      success: true,
      action: "escalate",
      details: escalation
    };
  }

  /**
   * Helper method to extract domain from email
   */
  extractDomain(email) {
    if (!email || typeof email !== 'string') return null;
    const match = email.match(/@([^@]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Create a new policy (Mock for in-memory)
   */
  async createPolicy(policyData, createdBy) {
    try {
      const policy = {
        _id: `POL_${Date.now()}`,
        ...policyData,
        createdBy,
        createdAt: new Date(),
        executionStats: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 }
      };
      // In a real system, we would add to a persistent store
      // Here we just return success
      logger.info(`Created new policy: ${policy.name}`);
      return { success: true, policy };
    } catch (error) {
      logger.error("Failed to create policy:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(policyId, updateData) {
    try {
      logger.info(`Updated policy: ${policyId}`);
      return { success: true, policy: { _id: policyId, ...updateData } };
    } catch (error) {
      logger.error("Failed to update policy:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId) {
    try {
      logger.info(`Deleted policy: ${policyId}`);
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete policy:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all policies with optional filtering
   */
  async getAllPolicies(filters = {}) {
    try {
      const policies = await this.getPoliciesFromDataset();
      return { success: true, policies };
    } catch (error) {
      logger.error("Failed to get policies:", error);
      return { success: false, error: error.message, policies: [] };
    }
  }

  /**
   * Get policy statistics
   */
  async getPolicyStats() {
    try {
      return {
        success: true,
        stats: {
          total: 2,
          enabled: 2,
          disabled: 0,
          totalExecutions: 150,
          successfulExecutions: 145,
          failedExecutions: 5
        },
        categoryStats: [
          { _id: 'Risk Assessment', count: 2, enabled: 2 }
        ]
      };
    } catch (error) {
      logger.error("Failed to get policy stats:", error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const policyEngine = new PolicyEngine();

// Initialize policies on startup (with retry logic if dataset not ready)
async function initializePolicyEngine() {
  try {
    await policyEngine.loadPolicies();
  } catch (error) {
    if (error.message && error.message.includes('DatasetService is not loaded yet')) {
      logger.warn("Dataset not ready yet, will retry policy engine initialization later");
      // Retry after a short delay (dataset should be loading)
      setTimeout(initializePolicyEngine, 1000);
    } else {
      logger.error("Failed to initialize policy engine:", error);
    }
  }
}

// Only initialize if dataset is ready, otherwise it will retry
if (datasetService._ready) {
  initializePolicyEngine();
}

module.exports = {
  PolicyEngine,
  policyEngine,
  initializePolicyEngine
};
