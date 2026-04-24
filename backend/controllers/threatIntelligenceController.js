/**
 * Threat Intelligence Controller
 * 
 * Handles API endpoints for threat intelligence functionality
 */

const { threatIntelligenceService } = require("../services/threatIntelligenceService");
const logger = require("../utils/logger");

/**
 * GET /threat/ip/:ip
 * Get threat intelligence for IP address
 */
async function getIpIntelligenceController(req, res) {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: "IP address is required"
      });
    }

    const intelligence = await threatIntelligenceService.getIpIntelligence(ip);

    return res.status(200).json({
      success: true,
      data: intelligence
    });

  } catch (error) {
    logger.error("Get IP intelligence controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get IP intelligence",
      details: error.message
    });
  }
}

/**
 * GET /threat/domain/:domain
 * Get threat intelligence for domain
 */
async function getDomainIntelligenceController(req, res) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "Domain is required"
      });
    }

    const intelligence = await threatIntelligenceService.getDomainIntelligence(domain);

    return res.status(200).json({
      success: true,
      data: intelligence
    });

  } catch (error) {
    logger.error("Get domain intelligence controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get domain intelligence",
      details: error.message
    });
  }
}

/**
 * POST /threat/event
 * Get threat intelligence for event/pattern
 */
async function getEventIntelligenceController(req, res) {
  try {
    const { pattern, eventData } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: "Pattern is required"
      });
    }

    const intelligence = await threatIntelligenceService.getEventIntelligence(pattern, eventData);

    return res.status(200).json({
      success: true,
      data: intelligence
    });

  } catch (error) {
    logger.error("Get event intelligence controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get event intelligence",
      details: error.message
    });
  }
}

/**
 * POST /threat/notification
 * Get comprehensive threat intelligence for notification
 */
async function getNotificationIntelligenceController(req, res) {
  try {
    const { notification } = req.body;

    if (!notification) {
      return res.status(400).json({
        success: false,
        error: "Notification data is required"
      });
    }

    const intelligence = await threatIntelligenceService.getNotificationIntelligence(notification);

    return res.status(200).json({
      success: true,
      data: intelligence
    });

  } catch (error) {
    logger.error("Get notification intelligence controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get notification intelligence",
      details: error.message
    });
  }
}

/**
 * GET /threat/summary
 * Get threat intelligence summary
 */
async function getThreatSummaryController(req, res) {
  try {
    const summary = await threatIntelligenceService.getThreatSummary();

    return res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error("Get threat summary controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get threat summary",
      details: error.message
    });
  }
}

/**
 * POST /threat/search
 * Search threat intelligence data
 */
async function searchThreatIntelligenceController(req, res) {
  try {
    const { query, type = 'all', limit = 50 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    // This would implement actual search functionality
    const results = {
      query,
      type,
      results: [],
      total: 0,
      timestamp: new Date()
    };

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error("Search threat intelligence controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search threat intelligence",
      details: error.message
    });
  }
}

module.exports = {
  getIpIntelligenceController,
  getDomainIntelligenceController,
  getEventIntelligenceController,
  getNotificationIntelligenceController,
  getThreatSummaryController,
  searchThreatIntelligenceController
};
