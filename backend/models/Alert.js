const mongoose = require("mongoose");

// Dataset-based Alert Schema aligned with new dataset structure
const AlertSchema = new mongoose.Schema(
  {
    // Core dataset fields
    notification_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    org_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ["Email", "Slack", "Teams", "ERP", "HR Portal", "Mobile"],
      index: true,
    },
    sender: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    receiver: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sender_domain: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    contains_url: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0,
    },
    url: {
      type: String,
      trim: true,
      default: null,
    },
    attachment_type: {
      type: String,
      required: true,
      trim: true,
      default: 'none',
    },
    priority: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "critical"],
      index: true,
    },
    threat_category: {
      type: String,
      required: true,
      enum: ["safe", "low_risk_suspicious", "suspicious", "high_risk_suspicious", "bec", "ransomware", "phishing", "critical"],
      index: true,
    },
    risk_score: {
      type: Number,
      required: true,
      min: 0.0,
      max: 1.0,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'Unknown',
    },
    device_type: {
      type: String,
      required: true,
      enum: ["Desktop", "Laptop", "Mobile", "Tablet"],
      default: 'Desktop',
    },
    is_malicious: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0,
      index: true,
    },
    review_status: {
      type: String,
      required: true,
      enum: ["Approved", "Pending", "Rejected"],
      default: 'Pending',
      index: true,
    },
    analyst_feedback: {
      type: String,
      trim: true,
      default: null,
    },
    
    // Legacy compatibility fields
    legacyId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      default: 'threat_alert',
    },
    severity: {
      type: String,
      required: true,
      enum: ["critical", "high", "medium", "low"],
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "acknowledged", "resolved"],
      default: "pending",
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Autonomous Agent Fields
    autoActionTaken: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionLog: [{
      type: {
        type: String,
        enum: [
          'sender_block',
          'domain_mute',
          'create_incident',
          'create_case',
          'notify_admin',
          'notify_analyst',
          'mark_safe',
          'archive'
        ]
      },
      value: String,
      reason: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      notificationId: String,
      incidentId: String,
      caseId: String,
      success: {
        type: Boolean,
        default: true
      }
    }],
    agentProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    agentEvaluation: {
      riskScore: Number,
      recommendedAction: String,
      confidence: String,
      source: String,
      timestamp: Date
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Enhanced indexes for new dataset structure
AlertSchema.index({ notification_id: 1 }, { unique: true });
AlertSchema.index({ org_id: 1, department: 1 });
AlertSchema.index({ threat_category: 1, risk_score: -1 });
AlertSchema.index({ review_status: 1, priority: -1 });
AlertSchema.index({ timestamp: -1 });
AlertSchema.index({ sender_domain: 1 });
AlertSchema.index({ is_malicious: 1, risk_score: -1 });
AlertSchema.index({ severity: 1, status: 1 });
AlertSchema.index({ autoActionTaken: 1 });
AlertSchema.index({ agentProcessed: 1 });
AlertSchema.index({ 'actionLog.timestamp': -1 });

// Static methods for dataset operations
AlertSchema.statics.findByNotificationId = function(notificationId) {
  return this.findOne({ notification_id: notificationId });
};

AlertSchema.statics.findByOrgAndDepartment = function(orgId, department) {
  return this.find({ org_id: orgId, department: department });
};

AlertSchema.statics.findHighRisk = function(minRiskScore = 0.7) {
  return this.find({ risk_score: { $gte: minRiskScore } }).sort({ risk_score: -1 });
};

AlertSchema.statics.findPendingReview = function() {
  return this.find({ review_status: 'Pending' }).sort({ priority: -1, risk_score: -1 });
};

AlertSchema.statics.findByThreatCategory = function(category) {
  return this.find({ threat_category: category });
};

AlertSchema.statics.getDepartmentStats = function(department) {
  return this.aggregate([
    { $match: { department: department } },
    {
      $group: {
        _id: '$threat_category',
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$risk_score' },
        maliciousCount: { $sum: '$is_malicious' }
      }
    }
  ]);
};

const Alert = mongoose.models.Alert || mongoose.model("Alert", AlertSchema);

module.exports = {
  Alert,
};
