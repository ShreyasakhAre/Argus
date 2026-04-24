/**
 * Policy Engine Controller
 * 
 * Handles API endpoints for policy-based auto-response rules
 */

const { policyEngine } = require("../services/policyEngine");
const dashboardAnalyticsService = require("../services/dashboardAnalyticsService");
const logger = require("../utils/logger");

/**
 * POST /policies/evaluate
 * Evaluate policies against context
 */
async function evaluatePoliciesController(req, res) {
  try {
    const context = req.body;

    // Validate context
    if (!context || typeof context !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Context object is required"
      });
    }

    const result = await policyEngine.evaluatePolicies(context);

    if (result.success) {
      // Execute actions if requested
      let executionResults = [];
      if (req.body.executeActions && result.matchingPolicies.length > 0) {
        executionResults = await policyEngine.executePolicies(context, result.matchingPolicies);
      }

      // Emit real-time update if socket.io is available
      const io = req.app.get("io");
      if (io) {
        io.emit("policy_evaluation", {
          type: "policy_evaluated",
          context,
          matchingPolicies: result.matchingPolicies.length,
          executionResults,
          timestamp: new Date()
        });
      }

      return res.status(200).json({
        success: true,
        ...result,
        executionResults
      });
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    logger.error("Evaluate policies controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /policies
 * Create a new policy
 */
async function createPolicyController(req, res) {
  try {
    const policyData = req.body;
    const createdBy = req.user?.id || req.body.createdBy;

    if (!createdBy) {
      return res.status(400).json({
        success: false,
        error: "User ID is required"
      });
    }

    // Validate required fields
    if (!policyData.name || !policyData.description) {
      return res.status(400).json({
        success: false,
        error: "Name and description are required"
      });
    }

    // Validate conditions
    if (!policyData.conditions || !policyData.conditions.riskScore) {
      return res.status(400).json({
        success: false,
        error: "Risk score conditions are required"
      });
    }

    // Validate actions
    if (!policyData.actions || !Array.isArray(policyData.actions) || policyData.actions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one action is required"
      });
    }

    const result = await policyEngine.createPolicy(policyData, createdBy);

    if (result.success) {
      // Emit real-time update if socket.io is available
      const io = req.app.get("io");
      if (io) {
        io.emit("policy_created", {
          type: "policy_created",
          policy: result.policy,
          timestamp: new Date()
        });
      }

      return res.status(201).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    logger.error("Create policy controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * PUT /policies/:policyId
 * Update an existing policy
 */
async function updatePolicyController(req, res) {
  try {
    const { policyId } = req.params;
    const updateData = req.body;

    if (!policyId) {
      return res.status(400).json({
        success: false,
        error: "Policy ID is required"
      });
    }

    const result = await policyEngine.updatePolicy(policyId, updateData);

    if (result.success) {
      // Emit real-time update if socket.io is available
      const io = req.app.get("io");
      if (io) {
        io.emit("policy_updated", {
          type: "policy_updated",
          policy: result.policy,
          timestamp: new Date()
        });
      }

      return res.status(200).json(result);
    } else {
      if (result.error === 'Policy not found') {
        return res.status(404).json(result);
      }
      return res.status(500).json(result);
    }

  } catch (error) {
    logger.error("Update policy controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * DELETE /policies/:policyId
 * Delete a policy
 */
async function deletePolicyController(req, res) {
  try {
    const { policyId } = req.params;

    if (!policyId) {
      return res.status(400).json({
        success: false,
        error: "Policy ID is required"
      });
    }

    const result = await policyEngine.deletePolicy(policyId);

    if (result.success) {
      // Emit real-time update if socket.io is available
      const io = req.app.get("io");
      if (io) {
        io.emit("policy_deleted", {
          type: "policy_deleted",
          policy: result.policy,
          timestamp: new Date()
        });
      }

      return res.status(200).json(result);
    } else {
      if (result.error === 'Policy not found') {
        return res.status(404).json(result);
      }
      return res.status(500).json(result);
    }

  } catch (error) {
    logger.error("Delete policy controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /policies
 * Get all policies with optional filtering
 */
async function getAllPoliciesController(req, res) {
  try {
    const dashboard = dashboardAnalyticsService.getPolicyDashboard(req.query);
    const policies = dashboard.triggeredPolicies.map((policy, index) => ({
      _id: policy.id,
      name: policy.name,
      description: policy.description,
      enabled: true,
      priority: index + 1,
      category: policy.severity === 'critical' ? 'emergency' : policy.severity === 'high' ? 'security' : 'operational',
      conditions: {
        riskScore: {
          operator: 'gte',
          value: policy.severity === 'critical' ? 85 : policy.severity === 'high' ? 70 : 40,
        },
        riskLevel: policy.severity.toUpperCase(),
      },
      actions: [
        {
          type: policy.severity === 'critical' ? 'create_incident' : 'create_case',
          parameters: { reason: policy.description },
          delay: 0,
        },
      ],
      executionStats: {
        totalExecutions: policy.affectedRecords,
        successfulExecutions: Math.max(0, policy.affectedRecords - 1),
        failedExecutions: policy.affectedRecords > 0 ? 1 : 0,
        lastExecuted: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      createdBy: {
        name: 'Dataset Engine',
        email: 'dataset@argus.local',
      },
    }));

    return res.status(200).json({
      success: true,
      policies,
      total: policies.length,
      page: 1,
      totalPages: 1,
    });

  } catch (error) {
    logger.error("Get all policies controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /policies/:policyId
 * Get a specific policy
 */
async function getPolicyController(req, res) {
  try {
    const { policyId } = req.params;

    const result = await policyEngine.getAllPolicies();
    
    if (result.success) {
      const policy = result.policies.find(p => p._id.toString() === policyId);
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          error: "Policy not found"
        });
      }

      return res.status(200).json({
        success: true,
        policy
      });
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    logger.error("Get policy controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /policies/stats
 * Get policy statistics
 */
async function getPolicyStatsController(req, res) {
  try {
    const dashboard = dashboardAnalyticsService.getPolicyDashboard(req.query);

    return res.status(200).json({
      success: true,
      totalPolicies: dashboard.policyCount,
      triggeredPolicies: dashboard.triggeredPolicies.length,
      affectedRecords: dashboard.affectedRecords,
      severityLevel: dashboard.severityLevel,
      summary: dashboard.summary,
    });

  } catch (error) {
    logger.error("Get policy stats controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /policies/test
 * Test a policy against sample context
 */
async function testPolicyController(req, res) {
  try {
    const { policy, context } = req.body;

    if (!policy || !context) {
      return res.status(400).json({
        success: false,
        error: "Policy and context are required"
      });
    }

    // Create a temporary policy object for testing
    const tempPolicy = {
      ...policy,
      matchesConditions: function(ctx) {
        // Use the same logic as the real Policy model
        return policyEngine.policyEngine?.matchesConditions?.call(this, ctx) || false;
      }
    };

    const matches = tempPolicy.matchesConditions(context);

    return res.status(200).json({
      success: true,
      matches,
      policy: policy.name,
      context
    });

  } catch (error) {
    logger.error("Test policy controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /policies/simulate
 * Simulate policy execution with sample data
 */
async function simulatePolicyController(req, res) {
  try {
    const { scenario } = req.body;

    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: "Scenario is required"
      });
    }

    const dashboard = dashboardAnalyticsService.getPolicyDashboard(req.query);
    const context = {
      riskScore: dashboard.summary.highRiskRecords > 0 ? 85 : 45,
      riskLevel: dashboard.severityLevel === 'critical' ? 'High' : dashboard.severityLevel === 'high' ? 'Medium' : 'Low',
      department: dashboard.summary.topDepartment,
      attackType: scenario || 'dataset_analysis',
      sender: 'dataset@argus.local',
      notificationId: `SIM_${Date.now()}`
    };

    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: "Scenario is required"
      });
    }

    const evaluationResult = {
      success: true,
      matchingPolicies: dashboard.triggeredPolicies,
      totalEvaluated: dashboard.policyCount,
    };

    const executionResults = dashboard.triggeredPolicies.map((policy) => ({
      policyId: policy.id,
      policyName: policy.name,
      success: true,
      actionsExecuted: [policy.recommendedAction],
      errors: [],
      executionTime: 0,
    }));

    return res.status(200).json({
      success: true,
      scenario,
      context,
      evaluation: evaluationResult,
      execution: executionResults
    });

  } catch (error) {
    logger.error("Simulate policy controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

module.exports = {
  evaluatePoliciesController,
  createPolicyController,
  updatePolicyController,
  deletePolicyController,
  getAllPoliciesController,
  getPolicyController,
  getPolicyStatsController,
  testPolicyController,
  simulatePolicyController
};
