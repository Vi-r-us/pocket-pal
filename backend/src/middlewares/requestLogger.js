import pinoHttp from "pino-http";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

// pino-http middleware that uses the shared pino logger instance
const requestLogger = pinoHttp({
  logger,
  // serializers will keep logs compact; request id is available on req.id
  autoLogging: false,
  genReqId: (req) => req.headers['x-request-id'] || uuidv4(),
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  }
});

// attach a friendly requestId and child logger on each request
function middleware(req, res, next) {
  // pino-http sets req.id and req.log; ensure requestId is available
  req.requestId = req.id || req.headers['x-request-id'] || uuidv4();
  // attach small context to req.log if available
  if (req.log) {
    req.log = req.log.child({ requestId: req.requestId });
  } else {
    req.log = logger.child({ requestId: req.requestId });
  }
  res.setHeader('X-Request-Id', req.requestId);
  return requestLogger(req, res, next);
}

export default middleware;
