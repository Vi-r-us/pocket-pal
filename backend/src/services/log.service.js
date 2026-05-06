import { Log } from "../models/index.js";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

// In-memory queue for log entries to batch-write to DB
const LOG_QUEUE = [];
let flushTimer = null;
const FLUSH_INTERVAL_MS = Number(process.env.LOG_BATCH_INTERVAL_MS) || 2000; // 2s
const FLUSH_BATCH_SIZE = Number(process.env.LOG_BATCH_SIZE) || 100;
const MAX_JSON_SIZE = 10 * 1024; // 10KB per JSON field
const MAX_DB_VARCHAR_LEN = 50;

function sanitizeObject(obj) {
  try {
    if (!obj) return null;
    const str = JSON.stringify(obj);
    if (str.length > MAX_JSON_SIZE) return { _truncated: true };
    return obj;
  } catch {
    return { _error: "unable_to_serialize" };
  }
}

function truncateVarchar(value, maxLen = MAX_DB_VARCHAR_LEN) {
  if (value === undefined || value === null) return null;
  const normalized = String(value);
  if (normalized.length <= maxLen) return normalized;
  return normalized.slice(0, maxLen);
}

async function flushQueue() {
  if (LOG_QUEUE.length === 0) return;
  const batch = LOG_QUEUE.splice(0, FLUSH_BATCH_SIZE);
  try {
    // prepare rows for bulkCreate
    const rows = batch.map((item) => ({
      log_id: item.log_id || uuidv4(),
      user_id: item.user_id || null,
      log_type: item.log_type,
      action: item.action || null,
      entity: item.entity || null,
      entity_id: item.entity_id ? String(item.entity_id) : null,
      field_name: item.field_name || null,
      old_value: item.old_value,
      new_value: item.new_value,
      message: item.message || null,
      details: item.details,
      created_at: item.created_at || new Date(),
    }));

    await Log.bulkCreate(rows, { validate: false });
  } catch (err) {
    // on failure, log and re-queue items (prepended)
    logger.error({ err, count: batch.length }, "Failed to flush log batch");
    // put them back at the front
    LOG_QUEUE.unshift(...batch);
    // if DB consistently failing, stop flush timer to avoid busy loop
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushQueue();
    if (LOG_QUEUE.length > 0) scheduleFlush();
  }, FLUSH_INTERVAL_MS);
}

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
  // minimal validation
  if (!params || !params.log_type) {
    logger.warn({ params }, "createLog called without log_type");
    return null;
  }

  const entry = {
    log_id: params.log_id || uuidv4(),
    user_id: params.user_id || null,
    log_type: params.log_type,
    action: truncateVarchar(params.action),
    entity: truncateVarchar(params.entity),
    entity_id: params.entity_id ? truncateVarchar(params.entity_id) : null,
    field_name: truncateVarchar(params.field_name),
    old_value: sanitizeObject(params.old_value) || null,
    new_value: sanitizeObject(params.new_value) || null,
    message: params.message || null,
    details: sanitizeObject(params.details) || null,
    created_at: params.created_at || new Date(),
  };

  // For critical logs like 'error' and 'audit', write immediately
  if (params.log_type === "error" || params.log_type === "audit") {
    try {
      await Log.create(entry);
    } catch (err) {
      logger.error({ err, entry }, "Failed to create log entry");
      return null;
    }
    return entry;
  }

  // For other log types, enqueue
  LOG_QUEUE.push(entry);
  if (LOG_QUEUE.length >= FLUSH_BATCH_SIZE) {
    // flush immediately
    void flushQueue();
  } else {
    scheduleFlush();
  }

  return entry;
};

export { createLog };
