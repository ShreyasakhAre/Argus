/**
 * Live Attack Map Service
 * 
 * Now integrated with datasetService to use real 10K dataset
 */

const datasetService = require('./datasetService');
const logger = require("../utils/logger");

// Mock network nodes for network graph - Enterprise Layout
const NETWORK_NODES = [
  { id: 'hq', type: 'server', label: 'Headquarters', ip: '10.0.0.1', status: 'active', risk: 'low' },
  { id: 'mumbai', type: 'server', label: 'Mumbai Office', ip: '10.0.1.1', status: 'active', risk: 'medium' },
  { id: 'pune', type: 'server', label: 'Pune Office', ip: '10.0.2.1', status: 'active', risk: 'low' },
  { id: 'finance', type: 'database', label: 'Finance Dept', ip: '10.0.3.10', status: 'active', risk: 'medium' },
  { id: 'hr', type: 'client', label: 'HR Dept', ip: '10.0.4.10', status: 'active', risk: 'low' },
  { id: 'it', type: 'firewall', label: 'IT Security', ip: '10.0.0.254', status: 'active', risk: 'low' },
  { id: 'sales', type: 'client', label: 'Sales Dept', ip: '10.0.5.10', status: 'active', risk: 'high' }
];

const NETWORK_EDGES = [
  { id: 'edge-hq-it', source: 'hq', target: 'it', type: 'connection', protocol: 'SECURE' },
  { id: 'edge-hq-finance', source: 'hq', target: 'finance', type: 'connection', protocol: 'INTERNAL' },
  { id: 'edge-hq-hr', source: 'hq', target: 'hr', type: 'connection', protocol: 'INTERNAL' },
  { id: 'edge-hq-sales', source: 'hq', target: 'sales', type: 'connection', protocol: 'INTERNAL' },
  { id: 'edge-hq-mumbai', source: 'hq', target: 'mumbai', type: 'connection', protocol: 'VPN' },
  { id: 'edge-hq-pune', source: 'hq', target: 'pune', type: 'connection', protocol: 'VPN' }
];

// Attack simulation state
let simulationInterval = null;
let isSimulating = false;
let cachedAttackData = null;

/**
 * Generate attack data from real dataset
 */
function generateAttackDataFromDataset() {
  if (cachedAttackData) return cachedAttackData;
  
  const stats = datasetService.getStats();
  const countries = {};
  const attackTypes = {};
  
  // Process dataset to extract country and attack patterns
  const dataset = datasetService.query({}, { limit: 10000 }).data;
  
  dataset.forEach(record => {
    const country = record.country || 'Unknown';
    const threat = record.threat_category || 'unknown';
    
    // Initialize country if not exists
    if (!countries[country]) {
      countries[country] = {
        code: country.substring(0, 2).toUpperCase(),
        name: country,
        lat: getRandomLat(),
        lng: getRandomLng(),
        attackCount: 0,
        attackTypes: {}
      };
    }
    
    countries[country].attackCount++;
    countries[country].attackTypes[threat] = (countries[country].attackTypes[threat] || 0) + 1;
    
    attackTypes[threat] = true;
  });
  
  const countryList = Object.values(countries);
  const totalAttacks = dataset.length;
  
  cachedAttackData = {
    countries: countryList,
    attackTypes: Object.keys(attackTypes),
    globalStats: {
      totalAttacks,
      attacksLastHour: Math.floor(totalAttacks * 0.1),
      attacksLast24h: Math.floor(totalAttacks * 0.3),
      topAttackType: Object.keys(attackTypes)[0] || null,
      topTargetCountry: countryList.sort((a, b) => b.attackCount - a.attackCount)[0] || null
    }
  };
  
  return cachedAttackData;
}

function getRandomLat() {
  const lats = [39.8283, 35.8617, 61.5240, -14.2350, 20.5937, 51.1657, 55.3781, 46.2276, 36.2048, 56.1304];
  return lats[Math.floor(Math.random() * lats.length)];
}

function getRandomLng() {
  const lngs = [-98.5795, 104.1954, 105.3188, -51.9253, 78.9629, 10.4515, -3.4360, 2.2137, 138.2529, -106.3468];
  return lngs[Math.floor(Math.random() * lngs.length)];
}

/**
 * Get global attack statistics
 */
function getGlobalAttackStats() {
  try {
    const attackData = generateAttackDataFromDataset();
    
    return {
      success: true,
      data: {
        countries: attackData.countries.map(country => ({
          code: country.code,
          name: country.name,
          attackCount: country.attackCount,
          attackTypes: country.attackTypes,
          coordinates: { lat: country.lat, lng: country.lng }
        })),
        attackTypes: attackData.attackTypes,
        globalStats: attackData.globalStats,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    logger.error('Failed to get global attack stats:', error);
    return {
      success: false,
      error: 'Failed to get attack statistics',
      details: error.message
    };
  }
}

/**
 * Get attack statistics for specific country
 */
function getCountryAttackStats(countryCode) {
  try {
    const attackData = generateAttackDataFromDataset();
    const country = attackData.countries.find(c => c.code === countryCode.toUpperCase());
    
    if (!country) {
      return {
        success: false,
        error: 'Country not found'
      };
    }
    
    return {
      success: true,
      data: {
        country: {
          code: country.code,
          name: country.name,
          attackCount: country.attackCount,
          attackTypes: country.attackTypes,
          coordinates: { lat: country.lat, lng: country.lng }
        }
      }
    };
  } catch (error) {
    logger.error('Failed to get country attack stats:', error);
    return {
      success: false,
      error: 'Failed to get country statistics',
      details: error.message
    };
  }
}

/**
 * Start attack simulation
 */
function startAttackSimulation(intervalMs = 2000) {
  if (isSimulating) {
    return {
      success: false,
      error: 'Simulation already running'
    };
  }
  
  isSimulating = true;
  simulationInterval = setInterval(() => {
    simulateAttack();
  }, intervalMs);
  
  logger.info(`Attack simulation started (interval: ${intervalMs}ms)`);
  
  return {
    success: true,
    message: 'Attack simulation started',
    intervalMs
  };
}

/**
 * Stop attack simulation
 */
function stopAttackSimulation() {
  if (!isSimulating) {
    return {
      success: false,
      error: 'Simulation not running'
    };
  }
  
  isSimulating = false;
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  logger.info('Attack simulation stopped');
  
  return {
    success: true,
    message: 'Attack simulation stopped'
  };
}

/**
 * Get simulation status
 */
function getSimulationStatus() {
  return {
    success: true,
    data: {
      isSimulating,
      intervalMs: simulationInterval ? 2000 : null,
      totalCountries: generateAttackDataFromDataset().countries.length,
      totalAttacks: generateAttackDataFromDataset().globalStats.totalAttacks
    }
  };
}

/**
 * Add custom attack (for demo purposes)
 */
function addAttack(countryCode, attackType, count = 1) {
  try {
    const attackData = generateAttackDataFromDataset();
    const country = attackData.countries.find(c => c.code === countryCode.toUpperCase());
    
    if (!country) {
      return {
        success: false,
        error: 'Country not found'
      };
    }
    
    if (!attackData.attackTypes.includes(attackType)) {
      return {
        success: false,
        error: 'Invalid attack type',
        validTypes: attackData.attackTypes
      };
    }
    
    // Update cached data
    country.attackCount += count;
    country.attackTypes[attackType] = (country.attackTypes[attackType] || 0) + count;
    
    return {
      success: true,
      message: `Added ${count} ${attackType} attacks to ${country.name}`,
      data: {
        country: country.name,
        attackType,
        count,
        totalAttacks: country.attackCount
      }
    };
  } catch (error) {
    logger.error('Failed to add attack:', error);
    return {
      success: false,
      error: 'Failed to add attack',
      details: error.message
    };
  }
}

 /**
 * Get network graph data
 */
function getNetworkGraphData() {
  try {
    // Add random positions for nodes
    const nodes = NETWORK_NODES.map(node => ({
      ...node,
      x: Math.random() * 800,
      y: Math.random() * 600,
      connections: NETWORK_EDGES.filter(edge => 
        edge.source === node.id || edge.target === node.id
      ).length
    }));

    // Add attack information from dataset
    const dataset = datasetService.query({ is_malicious: true }, { limit: 100 }).data;
    nodes.forEach(node => {
      const nodeAttacks = dataset.filter(record => 
        record.sender.includes(node.ip.split('.').slice(-2)[0]) || 
        record.receiver.includes(node.ip.split('.').slice(-2)[0])
      );
      node.attackCount = nodeAttacks.length;
      if (nodeAttacks.length > 0) {
        node.status = 'under_attack';
        node.risk = 'high';
      }
    });

    return {
      success: true,
      data: {
        type: 'network',
        nodes,
        edges: NETWORK_EDGES,
        attacks: dataset.map(record => ({
          source: record.sender,
          target: record.receiver,
          type: record.threat_category,
          timestamp: record.timestamp,
          severity: record.risk_score
        })),
        timestamp: new Date(),
        totalNodes: nodes.length,
        totalEdges: NETWORK_EDGES.length,
        totalAttacks: dataset.length
      }
    };
  } catch (error) {
    logger.error('Failed to get network graph data:', error);
    return {
      success: false,
      error: 'Failed to get network graph data',
      data: {
        type: 'network',
        nodes: NETWORK_NODES,
        edges: NETWORK_EDGES,
        attacks: [],
        timestamp: new Date()
      }
    };
  }
}

/**
 * Simulate attack from real dataset
 */
function simulateAttack() {
  const dataset = datasetService.query({}, { limit: 100 }).data;
  if (dataset.length === 0) return null;
  
  const randomRecord = dataset[Math.floor(Math.random() * dataset.length)];
  const attackData = generateAttackDataFromDataset();
  
  // Find or create country entry
  let country = attackData.countries.find(c => c.name === randomRecord.country);
  if (!country) {
    country = {
      code: randomRecord.country.substring(0, 2).toUpperCase(),
      name: randomRecord.country,
      lat: getRandomLat(),
      lng: getRandomLng(),
      attackCount: 0,
      attackTypes: {}
    };
    attackData.countries.push(country);
  }
  
  // Update attack data
  country.attackCount += 1;
  country.attackTypes[randomRecord.threat_category] = (country.attackTypes[randomRecord.threat_category] || 0) + 1;
  
  logger.info(`Simulated attack: ${randomRecord.threat_category} in ${country.name}`);
  
  return {
    country: country.code,
    countryName: country.name,
    attackType: randomRecord.threat_category,
    timestamp: new Date(),
    coordinates: { lat: country.lat, lng: country.lng },
    totalAttacks: country.attackCount
  };
}

/**
 * Get attack map data (auto-detects best visualization)
 */
function getAttackMapData(preferredType = 'auto') {
  try {
    if (preferredType === 'network') {
      return getNetworkGraphData();
    }
    
    // Default to geographic map
    const attackData = generateAttackDataFromDataset();
    return {
      success: true,
      data: {
        type: 'geographic',
        countries: attackData.countries.map(country => ({
          code: country.code,
          name: country.name,
          attackCount: country.attackCount,
          attackTypes: country.attackTypes,
          coordinates: { lat: country.lat, lng: country.lng }
        })),
        globalStats: attackData.globalStats,
        timestamp: new Date()
      }
    };
  } catch (error) {
    logger.error('Failed to get attack map data:', error);
    // Fallback to network graph
    return getNetworkGraphData();
  }
}

/**
 * Get attack heatmap data
 */
function getAttackHeatmap() {
  try {
    const attackData = generateAttackDataFromDataset();
    const heatmap = {
      geo: {},
      network: {},
      timestamp: new Date()
    };

    // Geographic heatmap from dataset
    attackData.countries.forEach(country => {
      if (country.attackCount > 0) {
        heatmap.geo[country.code] = {
          lat: country.lat,
          lng: country.lng,
          intensity: country.attackCount,
          name: country.name
        };
      }
    });

    // Network heatmap from malicious records
    const maliciousRecords = datasetService.query({ is_malicious: true }, { limit: 500 }).data;
    maliciousRecords.forEach(record => {
      const target = record.receiver || 'unknown';
      heatmap.network[target] = (heatmap.network[target] || 0) + 1;
    });

    return {
      success: true,
      data: heatmap
    };
  } catch (error) {
    logger.error('Failed to get attack heatmap:', error);
    return {
      success: false,
      error: 'Failed to get attack heatmap',
      data: { geo: {}, network: {}, timestamp: new Date() }
    };
  }
}

module.exports = {
  getGlobalAttackStats,
  getCountryAttackStats,
  startAttackSimulation,
  stopAttackSimulation,
  getSimulationStatus,
  addAttack,
  getNetworkGraphData,
  getAttackMapData,
  getAttackHeatmap,
  simulateAttack
};
