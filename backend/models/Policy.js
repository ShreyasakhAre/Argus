/**
 * Policy Model
 * 
 * Defines auto-response rules and policies for the ARGUS system
 */

const mongoose = require("mongoose");

const PolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    priority: {
      type: Number,
      default: 50,
      min: 1,
      max: 100,
      index: true
    },
    
    // Rule conditions
    conditions: {
      riskScore: {
        operator: {
          type: String,
          enum: ["gt", "gte", "lt", "lte", "eq", "ne"],
          required: true
        },
        value: {
          type: Number,
          required: true,
          min: 0,
          max: 100
        }
      },
      riskLevel: {
        type: String,
        enum: ["Low", "Medium", "High"]
      },
      department: {
        type: String,
        trim: true
      },
      attackType: {
        type: String,
        enum: ["phishing", "malware", "ransomware", "ddos", "sql_injection", "xss", "social_engineering"]
      },
      senderDomain: {
        type: String,
        trim: true
      },
      timeRange: {
        startHour: {
          type: Number,
          min: 0,
          max: 23
        },
        endHour: {
          type: Number,
          min: 0,
          max: 23
        },
        timezone: {
          type: String,
          default: "UTC"
        }
      },
      // Advanced conditions
      notificationCount: {
        operator: {
          type: String,
          enum: ["gt", "gte", "lt", "lte", "eq"]
        },
        value: {
          type: Number,
          min: 0
        },
        timeWindow: {
          type: String,
          enum: ["1h", "6h", "12h", "24h", "7d"],
          default: "24h"
        }
      }
    },
    
    // Actions to execute
    actions: [{
      type: {
        type: String,
        enum: ["block_sender", "mute_domain", "create_incident", "create_case", "notify_admin", "notify_analyst", "mark_safe", "archive", "escalate"],
        required: true
      },
      parameters: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      delay: {
        type: Number,
        default: 0,
        min: 0
      },
      condition: {
        type: String,
        // Optional condition for this specific action
      }
    }],
    
    // Rule metadata
    category: {
      type: String,
      enum: ["security", "compliance", "operational", "emergency"],
      default: "security"
    },
    tags: [{
      type: String,
      trim: true
    }],
    
    // Execution tracking
    executionStats: {
      totalExecutions: {
        type: Number,
        default: 0
      },
      successfulExecutions: {
        type: Number,
        default: 0
      },
      failedExecutions: {
        type: Number,
        default: 0
      },
      lastExecuted: {
        type: Date
      },
      averageExecutionTime: {
        type: Number,
        default: 0
      }
    },
    
    // Governance
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reviewDate: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    
    // Version control
    version: {
      type: Number,
      default: 1
    },
    parentPolicy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Policy"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient querying
PolicySchema.index({ enabled: 1, priority: -1 });
PolicySchema.index({ "conditions.riskScore.value": 1 });
PolicySchema.index({ category: 1, enabled: 1 });
PolicySchema.index({ tags: 1 });
PolicySchema.index({ expiresAt: 1 });

// Virtual for success rate
PolicySchema.virtual("successRate").get(function() {
  const total = this.executionStats.totalExecutions;
  if (total === 0) return 0;
  return Math.round((this.executionStats.successfulExecutions / total) * 100);
});

// Method to check if policy is expired
PolicySchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Method to check if policy matches conditions
PolicySchema.methods.matchesConditions = function(context) {
  // Check if policy is enabled and not expired
  if (!this.enabled || this.isExpired()) {
    return false;
  }
  
  // Check risk score condition
  if (this.conditions.riskScore) {
    const { operator, value } = this.conditions.riskScore;
    const contextScore = context.riskScore || 0;
    
    switch (operator) {
      case "gt": if (contextScore <= value) return false; break;
      case "gte": if (contextScore < value) return false; break;
      case "lt": if (contextScore >= value) return false; break;
      case "lte": if (contextScore > value) return false; break;
      case "eq": if (contextScore !== value) return false; break;
      case "ne": if (contextScore === value) return false; break;
    }
  }
  
  // Check risk level condition
  if (this.conditions.riskLevel) {
    if (context.riskLevel !== this.conditions.riskLevel) {
      return false;
    }
  }
  
  // Check department condition
  if (this.conditions.department) {
    if (context.department !== this.conditions.department) {
      return false;
    }
  }
  
  // Check attack type condition
  if (this.conditions.attackType) {
    if (context.attackType !== this.conditions.attackType) {
      return false;
    }
  }
  
  // Check sender domain condition
  if (this.conditions.senderDomain) {
    if (context.senderDomain !== this.conditions.senderDomain) {
      return false;
    }
  }
  
  // Check time range condition
  if (this.conditions.timeRange) {
    const now = new Date();
    const currentHour = now.getHours();
    const { startHour, endHour } = this.conditions.timeRange;
    
    if (startHour !== undefined && endHour !== undefined) {
      if (startHour <= endHour) {
        if (currentHour < startHour || currentHour > endHour) return false;
      } else {
        if (currentHour < startHour && currentHour > endHour) return false;
      }
    }
  }
  
  // Check notification count condition
  if (this.conditions.notificationCount) {
    // This would require additional context about recent notifications
    // For now, we'll skip this check
  }
  
  return true;
};

// Method to update execution stats
PolicySchema.methods.updateExecutionStats = function(success, executionTime) {
  this.executionStats.totalExecutions += 1;
  if (success) {
    this.executionStats.successfulExecutions += 1;
  } else {
    this.executionStats.failedExecutions += 1;
  }
  this.executionStats.lastExecuted = new Date();
  
  if (executionTime) {
    const totalTime = this.executionStats.averageExecutionTime * (this.executionStats.totalExecutions - 1) + executionTime;
    this.executionStats.averageExecutionTime = totalTime / this.executionStats.totalExecutions;
  }
  
  return this.save();
};

const Policy = mongoose.models.Policy || mongoose.model("Policy", PolicySchema);

module.exports = {
  Policy,
  PolicySchema
};
