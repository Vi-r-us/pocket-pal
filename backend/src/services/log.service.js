import { Log } from "../models/index.js";

/**
 * Create a unified log entry in the logs table.
 * Supports audit, change, error, and system events.
 * All parameters are optional except log_type.
 * @param {{
 *   user_id?: number,
 *   log_type: string, // 'audit', 'change', 'error', 'system'
 *   action?: string,
 *   entity?: string,
 *   entity_id?: string|number,
 *   field_name?: string,
 *   old_value?: any,
 *   new_value?: any,
 *   message?: string,
 *   stack?: string,
 *   details?: object,
 *   timestamp?: Date
 * }} params
 * @returns {Promise<Log|null>}
 */
const createLog = async (params) => {
  try {
    const logEntry = await Log.create({
      ...params,
      timestamp: params.timestamp || new Date(),
    });
    return logEntry;
  } catch (err) {
    // Emergency fallback: write error to console
    console.error("Log creation failed:", err.message || err);
    return null;
  }
};

export { createLog };