/**
 * Real-time Agent Status Updates
 * 
 * Handles WebSocket connections for real-time agent status and activity updates
 */

const logger = require("../utils/logger");

class AgentSocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Set();
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Agent socket client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial agent status
      this.sendAgentStatus(socket);

      // Handle client requests
      socket.on('subscribe_agent_updates', () => {
        socket.join('agent_updates');
        logger.info(`Client ${socket.id} subscribed to agent updates`);
      });

      socket.on('unsubscribe_agent_updates', () => {
        socket.leave('agent_updates');
        logger.info(`Client ${socket.id} unsubscribed from agent updates`);
      });

      socket.on('get_agent_status', () => {
        this.sendAgentStatus(socket);
      });

      socket.on('disconnect', () => {
        logger.info(`Agent socket client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Send agent status to a specific socket
   */
  async sendAgentStatus(socket) {
    try {
      const { getAgentStats } = require("../services/autonomousAgent");
      const stats = getAgentStats();
      
      socket.emit('agent_status', {
        type: 'status_update',
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to send agent status:', error);
    }
  }

  /**
   * Broadcast agent action to all subscribed clients
   */
  broadcastAgentAction(actionData) {
    this.io.to('agent_updates').emit('agent_action', {
      type: 'action_taken',
      data: actionData,
      timestamp: new Date()
    });
    
    logger.info(`Broadcast agent action to ${this.connectedClients.size} clients`);
  }

  /**
   * Broadcast agent configuration update
   */
  broadcastConfigUpdate(configData) {
    this.io.to('agent_updates').emit('agent_config_updated', {
      type: 'config_update',
      data: configData,
      timestamp: new Date()
    });
    
    logger.info(`Broadcast config update to ${this.connectedClients.size} clients`);
  }

  /**
   * Broadcast agent status change
   */
  broadcastStatusChange(statusData) {
    this.io.to('agent_updates').emit('agent_status_changed', {
      type: 'status_change',
      data: statusData,
      timestamp: new Date()
    });
    
    logger.info(`Broadcast status change to ${this.connectedClients.size} clients`);
  }

  /**
   * Send agent health update
   */
  broadcastHealthUpdate(healthData) {
    this.io.emit('agent_health', {
      type: 'health_update',
      data: healthData,
      timestamp: new Date()
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }
}

// Singleton instance
let instance = null;

/**
 * Initialize agent socket handler
 */
function initializeAgentSocketHandler(io) {
  if (!instance) {
    instance = new AgentSocketHandler(io);
    logger.info('Agent socket handler initialized');
  }
  return instance;
}

/**
 * Get agent socket handler instance
 */
function getAgentSocketHandler() {
  return instance;
}

module.exports = {
  initializeAgentSocketHandler,
  getAgentSocketHandler
};
