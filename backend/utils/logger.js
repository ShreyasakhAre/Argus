const { Log } = require("../models/Log");

/**
 * Lightweight Logger
 * Logs to standard stdout and securely writes to MongoDB Audit collection.
 */
const logger = {
  info: async (action, user = "system", details = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] Action: ${action} | User: ${user} | Details:`, JSON.stringify(details));
    try {
      await Log.create({ action, user, details });
    } catch (err) {
      console.error("[logger error] Failed to save log to DB:", err.message);
    }
  },
  error: async (action, user = "system", errorObj = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] Action: ${action} | User: ${user} | Error:`, JSON.stringify(errorObj));
    try {
      await Log.create({ action, user, details: errorObj });
    } catch (err) {
      console.error("[logger error] Failed to save error log to DB:", err.message);
    }
  }
};

module.exports = logger;
