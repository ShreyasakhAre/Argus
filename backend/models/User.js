const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "fraud_analyst", "department_head", "employee", "auditor"],
      default: "employee",
      index: true,
    },
    
    // Organization and department alignment with new dataset
    org_id: {
      type: String,
      required: true,
      index: true,
      default: "ORG001",
    },
    department: {
      type: String,
      required: true,
      index: true,
      default: "General",
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    
    // Behavioral Risk Scoring Fields (aligned with new dataset)
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
      index: true,
    },
    behaviorHistory: [{
      action: {
        type: String,
        enum: ["clicked_suspicious_link", "ignored_warning", "reported_phishing", "marked_safe_correctly", "approved_case", "rejected_case", "escalated_case"],
        required: true
      },
      scoreChange: {
        type: Number,
        required: true
      },
      newScore: {
        type: Number,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      notificationId: String,
      caseId: String,
      threat_category: {
        type: String,
        enum: ["safe", "low_risk_suspicious", "suspicious", "high_risk_suspicious", "bec", "ransomware", "phishing", "critical"]
      }
    }],
    lastRiskUpdate: {
      type: Date,
      default: Date.now
    },
    
    // Analyst-specific fields
    analystMetrics: {
      casesReviewed: {
        type: Number,
        default: 0,
      },
      avgTimeToReview: {
        type: Number,
        default: 0, // in minutes
      },
      accuracyRate: {
        type: Number,
        default: 0, // percentage
      },
      escalationRate: {
        type: Number,
        default: 0, // percentage
      },
      lastCaseAssigned: {
        type: Date,
        default: null,
      },
    },
    
    // Authentication and security
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    forcePasswordReset: {
      type: Boolean,
      default: false,
    },
    
    // Permissions and access control
    permissions: [{
      type: String,
      enum: [
        "view_all_notifications",
        "view_department_notifications",
        "view_personal_notifications",
        "view_fraud_feed",
        "acknowledge_alerts",
        "access_scanners",
        "view_analytics",
        "export_reports",
        "view_audit_logs",
        "retrain_model",
        "manage_roles_permissions",
        "assign_cases",
        "review_cases",
        "escalate_cases"
      ]
    }],
    
    // Preferences
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "auto",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        browser: {
          type: Boolean,
          default: true,
        },
        highPriorityOnly: {
          type: Boolean,
          default: false,
        }
      },
      dashboard: {
        defaultView: {
          type: String,
          enum: ["overview", "cases", "analytics", "threats"],
          default: "overview",
        },
        itemsPerPage: {
          type: Number,
          default: 25,
          min: 10,
          max: 100,
        }
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = {
  User,
};
