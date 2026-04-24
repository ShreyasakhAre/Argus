/**
 * Lightweight console-only logger.
 * Does NOT write to MongoDB — no DB dependency here.
 */
const logger = {
  info: (action, ...args) => {
    console.log(`[INFO]  [${new Date().toISOString()}] ${action}`, ...args);
  },
  error: (action, ...args) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${action}`, ...args);
  },
  warn: (action, ...args) => {
    console.warn(`[WARN]  [${new Date().toISOString()}] ${action}`, ...args);
  },
};

module.exports = logger;
