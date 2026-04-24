const mongoose = require("mongoose");

// Fraud Case Model for Analyst Review System
const FraudCaseSchema = new mongoose.Schema(
  {
    // Core notification reference
    notification_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    
    // Case management fields
    case_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    
    // Assignment and workflow
    assigned_analyst_id: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    assigned_analyst_name: {
      type: String,
      trim: true,
      default: null,
    },
    case_priority: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    
    // Dataset fields (copied from notification for performance)
    org_id: {
      type: String,
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ["Email", "Slack", "Teams", "ERP", "HR Portal", "Mobile"],
    },
    sender: {
      type: String,
      required: true,
      trim: true,
    },
    receiver: {
      type: String,
      required: true,
      trim: true,
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
    
    // Review and decision fields
    review_status: {
      type: String,
      required: true,
      enum: ["Pending", "In Review", "Approved", "Rejected", "Escalated"],
      default: "Pending",
      index: true,
    },
    analyst_decision: {
      type: String,
      enum: ["approve", "reject", "escalate", "false_positive"],
      default: null,
    },
    analyst_feedback: {
      type: String,
      trim: true,
      default: null,
    },
    
    // Timestamps
    assigned_at: {
      type: Date,
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
    
    // Additional context
    attachment_type: {
      type: String,
      trim: true,
      default: 'none',
    },
    contains_url: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    url: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
    device_type: {
      type: String,
      enum: ["Desktop", "Laptop", "Mobile", "Tablet"],
      default: 'Desktop',
    },
    
    // Audit trail
    action_history: [{
      action: {
        type: String,
        enum: ["assigned", "reviewed", "approved", "rejected", "escalated", "commented", "reassigned"],
        required: true,
      },
      performed_by: {
        type: String,
        required: true,
      },
      performed_by_name: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
        required: true,
      },
      comments: {
        type: String,
        trim: true,
        default: null,
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    }],
    
    // Escalation details
    escalation_details: {
      escalated_to: {
        type: String,
        trim: true,
        default: null,
      },
      escalation_reason: {
        type: String,
        trim: true,
        default: null,
      },
      escalation_level: {
        type: Number,
        min: 1,
        max: 5,
        default: 1,
      },
    },
    
    // Performance metrics
    time_to_review: {
      type: Number, // in minutes
      default: null,
    },
    time_to_resolution: {
      type: Number, // in minutes
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for optimal query performance
FraudCaseSchema.index({ case_id: 1 }, { unique: true });
FraudCaseSchema.index({ notification_id: 1 }, { unique: true });
FraudCaseSchema.index({ assigned_analyst_id: 1, review_status: 1 });
FraudCaseSchema.index({ review_status: 1, case_priority: -1 });
FraudCaseSchema.index({ threat_category: 1, review_status: 1 });
FraudCaseSchema.index({ risk_score: -1, review_status: 1 });
FraudCaseSchema.index({ department: 1, review_status: 1 });
FraudCaseSchema.index({ 'action_history.timestamp': -1 });
FraudCaseSchema.index({ assigned_at: -1 });
FraudCaseSchema.index({ reviewed_at: -1 });

// Static methods for case management
FraudCaseSchema.statics.findByAnalyst = function(analystId, status = null) {
  const query = { assigned_analyst_id: analystId };
  if (status) {
    query.review_status = status;
  }
  return this.find(query).sort({ case_priority: -1, assigned_at: -1 });
};

FraudCaseSchema.statics.findPendingCases = function(limit = 50) {
  return this.find({ review_status: 'Pending' })
    .sort({ case_priority: -1, risk_score: -1 })
    .limit(limit);
};

FraudCaseSchema.statics.findByDepartment = function(department, status = null) {
  const query = { department: department };
  if (status) {
    query.review_status = status;
  }
  return this.find(query).sort({ assigned_at: -1 });
};

FraudCaseSchema.statics.getCaseMetrics = function(timeframe = 24) {
  const cutoffTime = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { assigned_at: { $gte: cutoffTime } } },
    {
      $group: {
        _id: '$review_status',
        count: { $sum: 1 },
        avgTimeToReview: { $avg: '$time_to_review' },
        avgTimeToResolution: { $avg: '$time_to_resolution' },
      }
    }
  ]);
};

FraudCaseSchema.statics.getAnalystWorkload = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$assigned_analyst_id',
        analyst_name: { $first: '$assigned_analyst_name' },
        pending_count: {
          $sum: { $cond: [{ $eq: ['$review_status', 'Pending'] }, 1, 0] }
        },
        in_review_count: {
          $sum: { $cond: [{ $eq: ['$review_status', 'In Review'] }, 1, 0] }
        },
        total_assigned: { $sum: 1 },
        avg_time_to_review: { $avg: '$time_to_review' },
      }
    },
    { $sort: { pending_count: -1, total_assigned: -1 } }
  ]);
};

// Instance methods
FraudCaseSchema.methods.assignToAnalyst = function(analystId, analystName) {
  this.assigned_analyst_id = analystId;
  this.assigned_analyst_name = analystName;
  this.assigned_at = new Date();
  this.review_status = 'In Review';
  
  this.action_history.push({
    action: 'assigned',
    performed_by: analystId,
    performed_by_name: analystName,
    timestamp: new Date(),
    comments: `Case assigned to ${analystName}`,
  });
  
  return this.save();
};

FraudCaseSchema.methods.addReviewAction = function(action, performedBy, performedByName, comments = null) {
  this.action_history.push({
    action: action,
    performed_by: performedBy,
    performed_by_name: performedByName,
    timestamp: new Date(),
    comments: comments,
  });
  
  // Update status based on action
  switch (action) {
    case 'approved':
      this.review_status = 'Approved';
      this.analyst_decision = 'approve';
      this.resolved_at = new Date();
      if (this.assigned_at) {
        this.time_to_resolution = (this.resolved_at - this.assigned_at) / (1000 * 60); // minutes
      }
      break;
    case 'rejected':
      this.review_status = 'Rejected';
      this.analyst_decision = 'reject';
      this.resolved_at = new Date();
      if (this.assigned_at) {
        this.time_to_resolution = (this.resolved_at - this.assigned_at) / (1000 * 60);
      }
      break;
    case 'escalated':
      this.review_status = 'Escalated';
      this.analyst_decision = 'escalate';
      break;
    case 'reviewed':
      this.reviewed_at = new Date();
      if (this.assigned_at) {
        this.time_to_review = (this.reviewed_at - this.assigned_at) / (1000 * 60);
      }
      break;
  }
  
  if (comments) {
    this.analyst_feedback = comments;
  }
  
  return this.save();
};

// Generate case ID
FraudCaseSchema.pre('save', function(next) {
  if (this.isNew && !this.case_id) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.case_id = `FC-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

const FraudCase = mongoose.models.FraudCase || mongoose.model("FraudCase", FraudCaseSchema);

module.exports = {
  FraudCase,
};
