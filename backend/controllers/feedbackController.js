const feedbackStore = [];

exports.submitFeedback = (req, res) => {
  const { notification_id, action, analyst, timestamp } = req.body;
  
  if (!notification_id || !action) {
    return res.status(400).json({ success: false, message: "Notification ID and action are required" });
  }

  const feedback = { 
    notification_id, 
    action, 
    analyst: analyst || "System", 
    timestamp: timestamp || new Date().toISOString() 
  };
  
  feedbackStore.push(feedback);
  
  // Emit to socket for real-time auditor updates
  const io = req.app.get("io");
  if (io) {
    console.log("[feedback] Emitting audit_update for:", notification_id);
    io.emit("audit_update", feedback);
  }
  
  res.status(201).json({ success: true, feedback });
};

exports.getFeedback = (req, res) => {
  res.status(200).json({ 
    success: true, 
    feedback: feedbackStore,
    metrics: calculateMetrics(feedbackStore)
  });
};

function calculateMetrics(feedback) {
  if (feedback.length === 0) return { override_rate: 0, false_positive_rate: 0, malicious_count: 0 };
  
  const overrides = feedback.filter(f => f.action === 'OVERRIDE' || f.action === 'MARK_SAFE').length;
  const malicious = feedback.filter(f => f.action === 'MARK_MALICIOUS' || f.action === 'BLOCK').length;
  
  return {
    override_rate: (overrides / feedback.length) * 100,
    false_positive_rate: (overrides / feedback.length) * 100, // Simplified
    malicious_count: malicious,
    total_actions: feedback.length
  };
}
