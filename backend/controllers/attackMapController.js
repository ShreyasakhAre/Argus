/**
 * Live Attack Map Controller
 * 
 * Handles API endpoints for global attack statistics and attack map data
 */

const {
  getGlobalAttackStats,
  getCountryAttackStats,
  startAttackSimulation,
  stopAttackSimulation,
  getSimulationStatus,
  addAttack,
  getNetworkGraphData,
  getAttackMapData,
  getAttackHeatmap
} = require("../services/attackMapService");

const logger = require("../utils/logger");
const dashboardAnalyticsService = require("../services/dashboardAnalyticsService");

/**
 * GET /attacks/global-stats
 * Get internal department attack statistics
 */
async function getGlobalAttackStatsController(req, res) {
  try {
    const datasetService = require('../services/datasetService');
    const { org_id } = req.query;
    const filters = {};
    if (org_id) filters.org_id = org_id;

    const stats = datasetService.getStats(filters);
    
    // Create internal department attack map
    const departmentAttacks = stats.departmentBreakdown.map(dept => {
      // Normalize risk score
      let normalizedRiskScore;
      if (dept.avgRiskScore > 1) {
        const p = 1 / (1 + Math.exp(-dept.avgRiskScore));
        normalizedRiskScore = Math.round(p * 100);
      } else {
        normalizedRiskScore = Math.round(dept.avgRiskScore * 100);
      }
      const confidence = Math.max(0, Math.min(100, normalizedRiskScore));

      return {
        department: dept._id,
        totalAttacks: dept.count,
        maliciousAttacks: dept.maliciousCount,
        riskScore: confidence,
        riskLevel: confidence >= 60 ? 'High' : confidence >= 30 ? 'Medium' : 'Low',
        location: {
          building: 'Main Office',
          floor: Math.floor(Math.random() * 5) + 1,
          zone: `${dept._id} Zone`
        }
      };
    });

    const globalStats = {
      totalAttacks: stats.totalAlerts,
      activeThreats: stats.maliciousCount,
      highRiskDepartments: departmentAttacks.filter(d => d.riskLevel === 'High').length,
      lastUpdated: new Date()
    };

    return res.status(200).json({
      success: true,
      data: {
        globalStats,
        departmentAttacks,
        attackTypes: ['Phishing', 'BEC', 'Ransomware', 'Malware', 'Data Theft'],
        internalMap: true
      }
    });

  } catch (error) {
    logger.error("Get global attack stats controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /attacks/country/:countryCode
 * Get attack statistics for specific country
 */
async function getCountryAttackStatsController(req, res) {
  try {
    const { countryCode } = req.params;

    const result = dashboardAnalyticsService.getAttackMapData(req.query);
    const country = result.countries.find((item) => item.code === countryCode.toUpperCase());

    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        country,
      }
    });

  } catch (error) {
    logger.error("Get country attack stats controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /attacks/simulation/start
 * Start attack simulation
 */
async function startAttackSimulationController(req, res) {
  try {
    const { intervalMs = 2000 } = req.body;

    const result = startAttackSimulation(intervalMs);

    if (result.success) {
      // Emit real-time update if socket.io is available
      const io = req.app.get("io");
      if (io) {
        io.emit("attack_simulation_started", {
          type: "simulation_started",
          data: {
            intervalMs,
            timestamp: new Date()
          }
        });
      }

      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }

  } catch (error) {
    logger.error("Start attack simulation controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /attacks/simulation/stop
 * Stop attack simulation
 */
async function stopAttackSimulationController(req, res) {
  try {
    const result = stopAttackSimulation();

    if (result.success) {
      // Emit real-time update if socket.io is available
      const io = req.app.get("io");
      if (io) {
        io.emit("attack_simulation_stopped", {
          type: "simulation_stopped",
          data: {
            timestamp: new Date()
          }
        });
      }

      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }

  } catch (error) {
    logger.error("Stop attack simulation controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /attacks/simulation/status
 * Get simulation status
 */
async function getSimulationStatusController(req, res) {
  try {
    const result = getSimulationStatus();

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    logger.error("Get simulation status controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /attacks/add
 * Add custom attack (for demo purposes)
 */
async function addAttackController(req, res) {
  try {
    const { countryCode, attackType, count = 1 } = req.body;

    if (!countryCode || !attackType) {
      return res.status(400).json({
        success: false,
        error: "countryCode and attackType are required"
      });
    }

    const result = {
      success: true,
      message: `Added ${count} ${attackType} attacks to ${countryCode.toUpperCase()}`,
      data: {
        country: countryCode.toUpperCase(),
        attackType,
        count,
        totalAttacks: count,
      }
    };

    const io = req.app.get("io");
    if (io) {
      io.emit("attack_added", {
        type: "attack_added",
        data: {
          countryCode: countryCode.toUpperCase(),
          attackType,
          count,
          timestamp: new Date(),
          ...result.data
        }
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    logger.error("Add attack controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /attacks/types
 * Get available attack types
 */
async function getAttackTypesController(req, res) {
  try {
    const stats = dashboardAnalyticsService.getAttackMapData(req.query);
    
    return res.status(200).json({
      success: true,
      data: {
        attackTypes: stats.attackTypes,
        count: stats.attackTypes.length
      }
    });

  } catch (error) {
    logger.error("Get attack types controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /attacks/countries
 * Get list of available countries
 */
async function getCountriesController(req, res) {
  try {
    const stats = dashboardAnalyticsService.getAttackMapData(req.query);
    
    const countries = stats.countries.map(country => ({
      code: country.code,
      name: country.name,
      coordinates: country.coordinates
    }));

    return res.status(200).json({
      success: true,
      data: {
        countries,
        count: countries.length
      }
    });

  } catch (error) {
    logger.error("Get countries controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /attacks/heatmap
 * Get data formatted for internal department heatmap visualization
 */
async function getHeatmapDataController(req, res) {
  try {
    const datasetService = require('../services/datasetService');
    const { org_id } = req.query;
    const filters = {};
    if (org_id) filters.org_id = org_id;

    const stats = datasetService.getStats(filters);
    
    // Create internal department heatmap points
    const heatmapPoints = stats.departmentBreakdown.map((dept, index) => {
      // Normalize risk score
      let normalizedRiskScore;
      if (dept.avgRiskScore > 1) {
        const p = 1 / (1 + Math.exp(-dept.avgRiskScore));
        normalizedRiskScore = Math.round(p * 100);
      } else {
        normalizedRiskScore = Math.round(dept.avgRiskScore * 100);
      }
      const confidence = Math.max(0, Math.min(100, normalizedRiskScore));

      return {
        id: `dept-${index}`,
        department: dept._id,
        x: (index % 3) * 200 + 100,
        y: Math.floor(index / 3) * 150 + 100,
        intensity: confidence / 100,
        riskLevel: confidence >= 60 ? 'High' : confidence >= 30 ? 'Medium' : 'Low',
        attackCount: dept.count,
        maliciousCount: dept.maliciousCount,
        location: {
          building: 'Main Office',
          floor: Math.floor(Math.random() * 5) + 1,
          zone: `${dept._id} Zone`
        }
      };
    });

    // Create attack clusters for departments
    const attackClusters = stats.departmentBreakdown
      .filter(dept => dept.maliciousCount > 0)
      .map(dept => {
        let normalizedRiskScore;
        if (dept.avgRiskScore > 1) {
          const p = 1 / (1 + Math.exp(-dept.avgRiskScore));
          normalizedRiskScore = Math.round(p * 100);
        } else {
          normalizedRiskScore = Math.round(dept.avgRiskScore * 100);
        }
        const confidence = Math.max(0, Math.min(100, normalizedRiskScore));

        return {
          id: `cluster-${dept._id}`,
          name: dept._id,
          region: dept._id,
          attackCount: dept.maliciousCount,
          riskLevel: confidence >= 60 ? 'Critical' : confidence >= 30 ? 'Warning' : 'Low',
          center: {
            x: Math.random() * 800,
            y: Math.random() * 600
          },
          radius: Math.max(20, dept.maliciousCount * 10)
        };
      });

    // High risk zones (departments with high malicious activity)
    const highRiskZones = stats.departmentBreakdown
      .filter(dept => {
        let normalizedRiskScore;
        if (dept.avgRiskScore > 1) {
          const p = 1 / (1 + Math.exp(-dept.avgRiskScore));
          normalizedRiskScore = Math.round(p * 100);
        } else {
          normalizedRiskScore = Math.round(dept.avgRiskScore * 100);
        }
        const confidence = Math.max(0, Math.min(100, normalizedRiskScore));
        return confidence >= 60 && dept.maliciousCount > 0;
      })
      .map(dept => ({
        department: dept._id,
        zone: `${dept._id} High Risk Zone`,
        threatLevel: 'Critical',
        activeThreats: dept.maliciousCount,
        recommendedActions: ['Immediate review', 'Enhanced monitoring', 'Security briefing']
      }));

    return res.status(200).json({
      success: true,
      data: {
        heatmapPoints,
        attackClusters,
        highRiskZones,
        lastUpdated: new Date(),
        mapType: 'internal-departments'
      }
    });

  } catch (error) {
    logger.error("Get heatmap data controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /attacks/network
 * Get network graph data
 */
async function getNetworkGraphController(req, res) {
  try {
    const result = dashboardAnalyticsService.getInsightsDashboard(req.query);
    return res.status(200).json({
      success: true,
      data: {
        type: 'network',
        nodes: result.departmentRisks.map((department, index) => ({
          id: `dept-${index}`,
          type: 'department',
          label: department.name,
          status: department.riskScore >= 70 ? 'compromised' : 'active',
          risk: department.riskScore,
        })),
        edges: [],
        attacks: [],
        timestamp: new Date(),
        totalNodes: result.departmentRisks.length,
        totalEdges: 0,
        totalAttacks: result.riskMetrics.recentAlerts,
      }
    });

  } catch (error) {
    logger.error("Get network graph controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /attacks/map
 * Get attack map data (auto-detects best visualization)
 */
async function getAttackMapController(req, res) {
  try {
    const { type = 'auto' } = req.query;
    const result = dashboardAnalyticsService.getAttackMapData(req.query);
    return res.status(200).json({
      success: true,
      data: type === 'network'
        ? {
            type: 'network',
            nodes: result.attackClusters.map((cluster, index) => ({
              id: cluster.region,
              type: 'region',
              label: cluster.name,
              status: cluster.riskLevel,
              risk: cluster.attackCount,
              x: index * 40,
              y: index * 30,
            })),
            edges: [],
            attacks: result.heatmapPoints,
            timestamp: new Date(),
            totalNodes: result.attackClusters.length,
            totalEdges: 0,
            totalAttacks: result.globalStats.totalAttacks,
          }
        : result,
    });

  } catch (error) {
    logger.error("Get attack map controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

module.exports = {
  getGlobalAttackStatsController,
  getCountryAttackStatsController,
  startAttackSimulationController,
  stopAttackSimulationController,
  getSimulationStatusController,
  addAttackController,
  getAttackTypesController,
  getCountriesController,
  getHeatmapDataController,
  getNetworkGraphController,
  getAttackMapController
};
